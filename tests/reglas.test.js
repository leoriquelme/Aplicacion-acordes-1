// Pruebas de permisos contra el emulador de Firestore: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
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
  it('salir con foto y volver a unirse (la ficha se reemplaza y luego vuelve la foto)', async () => {
    const db = cuenta('juan');
    await unirse(db, 'juan', 'ABCDEF');
    await assertSucceeds(updateDoc(doc(db, 'churches', C, 'people', 'juan'), { photo: 'data:image/jpeg;base64,AAAA', teams: ['Bajo'] }));
    await assertSucceeds(deleteDoc(doc(db, 'churches', C, 'members', 'juan')));
    await assertSucceeds(unirse(db, 'juan', 'ABCDEF'));
    await assertSucceeds(updateDoc(doc(db, 'churches', C, 'people', 'juan'), { lastSeen: 2, photo: 'data:image/jpeg;base64,AAAA' }));
  });
  it('antes de salir, uno borra sus inscripciones', async () => {
    const db = cuenta('juan');
    await unirse(db, 'juan', 'ABCDEF');
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C, 'events', 'e1'), { name: 'Servicio', date: '2099-01-01', items: [] }));
    await assertSucceeds(setDoc(doc(db, 'churches', C, 'participations', 'e1__juan'), { eventId: 'e1', personKey: 'juan', name: 'Juan', role: 'Bajo', group: 'Instrumentos', date: '2099-01-01', at: 1 }));
    await assertSucceeds(getDocs(query(collection(db, 'churches', C, 'participations'), where('personKey', '==', 'juan'))));
    await assertSucceeds(deleteDoc(doc(db, 'churches', C, 'participations', 'e1__juan')));
    await assertSucceeds(deleteDoc(doc(db, 'churches', C, 'members', 'juan')));
  });
  it('cada uno cambia su nombre en su ficha', async () => {
    const db = cuenta('juan');
    await unirse(db, 'juan', 'ABCDEF');
    await assertSucceeds(updateDoc(doc(db, 'churches', C, 'people', 'juan'), { name: 'Juan Pablo' }));
    await assertSucceeds(setDoc(doc(db, 'users', 'juan'), { name: 'Juan Pablo' }, { merge: true }));
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
    // un Director no nombra Administradores; el Súper admin (quien creó la iglesia) sí
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'members', 'juan'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan'), { role: 'admin' }));
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
    // Fecha de nacimiento: completa solo en mi cuenta; en la iglesia solo día y mes.
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'users', 'juan'), { birthDate: '1990-03-14' }, { merge: true }));
    await assertFails(setDoc(doc(cuenta('juan'), 'users', 'juan'), { birthDate: '14/03/1990' }, { merge: true }));
    await assertSucceeds(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { birthday: '03-14' }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { birthday: '1990-03-14' }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'ana'), { birthday: '03-14' }));
    await assertSucceeds(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'juan'), { birthday: deleteField() }));
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
  it('propuestas: el líder propone, la persona acepta o dice que no puede', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C, 'events', 'e2'), { name: 'Servicio' }));
    const ins = (pk, extra = {}) => ({ eventId: 'e2', personKey: pk, name: 'X', role: 'Bajo', group: 'instrumentos', date: '2026-12-01', ...extra });
    // Un Colaborador no propone (ni a sí mismo ni a otros)
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'participations', 'e2__juan'), ins('juan', { estado: 'propuesta' })));
    // El Administrador propone a Juan
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'churches', C, 'participations', 'e2__juan'), ins('juan', { estado: 'propuesta', por: 'Ana' })));
    // Juan dice que no puede, y después sí acepta
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'participations', 'e2__juan'), ins('juan', { estado: 'rechazada', por: 'Ana' })));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'participations', 'e2__juan'), ins('juan')));
    // Estados inventados no
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'participations', 'e2__juan'), ins('juan', { estado: 'obligado' })));
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

