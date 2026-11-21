// Pruebas de permisos contra el emulador de Firestore: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { keyOf } from '../src/lib/claves.js';

let env;
const C = 'iglesia gracia';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cancionero',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

const cuenta = (uid, provider = 'google.com') => env.authenticatedContext(uid, {
  email: `${uid}@gmail.com`, email_verified: true, firebase: { sign_in_provider: provider },
}).firestore();
const anonimo = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();

/** Lo mismo que hace la app: iglesia + owners + miembro Administrador + su ficha. */
function crear(db, uid, nombre, { id = keyOf(nombre), antes = [], code = 'ABCDEF' } = {}) {
  const b = writeBatch(db);
  b.set(doc(db, 'churches', id), {
    name: nombre.trim().toUpperCase(), ownerUid: uid, ownerEmail: `${uid}@gmail.com`, ownerName: 'Ana',
    accessCode: code, status: 'activa', createdAt: serverTimestamp(),
  });
  b.set(doc(db, 'owners', uid), { churches: [...antes, id] });
  if (code) b.set(doc(db, 'codes', code), { churchId: id });
  b.set(doc(db, 'churches', id, 'members', uid), { key: uid, name: 'Ana', role: 'admin', joinedAt: 1 });
  b.set(doc(db, 'churches', id, 'people', uid), { name: 'Ana', uid, role: 'admin', firstSeen: 1, lastSeen: 1 });
  return b.commit();
}
/** Unirse con el código. */
function unirse(db, uid, code, { c = C, role = 'colaborador', name = 'Juan' } = {}) {
  const b = writeBatch(db);
  b.set(doc(db, 'churches', c, 'members', uid), { key: uid, name, role, code, joinedAt: 1 });
  b.set(doc(db, 'churches', c, 'people', uid), { name, uid, role, firstSeen: 1, lastSeen: 1 });
  return b.commit();
}

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'superadmins', 'leo'), { nombre: 'Leonardo' }));
  await crear(cuenta('ana'), 'ana', 'Iglesia Gracia');
});

