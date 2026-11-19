// Pruebas de iglesias nuevas (con Google), nombres únicos y Super Admin: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { keyOf } from '../src/lib/claves.js';

let env;
const C = 'psg';
const ADMIN = 'leonardo riquelme';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cancionero-iglesias',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'churches', C), { name: 'PSG', adminKey: ADMIN, adminPin: '12345678' });
    await setDoc(doc(db, 'churches', C, 'people', 'dora'), { name: 'Dora', role: 'director' });
    await setDoc(doc(db, 'churches', C, 'private', 'pins'), { pins: { dora: '55555555' } });
    await setDoc(doc(db, 'churches', C, 'songs', 's1'), { title: 'Santo' });
    await setDoc(doc(db, 'superadmins', 'g-leo'), { nombre: 'Leonardo' });
  });
});

const google = (uid) => env.authenticatedContext(uid, {
  email: `${uid}@gmail.com`, email_verified: true,
  firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [uid], email: [`${uid}@gmail.com`] } },
}).firestore();
const anon = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous', identities: {} } }).firestore();

/** Lo mismo que hace la app al crear una iglesia. */
async function crear(db, uid, nombre, { id = keyOf(nombre), owner = 'Ana Pérez', antes = [] } = {}) {
  const b = writeBatch(db);
  b.set(doc(db, 'churches', id), {
    name: nombre.trim().toUpperCase(), city: 'Santiago', adminKey: keyOf(owner), ownerName: owner,
    ownerUid: uid, ownerEmail: `${uid}@gmail.com`, status: 'activa', createdAt: serverTimestamp(),
  });
  b.set(doc(db, 'owners', uid), { churches: [...antes, id] });
  return b.commit();
}

describe('nombres de iglesia únicos', () => {
  it('la clave quita mayúsculas, tildes y espacios de más', () => {
    if (keyOf('  Iglesia   Bautista  ÑUÑOA ') !== 'iglesia bautista nunoa') throw new Error(keyOf('Iglesia Bautista ÑUÑOA'));
  });
  it('con Google se crea una iglesia nueva', async () => {
    await assertSucceeds(crear(google('g-ana'), 'g-ana', 'Iglesia Bautista Ñuñoa'));
  });
  it('no se puede crear otra con el mismo nombre (aunque cambien tildes o mayúsculas)', async () => {
    await crear(google('g-ana'), 'g-ana', 'Iglesia Bautista Ñuñoa');
    await assertFails(crear(google('g-bea'), 'g-bea', 'IGLESIA  bautista nunoa'));
    await assertFails(crear(google('g-bea'), 'g-bea', 'psg'));
  });
  it('el id tiene que ser el nombre normalizado', async () => {
    await assertFails(crear(google('g-ana'), 'g-ana', 'PSG', { id: 'psg 2' }));
  });
  it('sin cuenta de Google no se crea', async () => {
    await assertFails(crear(anon('u1'), 'u1', 'Iglesia Nueva'));
  });
  it('máximo 3 iglesias por cuenta', async () => {
    const db = google('g-ana');
    await assertSucceeds(crear(db, 'g-ana', 'Uno Iglesia'));
    await assertSucceeds(crear(db, 'g-ana', 'Dos Iglesia', { antes: ['uno iglesia'] }));
    await assertSucceeds(crear(db, 'g-ana', 'Tres Iglesia', { antes: ['uno iglesia', 'dos iglesia'] }));
    await assertFails(crear(db, 'g-ana', 'Cuatro Iglesia', { antes: ['uno iglesia', 'dos iglesia', 'tres iglesia'] }));
  });
  it('no se puede crear una iglesia a nombre de otra cuenta', async () => {
    const db = google('g-bea');
    const b = writeBatch(db);
    b.set(doc(db, 'churches', 'falsa'), {
      name: 'FALSA', adminKey: 'ana', ownerName: 'Ana', ownerUid: 'g-ana', ownerEmail: 'g-ana@gmail.com', status: 'activa', createdAt: serverTimestamp(),
    });
    b.set(doc(db, 'owners', 'g-bea'), { churches: ['falsa'] });
    await assertFails(b.commit());
  });
});