describe('música por link público', () => {
  beforeEach(() => unirse(cuenta('juan'), 'juan', 'ABCDEF'));
  const musica = (extra = {}) => ({
    nombre: 'IGLESIA GRACIA', at: 1,
    culto: { nombre: 'Servicio de Adoración', fecha: '2026-11-29', hora: '11:45', spotify: '', canciones: [{ t: 'Alaba', sp: 'https://open.spotify.com/track/x' }] },
    repertorio: [{ t: 'Alaba', a: 'Autor' }], ...extra,
  });
  it('el Administrador la activa y cualquiera la lee sin cuenta', async () => {
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'musicaPublica', C), musica()));
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'musicaPublica', C)));
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'musicaPublica', C), musica({ culto: null })));
  });
  it('un Colaborador o alguien de otra iglesia no la cambia', async () => {
    await assertFails(setDoc(doc(cuenta('juan'), 'musicaPublica', C), musica()));
    await assertFails(setDoc(doc(cuenta('pedro'), 'musicaPublica', C), musica()));
    await updateDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan'), { role: 'director' });
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'musicaPublica', C), musica()));
    await assertSucceeds(deleteDoc(doc(cuenta('juan'), 'musicaPublica', C)));
  });
  it('no acepta otros campos ni otro nombre de iglesia', async () => {
    await assertFails(setDoc(doc(cuenta('ana'), 'musicaPublica', C), musica({ personas: ['Juan'] })));
    await assertFails(setDoc(doc(cuenta('ana'), 'musicaPublica', C), musica({ nombre: 'OTRA' })));
    await assertFails(setDoc(doc(cuenta('ana'), 'musicaPublica', C), musica({ repertorio: Array(31).fill({ t: 'x' }) })));
  });
});

describe('avisos de la iglesia', () => {
  beforeEach(() => unirse(cuenta('juan'), 'juan', 'ABCDEF'));
  const aviso = (extra = {}) => ({ titulo: 'Cena de Navidad', texto: 'Sábado 20', hasta: '2026-12-20', fijado: false, por: 'Ana', at: 1, ...extra });
  it('el Administrador o el Pastor publica; los miembros leen', async () => {
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'churches', C, 'avisos', 'a1'), aviso()));
    await assertSucceeds(getDoc(doc(cuenta('juan'), 'churches', C, 'avisos', 'a1')));
    await assertFails(getDoc(doc(cuenta('pedro'), 'churches', C, 'avisos', 'a1')));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'avisos', 'a2'), aviso()));
    await updateDoc(doc(cuenta('ana'), 'churches', C, 'members', 'juan'), { perfiles: ['pastor'] });
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'avisos', 'a2'), aviso()));
    await assertSucceeds(deleteDoc(doc(cuenta('juan'), 'churches', C, 'avisos', 'a1')));
  });
  it('valida los campos', async () => {
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'avisos', 'a1'), aviso({ titulo: '' })));
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'avisos', 'a1'), aviso({ hasta: 'mañana' })));
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'avisos', 'a1'), aviso({ otro: 1 })));
  });
});

describe('peticiones de oración', () => {
  beforeEach(async () => {
    await unirse(cuenta('juan'), 'juan', 'ABCDEF');
    await unirse(cuenta('rosa'), 'rosa', 'ABCDEF', { name: 'Rosa' });
  });
  const pet = (extra = {}) => ({ texto: 'Por la salud de mi mamá', para: 'pastores', estado: 'activa', autorUid: 'juan', autor: 'Juan', at: 1, orando: {}, ...extra });
  const ref = (db, id = 'p1') => doc(db, 'churches', C, 'oracion', id);
  it('la privada la ven solo el autor y los pastores', async () => {
    await assertSucceeds(setDoc(ref(cuenta('juan')), pet()));
    await assertSucceeds(getDoc(ref(cuenta('juan'))));
    await assertSucceeds(getDoc(ref(cuenta('ana'))));
    await assertFails(getDoc(ref(cuenta('rosa'))));
    await assertFails(updateDoc(ref(cuenta('rosa')), { 'orando.rosa': true }));
  });
  it('la de toda la iglesia: todos la leen y cada uno marca solo su "estoy orando"', async () => {
    await setDoc(ref(cuenta('juan')), pet({ para: 'iglesia' }));
    await assertSucceeds(getDocs(query(collection(cuenta('rosa'), 'churches', C, 'oracion'), where('para', '==', 'iglesia'))));
    await assertSucceeds(updateDoc(ref(cuenta('rosa')), { 'orando.rosa': true }));
    await assertFails(updateDoc(ref(cuenta('rosa')), { 'orando.juan': true }));
    await assertFails(updateDoc(ref(cuenta('rosa')), { texto: 'cambiado' }));
    await assertSucceeds(updateDoc(ref(cuenta('rosa')), { 'orando.rosa': deleteField() }));
    await assertFails(deleteDoc(ref(cuenta('rosa'))));
    await assertSucceeds(updateDoc(ref(cuenta('juan')), { estado: 'respondida' }));
    await assertSucceeds(deleteDoc(ref(cuenta('juan'))));
  });
  it('nadie escribe a nombre de otro ni fuera de la iglesia', async () => {
    await assertFails(setDoc(ref(cuenta('rosa')), pet()));
    await assertFails(setDoc(ref(cuenta('pedro')), pet({ autorUid: 'pedro' })));
    await assertFails(setDoc(ref(cuenta('juan')), pet({ orando: { juan: true } })));
    await assertFails(setDoc(ref(cuenta('juan')), pet({ texto: '' })));
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

describe('Contador de oraciones', () => {
  it('cualquiera suma de a uno; solo el Super Admin lo deja en 0', async () => {
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'stats', 'oracion'), { count: 1 }));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'stats', 'oracion'), { count: 2 }));
    await assertFails(setDoc(doc(cuenta('juan'), 'stats', 'oracion'), { count: 0 }));
    await assertSucceeds(setDoc(doc(cuenta('leo'), 'stats', 'oracion'), { count: 0 }));
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'stats', 'oracion'), { count: 1 }));
  });
});