describe('crear iglesias con nombre único', () => {
  it('la clave quita mayúsculas, tildes y espacios de más', () => {
    if (keyOf('  Iglesia   Bautista  ÑUÑOA ') !== 'iglesia bautista nunoa') throw new Error('keyOf');
  });
  it('con cuenta de Google o de correo se crea', async () => {
    await assertSucceeds(crear(cuenta('bea'), 'bea', 'Iglesia Bautista Ñuñoa', { code: 'BEA123' }));
    await assertSucceeds(crear(cuenta('cris', 'password'), 'cris', 'Otra Iglesia', { code: 'CRIS12' }));
  });
  it('no se puede repetir el nombre aunque cambien tildes, mayúsculas o espacios', async () => {
    await assertFails(crear(cuenta('bea'), 'bea', 'IGLESIA   gracia', { code: 'BEA999' }));
    await crear(cuenta('bea'), 'bea', 'Iglesia Bautista Ñuñoa', { code: 'BEA123' });
    await assertFails(crear(cuenta('cris'), 'cris', 'iglesia bautista nunoa', { code: 'CRIS12' }));
  });
  it('el id tiene que ser el nombre normalizado', async () => {
    await assertFails(crear(cuenta('bea'), 'bea', 'Gracia', { id: 'gracia 2', code: 'BEA777' }));
  });
  it('sin cuenta (anónimo) no se crea', async () => {
    await assertFails(crear(anonimo('x'), 'x', 'Iglesia Anonima', { code: 'ANON12' }));
  });
  it('máximo 3 iglesias creadas por cuenta', async () => {
    const db = cuenta('bea');
    await assertSucceeds(crear(db, 'bea', 'Uno Iglesia', { code: 'UNO111' }));
    await assertSucceeds(crear(db, 'bea', 'Dos Iglesia', { antes: ['uno iglesia'], code: 'DOS222' }));
    await assertSucceeds(crear(db, 'bea', 'Tres Iglesia', { antes: ['uno iglesia', 'dos iglesia'], code: 'TRES33' }));
    await assertFails(crear(db, 'bea', 'Cuatro Iglesia', { antes: ['uno iglesia', 'dos iglesia', 'tres iglesia'], code: 'CUAT44' }));
  });
  it('necesita un código de acceso', async () => {
    await assertFails(crear(cuenta('bea'), 'bea', 'Sin Codigo', { code: '' }));
  });
  it('no puede haber dos iglesias con el mismo código', async () => {
    await assertFails(crear(cuenta('bea'), 'bea', 'Otra Iglesia', { code: 'ABCDEF' }));
    await assertSucceeds(crear(cuenta('bea'), 'bea', 'Otra Iglesia', { code: 'ZZZZZZ' }));
  });
  it('el código no se puede anotar para la iglesia de otro', async () => {
    await assertFails(setDoc(doc(cuenta('bea'), 'codes', 'ROBADO'), { churchId: C }));
  });
  it('con cuenta se busca un código (pero no se listan)', async () => {
    const r = await assertSucceeds(getDoc(doc(cuenta('juan'), 'codes', 'ABCDEF')));
    if (r.data().churchId !== C) throw new Error('churchId');
    await assertFails(getDocs(collection(cuenta('juan'), 'codes')));
    await assertFails(getDoc(doc(anonimo('x'), 'codes', 'ABCDEF')));
  });
  it('el Administrador cambia el código: el nuevo se anota y el viejo se borra', async () => {
    const db = cuenta('ana');
    const b = writeBatch(db);
    b.update(doc(db, 'churches', C), { accessCode: 'NUEVO1' });
    b.set(doc(db, 'codes', 'NUEVO1'), { churchId: C });
    b.delete(doc(db, 'codes', 'ABCDEF'));
    await assertSucceeds(b.commit());
    // un código que ya usa otra iglesia, no
    await crear(cuenta('bea'), 'bea', 'Otra Iglesia', { code: 'OTRA12' });
    const b2 = writeBatch(db);
    b2.update(doc(db, 'churches', C), { accessCode: 'OTRA12' });
    await assertFails(b2.commit());
  });
});

describe('unirse con código', () => {
  it('con el código correcto entra como Colaborador y ve las canciones', async () => {
    const db = cuenta('juan');
    await assertSucceeds(unirse(db, 'juan', 'ABCDEF'));
    await assertSucceeds(getDocs(collection(db, 'churches', C, 'songs')));
    await assertSucceeds(getDoc(doc(db, 'churches', C)));
  });
  it('con código malo, o sin cuenta, no entra', async () => {
    await assertFails(unirse(cuenta('juan'), 'juan', 'XXXXXX'));
    await assertFails(unirse(anonimo('juan'), 'juan', 'ABCDEF'));
  });
  it('nadie se une como Director o Administrador', async () => {
    await assertFails(unirse(cuenta('juan'), 'juan', 'ABCDEF', { role: 'director' }));
    await assertFails(unirse(cuenta('juan'), 'juan', 'ABCDEF', { role: 'admin' }));
  });
  it('sin unirse no se ve nada de la iglesia', async () => {
    const db = cuenta('juan');
    await assertFails(getDocs(collection(db, 'churches', C, 'songs')));
    await assertFails(getDoc(doc(db, 'churches', C)));
    await assertFails(getDocs(collection(db, 'churches')));
  });
  it('no se puede crear la ficha de otro', async () => {
    const db = cuenta('juan');
    const b = writeBatch(db);
    b.set(doc(db, 'churches', C, 'members', 'juan'), { key: 'pedro', name: 'Juan', role: 'colaborador', code: 'ABCDEF', joinedAt: 1 });
    b.set(doc(db, 'churches', C, 'people', 'pedro'), { name: 'Juan', uid: 'juan', role: 'colaborador' });
    await assertFails(b.commit());
  });
  it('salir y volver a unirse', async () => {
    const db = cuenta('juan');
    await unirse(db, 'juan', 'ABCDEF');
    await assertSucceeds(deleteDoc(doc(db, 'churches', C, 'members', 'juan')));
    await assertFails(getDocs(collection(db, 'churches', C, 'songs')));
    await assertSucceeds(unirse(db, 'juan', 'ABCDEF'));
  });
  it('quien creó la iglesia no puede salir de ella', async () => {
    await assertFails(deleteDoc(doc(cuenta('ana'), 'churches', C, 'members', 'ana')));
  });
});