describe('dueño de la iglesia (Google)', () => {
  beforeEach(() => crear(google('g-ana'), 'g-ana', 'Iglesia Nueva'));
  const ID = 'iglesia nueva';
  const entrar = (db, uid, data) => setDoc(doc(db, 'churches', ID, 'sessions', uid), data);

  it('entra como Administrador sin PIN', async () => {
    await assertSucceeds(entrar(google('g-ana'), 'g-ana', { key: 'ana perez', name: 'Ana Pérez', role: 'admin' }));
    await assertSucceeds(getDoc(doc(google('g-ana'), 'churches', ID, 'songs', 'x')));
  });
  it('otra cuenta no puede entrar como Administrador', async () => {
    await assertFails(entrar(google('g-bea'), 'g-bea', { key: 'ana perez', name: 'Ana Pérez', role: 'admin' }));
  });
  it('los colaboradores entran como siempre', async () => {
    await assertSucceeds(entrar(anon('u1'), 'u1', { key: 'juan', name: 'Juan', role: 'colaborador' }));
    await assertFails(entrar(anon('u2'), 'u2', { key: 'ana perez', name: 'Ana', role: 'colaborador' }));
  });
  it('busca sus iglesias', async () => {
    await assertSucceeds(getDocs(query(collection(google('g-ana'), 'churches'), where('ownerUid', '==', 'g-ana'))));
    await assertFails(getDocs(collection(google('g-ana'), 'churches')));
  });
});

describe('vincular Google en iglesias antiguas', () => {
  it('el Administrador (con PIN) vincula su cuenta y después entra sin PIN', async () => {
    const db = google('g-leo2');
    await setDoc(doc(db, 'churches', C, 'sessions', 'g-leo2'), { key: ADMIN, name: 'Leo', role: 'admin', pin: '12345678' });
    await assertSucceeds(updateDoc(doc(db, 'churches', C), { ownerUid: 'g-leo2', ownerEmail: 'g-leo2@gmail.com' }));
    await assertSucceeds(setDoc(doc(db, 'churches', C, 'sessions', 'g-leo2'), { key: ADMIN, name: 'Leo', role: 'admin' }));
  });
  it('sin Google no se puede vincular', async () => {
    const db = anon('u-leo');
    await setDoc(doc(db, 'churches', C, 'sessions', 'u-leo'), { key: ADMIN, name: 'Leo', role: 'admin', pin: '12345678' });
    await assertFails(updateDoc(doc(db, 'churches', C), { ownerUid: 'u-leo' }));
  });
  it('el Director vincula su cuenta y después entra sin PIN', async () => {
    const db = google('g-dora');
    await setDoc(doc(db, 'churches', C, 'sessions', 'g-dora'), { key: 'dora', name: 'Dora', role: 'director', pin: '55555555' });
    await assertSucceeds(updateDoc(doc(db, 'churches', C, 'people', 'dora'), { uid: 'g-dora' }));
    await assertSucceeds(setDoc(doc(db, 'churches', C, 'sessions', 'g-dora'), { key: 'dora', name: 'Dora', role: 'director' }));
    await assertSucceeds(setDoc(doc(db, 'links', 'g-dora'), { churches: { [C]: { key: 'dora', name: 'Dora' } } }));
    await assertFails(setDoc(doc(db, 'links', 'g-otro'), { churches: {} }));
    // Otra cuenta no puede usar el nombre de Dora sin PIN.
    await assertFails(setDoc(doc(google('g-x'), 'churches', C, 'sessions', 'g-x'), { key: 'dora', name: 'Dora', role: 'director' }));
  });
  it('un colaborador no puede vincularse como si fuera director', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C, 'people', 'carlos'), { name: 'Carlos', role: 'colaborador' }));
    const db = google('g-carlos');
    await setDoc(doc(db, 'churches', C, 'sessions', 'g-carlos'), { key: 'carlos', name: 'Carlos', role: 'colaborador' });
    await assertFails(updateDoc(doc(db, 'churches', C, 'people', 'carlos'), { uid: 'g-carlos' }));
  });
});