describe('sugerencias de mejoras (solo el Super Admin)', () => {
  const sug = (uid, extra = {}) => ({ text: 'Una idea', uid, email: `${uid}@gmail.com`, name: 'Ana', churchId: C, churchName: 'IGLESIA GRACIA', at: 1, ...extra });
  it('cualquiera con cuenta envía, aunque no tenga iglesia', async () => {
    await assertSucceeds(setDoc(doc(cuenta('ana'), 'feedback', 's1'), sug('ana')));
    await assertSucceeds(setDoc(doc(cuenta('zoe'), 'feedback', 's2'), sug('zoe', { churchId: '', churchName: '' })));
  });
  it('no se puede enviar a nombre de otro, vacía o con campos raros', async () => {
    await assertFails(setDoc(doc(cuenta('zoe'), 'feedback', 's1'), sug('ana')));
    await assertFails(setDoc(doc(cuenta('ana'), 'feedback', 's1'), sug('ana', { text: '' })));
    await assertFails(setDoc(doc(cuenta('ana'), 'feedback', 's1'), sug('ana', { extra: 1 })));
    await assertFails(setDoc(doc(anonimo('x'), 'feedback', 's1'), sug('x')));
  });
  it('el Administrador de la iglesia no las lee; el Super Admin sí, y las resuelve', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'feedback', 's1'), sug('juan')));
    await assertFails(getDocs(collection(cuenta('ana'), 'feedback')));
    await assertFails(getDoc(doc(cuenta('ana'), 'feedback', 's1')));
    await assertSucceeds(getDocs(collection(cuenta('leo'), 'feedback')));
    await assertFails(updateDoc(doc(cuenta('leo'), 'feedback', 's1'), { text: 'x' }));
    await assertSucceeds(deleteDoc(doc(cuenta('leo'), 'feedback', 's1')));
  });
  it('las sugerencias antiguas de la iglesia ya no las lee el Administrador', async () => {
    await assertFails(getDocs(collection(cuenta('ana'), 'churches', C, 'suggestions')));
    await assertFails(setDoc(doc(cuenta('ana'), 'churches', C, 'suggestions', 'x'), { text: 'a' }));
  });
});