describe('perfiles', () => {
  beforeEach(() => unirse(cuenta('juan'), 'juan', 'ABCDEF'));
  it('un Colaborador no edita canciones ni se sube de perfil', async () => {
    const db = cuenta('juan');
    await assertFails(setDoc(doc(db, 'churches', C, 'songs', 's1'), { title: 'Santo' }));
    await assertFails(updateDoc(doc(db, 'churches', C, 'members', 'juan'), { role: 'director' }));
    await assertFails(updateDoc(doc(db, 'churches', C, 'people', 'juan'), { role: 'director' }));
  });
  it('el Administrador lo sube a Director y entonces edita', async () => {
    await assertSucceeds(updateDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan'), { role: 'director' }));
    await assertSucceeds(updateDoc(doc(cuenta('ana'), 'churches', C, 'people', 'juan'), { role: 'director' }));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'songs', 's1'), { title: 'Santo' }));
    // pero no puede hacer Administrador a nadie
    await assertFails(updateDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan'), { role: 'admin' }));
  });
  it('cada uno cambia su nombre y equipos, no los de otro', async () => {
    await assertSucceeds(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { name: 'Juan P.', teams: ['Guitarra'] }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'ana'), { name: 'X' }));
  });
  it('el Administrador cambia el código y saca a alguien', async () => {
    const ana = cuenta('ana');
    const b = writeBatch(ana);
    b.update(doc(ana, 'churches', C), { accessCode: 'NUEVO1' });
    b.set(doc(ana, 'codes', 'NUEVO1'), { churchId: C });
    await assertSucceeds(b.commit());
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C), { accessCode: 'MIO123' }));
    await assertSucceeds(deleteDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan')));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'songs')));
  });
  it('fotos: cada uno sube la suya, el Administrador la quita y sube el logo', async () => {
    const foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    await assertSucceeds(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { photo: foto }));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'users', 'juan'), { photo: foto }, { merge: true }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'ana'), { photo: foto }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { photo: 'https://otro.com/x.jpg' }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { photo: `data:image/jpeg;base64,${'A'.repeat(60000)}` }));
    await assertSucceeds(updateDoc(doc(cuenta('ana'), 'churches', C, 'people', 'juan'), { photo: deleteField() }));
    await assertSucceeds(updateDoc(doc(cuenta('ana'), 'churches', C), { logo: foto }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C), { logo: foto }));
    await assertSucceeds(updateDoc(doc(cuenta('ana'), 'churches', C), { logo: deleteField() }));
  });
  it('favoritas solo propias', async () => {
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'favorites', 'juan'), { songs: ['a'] }));
    await assertFails(getDoc(doc(cuenta('juan'), 'churches', C, 'favorites', 'ana')));
  });
  it('inscripciones: uno mismo, o el Administrador por otros', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C, 'events', 'e1'), { name: 'Culto' }));
    const ins = (pk) => ({ eventId: 'e1', personKey: pk, name: 'X', role: 'Guitarra', group: 'Instrumentos', date: '2026-12-01' });
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'participations', 'e1__juan'), ins('juan')));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'participations', 'e1__ana'), ins('ana')));
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'churches', C, 'participations', 'e1__juan'), ins('juan')));
  });
});