describe('Super Admin', () => {
  it('solo el Super Admin ve todas las iglesias', async () => {
    await assertSucceeds(getDocs(collection(google('g-leo'), 'churches')));
    await assertSucceeds(getDocs(collection(google('g-leo'), 'churches', C, 'people')));
    await assertFails(getDocs(collection(google('g-ana'), 'churches')));
    await assertSucceeds(getDoc(doc(google('g-leo'), 'superadmins', 'g-leo')));
    await assertFails(setDoc(doc(google('g-ana'), 'superadmins', 'g-ana'), { nombre: 'yo' }));
  });
  it('bloquear una iglesia deja a todos fuera; desbloquear la abre', async () => {
    const leo = google('g-leo');
    await assertSucceeds(updateDoc(doc(leo, 'churches', C), { status: 'bloqueada' }));
    await assertFails(setDoc(doc(anon('u1'), 'churches', C, 'sessions', 'u1'), { key: 'juan', name: 'Juan', role: 'colaborador' }));
    await assertFails(setDoc(doc(anon('u2'), 'churches', C, 'sessions', 'u2'), { key: ADMIN, name: 'Leo', role: 'admin', pin: '12345678' }));
    await assertSucceeds(updateDoc(doc(leo, 'churches', C), { status: 'activa' }));
    await assertSucceeds(setDoc(doc(anon('u1'), 'churches', C, 'sessions', 'u1'), { key: 'juan', name: 'Juan', role: 'colaborador' }));
  });
  it('el Super Admin no cambia otra cosa que el estado', async () => {
    await assertFails(updateDoc(doc(google('g-leo'), 'churches', C), { adminKey: 'yo' }));
    await assertFails(updateDoc(doc(google('g-ana'), 'churches', C), { status: 'bloqueada' }));
  });
  it('el Super Admin borra una iglesia con todo lo que tiene', async () => {
    const leo = google('g-leo');
    await assertSucceeds(deleteDoc(doc(leo, 'churches', C, 'songs', 's1')));
    await assertSucceeds(deleteDoc(doc(leo, 'churches', C, 'private', 'pins')));
    await assertSucceeds(deleteDoc(doc(leo, 'churches', C)));
    await assertFails(deleteDoc(doc(google('g-ana'), 'churches', 'otra')));
  });
  it('al borrar una iglesia nueva, el Super Admin la saca de la cuenta que la creó', async () => {
    await crear(google('g-ana'), 'g-ana', 'Iglesia Nueva');
    await assertSucceeds(updateDoc(doc(google('g-leo'), 'owners', 'g-ana'), { churches: [] }));
    await assertFails(updateDoc(doc(google('g-bea'), 'owners', 'g-ana'), { churches: [] }));
  });
});

describe('contraseña (antes PIN)', () => {
  const entrar = (uid, pin) => setDoc(doc(anon(uid), 'churches', C, 'sessions', uid), { key: ADMIN, name: 'Leo', role: 'admin', pin });
  it('el campo nuevo adminPassword acepta letras y símbolos', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C), { name: 'PSG', adminKey: ADMIN, adminPassword: 'Gracia#2026' }));
    await assertSucceeds(entrar('u1', 'Gracia#2026'));
    await assertFails(entrar('u2', 'gracia#2026'));
  });
  it('si están los dos campos, vale adminPassword', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C), { name: 'PSG', adminKey: ADMIN, adminPin: '12345678', adminPassword: 'Nueva-clave' }));
    await assertSucceeds(entrar('u1', 'Nueva-clave'));
    await assertFails(entrar('u2', '12345678'));
  });
  it('una contraseña de menos de 8 caracteres no sirve', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C), { name: 'PSG', adminKey: ADMIN, adminPassword: 'corta' }));
    await assertFails(entrar('u1', 'corta'));
  });
  it('un Director con contraseña de texto', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C, 'private', 'pins'), { pins: { dora: 'Alabanza!7' } }));
    await assertSucceeds(setDoc(doc(anon('u3'), 'churches', C, 'sessions', 'u3'), { key: 'dora', name: 'Dora', role: 'director', pin: 'Alabanza!7' }));
  });
});