describe('Congrega: familias, fichas privadas y asistencia', () => {
  const ana = () => cuenta('ana');
  const hoy = new Date().toISOString().slice(0, 10);
  const evento = () => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'churches', C, 'events', 'ev1'), { name: 'Culto', date: hoy, items: [] }));
  const marca = (db, por, personKey = 'juan', date = hoy) => setDoc(doc(db, 'churches', C, 'asistencia', `ev1__${personKey}`), { eventId: 'ev1', personKey, date, at: 1, por });

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'churches', C, 'members', 'juan'), { key: 'juan', name: 'Juan', role: 'colaborador', joinedAt: 1 });
      await setDoc(doc(db, 'churches', C, 'people', 'juan'), { name: 'Juan', uid: 'juan', role: 'colaborador', firstSeen: 1, lastSeen: 1 });
    });
    await evento();
  });

  it('el Administrador guarda fichas privadas; cada uno ve y actualiza solo la suya', async () => {
    await assertSucceeds(setDoc(doc(ana(), 'churches', C, 'fichas', 'juan'), { telefono: '9 1234 5678' }));
    await assertSucceeds(setDoc(doc(ana(), 'churches', C, 'fichas', 'ana'), { telefono: '9 0000 0000' }));
    await assertSucceeds(getDoc(doc(cuenta('juan'), 'churches', C, 'fichas', 'juan')));
    await assertFails(getDoc(doc(cuenta('juan'), 'churches', C, 'fichas', 'ana')));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'fichas')));
    await assertSucceeds(updateDoc(doc(cuenta('juan'), 'churches', C, 'fichas', 'juan'), { telefono: '1', consentimiento: true }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'fichas', 'juan'), { fechaBautismo: '2020-01-01' }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'fichas', 'ana'), { telefono: '1' }));
  });
  it('las notas pastorales y de salud: solo Administrador y Pastor', async () => {
    await assertSucceeds(setDoc(doc(ana(), 'churches', C, 'notas', 'juan'), { notas: 'a', notasMedicas: 'b' }));
    await assertFails(setDoc(doc(ana(), 'churches', C, 'notas', 'juan'), { notas: 'a', telefono: '1' }));
    await assertFails(getDoc(doc(cuenta('juan'), 'churches', C, 'notas', 'juan')));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'fichas', 'juan'), { notas: 'x' }));
    await assertSucceeds(updateDoc(doc(ana(), 'churches', C, 'members', 'juan'), { perfiles: ['pastor'] }));
    await assertSucceeds(getDocs(collection(cuenta('juan'), 'churches', C, 'notas')));
    await assertSucceeds(getDocs(collection(cuenta('juan'), 'churches', C, 'fichas')));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'notas', 'ana'), { notas: 'oración' }));
    await assertSucceeds(getDocs(collection(cuenta('juan'), 'churches', C, 'asistencia')));
    await assertFails(marca(cuenta('juan'), 'juan'));
    await assertFails(deleteDoc(doc(cuenta('juan'), 'churches', C, 'notas', 'ana')));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'families', 'f9'), { name: 'X' }));
  });
  it('Encargado de asistencia: marca solo cerca del día del evento; el Administrativo, cualquier fecha', async () => {
    await invitar(ana());
    await updateDoc(doc(cuenta('juan'), 'churches', C, 'equipoEstacion', 'juan'), { estado: 'aceptado' });
    await turno(ana(), 'aprobado');
    await assertSucceeds(marca(cuenta('juan'), 'juan'));
    await assertFails(marca(cuenta('juan'), 'juan', 'ana', '2025-01-05'));
    await assertFails(marca(cuenta('juan'), 'juan', 'ana', ''));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v1'), { name: 'Pedro Soto', uid: '', role: 'colaborador', tipo: 'Visita', creadoEn: 1 }));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'fichas')));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'events', 'ev2'), { name: 'Culto', date: hoy, items: [] }));
    await updateDoc(doc(ana(), 'churches', C, 'members', 'juan'), { perfiles: ['asisAdmin'] });
    await assertSucceeds(marca(cuenta('juan'), 'juan', 'ana', '2025-01-05'));
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'events', 'ev2'), { name: 'Culto', date: hoy, items: [] }));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'notas')));
    // Sugerencias del Inicio: el Administrativo corrige tipo y rango de edad, nada más.
    await assertSucceeds(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v1'), { tipo: 'Regular', rangoEdad: 'Adolescente', esNino: false }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v1'), { tipo: 'Jefe' }));
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v1'), { name: 'Otro' }));
  });
  it('perfiles: el Administrador no nombra Administradores; el Súper admin sí; al Súper admin nadie lo toca', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'churches', C, 'members', 'beto'), { key: 'beto', name: 'Beto', role: 'admin', joinedAt: 1 });
    });
    const beto = () => cuenta('beto');
    await assertFails(updateDoc(doc(beto(), 'churches', C, 'members', 'juan'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(beto(), 'churches', C, 'members', 'juan'), { role: 'miembro', perfiles: ['pastor', 'asisAdmin'] }));
    await assertFails(updateDoc(doc(beto(), 'churches', C, 'members', 'juan'), { perfiles: ['superadmin'] }));
    await assertFails(updateDoc(doc(beto(), 'churches', C, 'members', 'ana'), { role: 'colaborador' }));
    await assertFails(updateDoc(doc(beto(), 'churches', C, 'members', 'ana'), { perfiles: ['pastor'] }));
    await assertFails(deleteDoc(doc(beto(), 'churches', C, 'members', 'ana')));
    await assertSucceeds(updateDoc(doc(ana(), 'churches', C, 'members', 'juan'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(ana(), 'churches', C, 'members', 'beto'), { role: 'director' }));
    await assertSucceeds(updateDoc(doc(ana(), 'churches', C, 'members', 'ana'), { perfiles: ['pastor'] }));
  });
  it('registro de cambios: todos anotan lo suyo, solo el Súper admin lo lee y nadie lo borra', async () => {
    const r = (db, uid, id) => setDoc(doc(db, 'churches', C, 'registro', id), { at: 1, uid, nombre: 'Juan', accion: 'Editó ficha', persona: 'Ana', detalle: 'telefono' });
    await assertSucceeds(r(cuenta('juan'), 'juan', 'r1'));
    await assertFails(r(cuenta('juan'), 'ana', 'r2'));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'registro')));
    await assertSucceeds(getDocs(collection(ana(), 'churches', C, 'registro')));
    await assertFails(deleteDoc(doc(ana(), 'churches', C, 'registro', 'r1')));
  });
  it('cuentas de Google: cada uno anota la suya; la ven el Administrador y el Pastor', async () => {
    const c = (db, uid, extra = {}) => setDoc(doc(db, 'churches', C, 'cuentas', uid), { email: `${uid}@gmail.com`, nombre: uid, at: 1, ...extra });
    await assertSucceeds(c(cuenta('juan'), 'juan'));
    await assertFails(c(cuenta('juan'), 'ana'));
    await assertFails(c(cuenta('juan'), 'juan', { role: 'admin' }));
    await assertSucceeds(getDoc(doc(cuenta('juan'), 'churches', C, 'cuentas', 'juan')));
    await assertFails(getDocs(collection(cuenta('juan'), 'churches', C, 'cuentas')));
    await assertSucceeds(getDocs(collection(ana(), 'churches', C, 'cuentas')));
    await assertFails(c(cuenta('pedro'), 'pedro'));
  });
  it('familias: los miembros leen, solo el Administrador escribe', async () => {
    await assertSucceeds(setDoc(doc(ana(), 'churches', C, 'families', 'f1'), { name: 'Rojas Muñoz' }));
    await assertSucceeds(getDoc(doc(cuenta('juan'), 'churches', C, 'families', 'f1')));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'families', 'f2'), { name: 'Otra' }));
  });
  const invitar = (db, uid = 'juan', por = 'ana') => setDoc(doc(db, 'churches', C, 'equipoEstacion', uid), { estado: 'invitado', por, at: 1, nombre: 'Juan' });
  const turno = (db, estado = 'ofrecido', uid = 'juan') => setDoc(doc(db, 'churches', C, 'turnosEstacion', `ev1__${uid}`), { eventId: 'ev1', uid, nombre: 'Juan', date: hoy, estado, at: 1 });
  it('equipo de estación: invitación, aceptar, ofrecerse y marcar solo con el turno aprobado', async () => {
    const juan = () => cuenta('juan');
    await assertFails(marca(juan(), 'juan'));
    await assertFails(getDocs(collection(juan(), 'churches', C, 'asistencia')));
    await assertFails(invitar(juan(), 'juan', 'juan'));
    await assertSucceeds(invitar(ana()));
    await assertFails(turno(juan())); // todavía no acepta
    await assertSucceeds(updateDoc(doc(juan(), 'churches', C, 'equipoEstacion', 'juan'), { estado: 'aceptado', at: 2 }));
    await assertSucceeds(getDocs(collection(juan(), 'churches', C, 'asistencia')));
    await assertFails(marca(juan(), 'juan')); // falta el turno aprobado
    await assertFails(turno(juan(), 'aprobado'));
    await assertSucceeds(turno(juan()));
    await assertFails(updateDoc(doc(juan(), 'churches', C, 'turnosEstacion', 'ev1__juan'), { estado: 'aprobado' }));
    await assertSucceeds(getDocs(query(collection(juan(), 'churches', C, 'turnosEstacion'), where('uid', '==', 'juan'))));
    await assertFails(getDocs(collection(juan(), 'churches', C, 'turnosEstacion')));
    await assertSucceeds(updateDoc(doc(ana(), 'churches', C, 'turnosEstacion', 'ev1__juan'), { estado: 'aprobado', por: 'ana' }));
    await assertSucceeds(marca(juan(), 'juan', 'ana'));
    await assertSucceeds(deleteDoc(doc(juan(), 'churches', C, 'asistencia', 'ev1__ana')));
    await assertFails(getDocs(collection(juan(), 'churches', C, 'fichas')));
    // sale del equipo y ya no marca
    await assertSucceeds(deleteDoc(doc(juan(), 'churches', C, 'equipoEstacion', 'juan')));
    await assertFails(marca(juan(), 'juan', 'ana'));
  });
  it('un colaborador no se habilita solo ni cambia su perfil', async () => {
    await assertFails(updateDoc(doc(cuenta('juan'), 'churches', C, 'members', 'juan'), { perfiles: ['asisAdmin'] }));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'equipoEstacion', 'juan'), { estado: 'aceptado', por: 'juan', at: 1 }));
  });
  it('el Administrador se suma perfiles sin cambiar su perfil principal', async () => {
    await assertSucceeds(updateDoc(doc(ana(), 'churches', C, 'members', 'ana'), { perfiles: ['pastor'] }));
    await assertFails(updateDoc(doc(ana(), 'churches', C, 'members', 'ana'), { role: 'colaborador' }));
  });
  it('la asistencia guarda si vino como regular, visita o colaborador', async () => {
    const r = (tipo) => setDoc(doc(ana(), 'churches', C, 'asistencia', 'ev1__juan'), { eventId: 'ev1', personKey: 'juan', date: '2026-11-29', at: 1, por: 'ana', tipo });
    await assertSucceeds(r('colaborador'));
    await assertSucceeds(r('visita'));
    await assertFails(r('pastor'));
  });
  it('el Administrador importa el historial: evento solo de asistencia, visita nueva y su asistencia', async () => {
    const db = ana();
    const b = writeBatch(db);
    b.set(doc(db, 'churches', C, 'events', 'pcoe-2025-11-23-escuela-dominical'), { name: 'Escuela dominical', date: '2025-11-23', time: '', items: [], notes: '', soloAsistencia: true, origen: 'Planning Center' }, { merge: true });
    b.set(doc(db, 'churches', C, 'people', 'pcoa-juan-nuevo'), { name: 'Juan Nuevo', nombre: 'Juan', apellido: 'Nuevo', uid: '', role: 'colaborador', tipo: 'Visita', estado: 'activo', miembro: false, esNino: false, creadoEn: 1, creadoPor: 'ana', primeraVisita: '2025-11-23' });
    await assertSucceeds(b.commit());
    await assertSucceeds(setDoc(doc(db, 'churches', C, 'asistencia', 'pcoe-2025-11-23-escuela-dominical__pcoa-juan-nuevo'), { eventId: 'pcoe-2025-11-23-escuela-dominical', personKey: 'pcoa-juan-nuevo', date: '2025-11-23', at: Date.parse('2025-11-23T12:00:00'), por: 'ana' }));
  });
  it('la asistencia queda firmada por quien marca y apunta a un evento y persona reales', async () => {
    await assertSucceeds(marca(ana(), 'ana'));
    await assertFails(marca(ana(), 'otro', 'ana'));
    await assertFails(setDoc(doc(ana(), 'churches', C, 'asistencia', 'ev9__juan'), { eventId: 'ev9', personKey: 'juan', at: 1, por: 'ana' }));
    await assertFails(marca(ana(), 'ana', 'nadie'));
  });
  it('quien marca asistencia registra una visita nueva, pero sin datos privados', async () => {
    await updateDoc(doc(ana(), 'churches', C, 'members', 'juan'), { perfiles: ['asisAdmin'] });
    await assertSucceeds(setDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v1'), { name: 'Pedro Soto', nombre: 'Pedro', apellido: 'Soto', uid: '', role: 'colaborador', tipo: 'Visita', creadoEn: 1 }));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v2'), { name: 'Pedro', uid: '', telefono: '9' }));
    await assertFails(setDoc(doc(cuenta('juan'), 'churches', C, 'people', 'v3'), { name: 'Pedro', uid: '', role: 'admin' }));
  });
});