describe('en vivo', () => {
  beforeEach(() => unirse(cuenta('juan'), 'juan', 'ABCDEF'));
  const vivo = (by, extra = {}) => ({ eventId: 'e1', songId: 's1', song: 0, section: 2, by, byName: 'X', active: true, at: Date.now(), ...extra });
  it('el Administrador o un Director pasa la letra; todos los miembros la leen', async () => {
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'churches', C, 'live', 'actual'), vivo('ana')));
    await assertSucceeds(getDoc(doc(cuenta('juan'), 'churches', C, 'live', 'actual')));
    await assertFails(getDoc(doc(cuenta('pedro'), 'churches', C, 'live', 'actual')));
    await updateDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan'), { role: 'director' });
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'live', 'actual'), vivo('juan')));
  });
  it('un Colaborador no la pasa, y nadie firma por otro', async () => {
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'live', 'actual'), vivo('juan')));
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'live', 'actual'), vivo('juan')));
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'live', 'otro'), vivo('ana')));
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'live', 'actual'), vivo('ana', { extra: 1 })));
  });
});

describe('cuenta personal', () => {
  it('mis canciones solo las veo yo', async () => {
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'users', 'juan', 'songs', 's1'), { title: 'Mía', content: '[G]Hola' }));
    await assertFails(getDoc(doc(cuenta('pedro'), 'users', 'juan', 'songs', 's1')));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'users', 'juan'), { name: 'Juan', favorites: ['x'] }));
    await assertFails(setDoc(doc(cuenta('pedro'), 'users', 'juan'), { name: 'X' }));
  });
  it('la biblioteca compartida se lee con cuenta', async () => {
    await assertSucceeds(getDocs(collection(cuenta('juan'), 'library')));
    await assertFails(getDocs(collection(anonimo('x'), 'library')));
  });
  it('solo quien edita en la iglesia comparte, con el nombre real de la iglesia', async () => {
    const lib = (db, churchName) => setDoc(doc(db, 'library', `${C}__s1`), {
      churchId: C, churchName, songId: 's1', title: 'Santo', content: '[G]Santo', confirmed: true,
    });
    await assertSucceeds(lib(cuenta('ana'), 'IGLESIA GRACIA'));
    await assertFails(lib(cuenta('ana'), 'OTRA'));
    await unirse(cuenta('juan'), 'juan', 'ABCDEF');
    await assertFails(lib(cuenta('juan'), 'IGLESIA GRACIA'));
  });
});

describe('Super Admin', () => {
  it('ve todas las iglesias y lo de adentro', async () => {
    await assertSucceeds(getDocs(collection(cuenta('leo'), 'churches')));
    await assertSucceeds(getDocs(collection(cuenta('leo'), 'churches', C, 'people')));
    await assertFails(getDocs(collection(cuenta('ana'), 'churches')));
    await assertFails(setDoc(doc(cuenta('ana'), 'superadmins', 'ana'), { nombre: 'yo' }));
  });
  it('bloquear deja a todos fuera; desbloquear los deja volver', async () => {
    await unirse(cuenta('juan'), 'juan', 'ABCDEF');
    await assertSucceeds(updateDoc(doc(cuenta('leo'), 'churches', C), { status: 'bloqueada' }));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'songs')));
    await assertFails(getDocs(collection(cuenta('ana'), 'churches', C, 'songs')));
    await assertFails(unirse(cuenta('pedro'), 'pedro', 'ABCDEF'));
    await assertSucceeds(updateDoc(doc(cuenta('leo'), 'churches', C), { status: 'activa' }));
    await assertSucceeds(getDocs(collection(cuenta('juan'), 'churches', C, 'songs')));
  });
  it('solo cambia el estado', async () => {
    await assertFails(updateDoc(doc(cuenta('leo'), 'churches', C), { ownerUid: 'leo' }));
    await assertFails(updateDoc(doc(cuenta('ana'), 'churches', C), { status: 'bloqueada' }));
  });
  it('borra una iglesia con todo y la saca de la cuenta que la creó', async () => {
    const leo = cuenta('leo');
    await assertSucceeds(deleteDoc(doc(leo, 'churches', C, 'members', 'ana')));
    await assertSucceeds(deleteDoc(doc(leo, 'churches', C, 'people', 'ana')));
    await assertSucceeds(deleteDoc(doc(leo, 'churches', C)));
    await assertSucceeds(updateDoc(doc(leo, 'owners', 'ana'), { churches: [] }));
    await assertFails(updateDoc(doc(cuenta('bea'), 'owners', 'ana'), { churches: [] }));
  });
});
