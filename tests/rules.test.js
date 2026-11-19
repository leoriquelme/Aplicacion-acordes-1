// Pruebas de permisos contra el emulador de Firestore: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env;
const C = 'psg';
const ADMIN = 'leonardo riquelme';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cancionero',
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
    await setDoc(doc(db, 'churches', C, 'people', 'carlos'), { name: 'Carlos', role: 'colaborador' });
    await setDoc(doc(db, 'churches', C, 'private', 'pins'), { pins: { dora: '55555555' } });
    await setDoc(doc(db, 'churches', C, 'songs', 's1'), { title: 'Santo' });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const enter = (uid, data) => setDoc(doc(as(uid), 'churches', C, 'sessions', uid), data);
const song = (db, id = 's1') => doc(db, 'churches', C, 'songs', id);
async function seedSessions() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'churches', C, 'sessions', 'u-admin'), { key: ADMIN, name: 'Leonardo', role: 'admin', pin: '12345678' });
    await setDoc(doc(db, 'churches', C, 'sessions', 'u-dora'), { key: 'dora', name: 'Dora', role: 'director', pin: '55555555' });
    await setDoc(doc(db, 'churches', C, 'sessions', 'u-carlos'), { key: 'carlos', name: 'Carlos', role: 'colaborador' });
  });
}

describe('entrar', () => {
  it('cualquiera entra como colaborador si la iglesia existe', async () => {
    await assertSucceeds(enter('u1', { key: 'juan', name: 'Juan', role: 'colaborador' }));
    await assertFails(setDoc(doc(as('u2'), 'churches', 'otra', 'sessions', 'u2'), { key: 'juan', name: 'Juan', role: 'colaborador' }));
  });
  it('administrador solo con su nombre y PIN', async () => {
    await assertSucceeds(enter('u1', { key: ADMIN, name: 'Leonardo Riquelme', role: 'admin', pin: '12345678' }));
    await assertFails(enter('u2', { key: ADMIN, name: 'Leonardo Riquelme', role: 'admin', pin: '00000000' }));
    await assertFails(enter('u3', { key: 'juan', name: 'Juan', role: 'admin', pin: '12345678' }));
  });
  it('director solo con PIN correcto y perfil asignado', async () => {
    await assertSucceeds(enter('u1', { key: 'dora', name: 'Dora', role: 'director', pin: '55555555' }));
    await assertFails(enter('u2', { key: 'dora', name: 'Dora', role: 'director', pin: '11111111' }));
    await assertFails(enter('u3', { key: 'carlos', name: 'Carlos', role: 'director', pin: '55555555' }));
  });
  it('nadie lee los PIN ni la ficha de la iglesia (salvo el admin)', async () => {
    await seedSessions();
    await assertFails(getDoc(doc(as('u-dora'), 'churches', C, 'private', 'pins')));
    await assertFails(getDoc(doc(as('u-admin'), 'churches', C, 'private', 'pins')));
    await assertFails(getDoc(doc(as('u-carlos'), 'churches', C)));
    await assertSucceeds(getDoc(doc(as('u-admin'), 'churches', C)));
  });
});

describe('permisos', () => {
  beforeEach(seedSessions);
  it('ver canciones: todos los que entraron; los de afuera no', async () => {
    for (const u of ['u-admin', 'u-dora', 'u-carlos']) await assertSucceeds(getDoc(song(as(u))));
    await assertFails(getDoc(song(as('extraño'))));
  });
  it('editar canciones y eventos: admin y director; colaborador no', async () => {
    await assertSucceeds(updateDoc(song(as('u-admin')), { title: 'A' }));
    await assertSucceeds(updateDoc(song(as('u-dora')), { title: 'B' }));
    await assertFails(updateDoc(song(as('u-carlos')), { title: 'C' }));
    await assertSucceeds(setDoc(doc(as('u-dora'), 'churches', C, 'events', 'e1'), { name: 'Culto' }));
    await assertFails(setDoc(doc(as('u-carlos'), 'churches', C, 'events', 'e2'), { name: 'Culto' }));
  });
  it('eliminar canciones: solo admin', async () => {
    await assertFails(deleteDoc(song(as('u-dora'))));
    await assertSucceeds(deleteDoc(song(as('u-admin'))));
  });
  it('si al director le quitan el perfil, pierde los permisos al instante', async () => {
    await assertSucceeds(updateDoc(doc(as('u-admin'), 'churches', C, 'people', 'dora'), { role: 'colaborador' }));
    await assertFails(updateDoc(song(as('u-dora')), { title: 'X' }));
  });
});

describe('usuarios', () => {
  beforeEach(seedSessions);
  const person = (db, key) => doc(db, 'churches', C, 'people', key);
  it('solo el admin cambia perfiles y PIN', async () => {
    await assertSucceeds(updateDoc(person(as('u-admin'), 'carlos'), { role: 'director' }));
    await assertSucceeds(setDoc(doc(as('u-admin'), 'churches', C, 'private', 'pins'), { pins: { carlos: '77777777' } }, { merge: true }));
    await assertFails(updateDoc(person(as('u-dora'), 'carlos'), { role: 'director' }));
    await assertFails(updateDoc(person(as('u-carlos'), 'carlos'), { role: 'admin' }));
  });
  it('cada uno actualiza su última visita, nada más', async () => {
    await assertSucceeds(updateDoc(person(as('u-carlos'), 'carlos'), { lastSeen: 5 }));
    await assertFails(updateDoc(person(as('u-carlos'), 'dora'), { lastSeen: 5 }));
  });
  it('al entrar por primera vez queda como colaborador', async () => {
    await enter('u-nuevo', { key: 'pedro', name: 'Pedro', role: 'colaborador' });
    await assertSucceeds(setDoc(person(as('u-nuevo'), 'pedro'), { name: 'Pedro', role: 'colaborador' }));
    await enter('u-otro', { key: 'luis', name: 'Luis', role: 'colaborador' });
    await assertFails(setDoc(person(as('u-otro'), 'luis2'), { name: 'Luis', role: 'colaborador' }));
    await assertFails(setDoc(person(as('u-otro'), 'luis'), { name: 'Luis', role: 'director' }));
  });
});

describe('participación en eventos', () => {
  beforeEach(async () => {
    await seedSessions();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'churches', C, 'events', 'e1'), { name: 'Culto', date: '2026-11-22' });
    });
  });
  const part = (db, id) => doc(db, 'churches', C, 'participations', id);
  const data = (personKey, extra = {}) => ({ eventId: 'e1', personKey, name: 'X', role: 'Bajo', group: 'instrumentos', date: '2026-11-22', ...extra });
  it('cada uno se inscribe a sí mismo, un registro por evento', async () => {
    await assertSucceeds(setDoc(part(as('u-carlos'), 'e1__carlos'), data('carlos')));
    await assertSucceeds(setDoc(part(as('u-carlos'), 'e1__carlos'), data('carlos', { role: 'Coro' })));
    await assertFails(setDoc(part(as('u-carlos'), 'e1__dora'), data('dora')));
    await assertFails(setDoc(part(as('u-carlos'), 'otro'), data('carlos')));
    await assertFails(setDoc(part(as('u-carlos'), 'e9__carlos'), data('carlos', { eventId: 'e9' })));
    await assertFails(setDoc(part(as('extraño'), 'e1__juan'), data('juan')));
  });
  it('quitarse: uno mismo o un director/admin', async () => {
    await assertSucceeds(setDoc(part(as('u-carlos'), 'e1__carlos'), data('carlos')));
    await assertSucceeds(setDoc(part(as('u-dora'), 'e1__dora'), data('dora')));
    await assertFails(deleteDoc(part(as('u-carlos'), 'e1__dora')));
    await assertSucceeds(deleteDoc(part(as('u-dora'), 'e1__carlos')));
    await assertSucceeds(deleteDoc(part(as('u-dora'), 'e1__dora')));
  });
});

describe('biblioteca compartida', () => {
  beforeEach(seedSessions);
  const lib = (db, id) => doc(db, 'library', id);
  const data = (extra = {}) => ({ churchId: C, churchName: 'PSG', songId: 's1', title: 'Santo', author: '', key: 'G', content: '[G]Santo', confirmed: true, sharedBy: 'Dora', ...extra });
  it('solo director o admin comparte, y debe confirmar el permiso', async () => {
    await assertSucceeds(setDoc(lib(as('u-dora'), `${C}__s1`), data()));
    await assertFails(setDoc(lib(as('u-carlos'), `${C}__s2`), data({ songId: 's2' })));
    await assertFails(setDoc(lib(as('u-admin'), `${C}__s3`), data({ songId: 's3', confirmed: false })));
    await assertFails(setDoc(lib(as('u-admin'), 'otra__s1'), data({ churchId: 'otra' })));
  });
  it('todos los que entraron pueden leer; solo la iglesia que compartió la quita', async () => {
    await assertSucceeds(setDoc(lib(as('u-admin'), `${C}__s1`), data()));
    await assertSucceeds(getDoc(lib(as('u-carlos'), `${C}__s1`)));
    await assertFails(deleteDoc(lib(as('u-carlos'), `${C}__s1`)));
    await assertSucceeds(deleteDoc(lib(as('u-dora'), `${C}__s1`)));
  });
});

describe('favoritas', () => {
  beforeEach(seedSessions);
  const fav = (db, key) => doc(db, 'churches', C, 'favorites', key);
  it('cada uno ve y cambia solo las suyas', async () => {
    await assertSucceeds(setDoc(fav(as('u-carlos'), 'carlos'), { songs: ['s1'] }));
    await assertSucceeds(getDoc(fav(as('u-carlos'), 'carlos')));
    await assertFails(getDoc(fav(as('u-dora'), 'carlos')));
    await assertFails(getDoc(fav(as('u-admin'), 'carlos')));
    await assertFails(setDoc(fav(as('u-carlos'), 'dora'), { songs: [] }));
    await assertFails(setDoc(fav(as('u-carlos'), 'carlos'), { songs: [], otro: 1 }));
  });
});

describe('sugerencias', () => {
  beforeEach(seedSessions);
  const sug = (db, id) => doc(db, 'churches', C, 'suggestions', id);
  const data = (personKey, extra = {}) => ({ text: 'Falta un acorde', songId: '', songTitle: '', personKey, name: 'Carlos', at: 1, ...extra });
  it('todos envían; solo el admin lee y resuelve', async () => {
    await assertSucceeds(setDoc(sug(as('u-carlos'), 'x1'), data('carlos')));
    await assertFails(setDoc(sug(as('u-carlos'), 'x2'), data('dora')));
    await assertFails(setDoc(sug(as('u-carlos'), 'x3'), data('carlos', { text: '' })));
    await assertFails(setDoc(sug(as('extraño'), 'x4'), data('carlos')));
    await assertFails(getDoc(sug(as('u-carlos'), 'x1')));
    await assertFails(getDoc(sug(as('u-dora'), 'x1')));
    await assertSucceeds(getDoc(sug(as('u-admin'), 'x1')));
    await assertFails(deleteDoc(sug(as('u-dora'), 'x1')));
    await assertFails(updateDoc(sug(as('u-admin'), 'x1'), { text: 'otro' }));
    await assertSucceeds(deleteDoc(sug(as('u-admin'), 'x1')));
  });
});

describe('perfil y equipos', () => {
  beforeEach(seedSessions);
  const person = (db, key) => doc(db, 'churches', C, 'people', key);
  it('cada uno cambia su nombre y sus equipos, no los de otros', async () => {
    await assertSucceeds(updateDoc(person(as('u-carlos'), 'carlos'), { name: 'Carlos Soto', teams: ['Bajo', 'Danza'] }));
    await assertFails(updateDoc(person(as('u-carlos'), 'carlos'), { name: '' }));
    await assertFails(updateDoc(person(as('u-carlos'), 'carlos'), { role: 'director' }));
    await assertFails(updateDoc(person(as('u-carlos'), 'dora'), { teams: ['Coro'] }));
  });
});

describe('contador de oraciones', () => {
  beforeEach(seedSessions);
  const ref = (db) => doc(db, 'stats', 'oracion');
  it('cualquiera que entró suma de a uno', async () => {
    await assertSucceeds(setDoc(ref(as('u-carlos')), { count: 1 }));
    await assertSucceeds(setDoc(ref(as('u-dora')), { count: 2 }));
    await assertFails(setDoc(ref(as('u-dora')), { count: 10 }));
    await assertFails(setDoc(ref(as('u-dora')), { count: 1 }));
    await assertSucceeds(getDoc(ref(as('u-carlos'))));
    await assertFails(setDoc(ref(env.unauthenticatedContext().firestore()), { count: 3 }));
  });
});

describe('código de acceso', () => {
  beforeEach(seedSessions);
  it('solo el admin pone el código, y no puede cambiar otra cosa', async () => {
    await assertSucceeds(updateDoc(doc(as('u-admin'), 'churches', C), { accessCode: 'ABCDEF' }));
    await assertFails(updateDoc(doc(as('u-admin'), 'churches', C), { adminPin: '00000000' }));
    await assertFails(updateDoc(doc(as('u-dora'), 'churches', C), { accessCode: 'XYZXYZ' }));
    await assertFails(updateDoc(doc(as('u-carlos'), 'churches', C), { accessCode: 'XYZXYZ' }));
  });
  it('con código, el colaborador necesita el código correcto', async () => {
    await updateDoc(doc(as('u-admin'), 'churches', C), { accessCode: 'ABCDEF' });
    await assertFails(enter('u1', { key: 'juan', name: 'Juan', role: 'colaborador' }));
    await assertFails(enter('u2', { key: 'juan', name: 'Juan', role: 'colaborador', code: 'MALO12' }));
    await assertSucceeds(enter('u3', { key: 'juan', name: 'Juan', role: 'colaborador', code: 'ABCDEF' }));
    // El admin entra con su PIN aunque no ponga código.
    await assertSucceeds(enter('u4', { key: ADMIN, name: 'Leonardo Riquelme', role: 'admin', pin: '12345678' }));
  });
});

describe('notas propias', () => {
  beforeEach(seedSessions);
  it('cada uno guarda sus notas junto a sus favoritas', async () => {
    const fav = (u, k) => doc(as(u), 'churches', C, 'favorites', k);
    await assertSucceeds(setDoc(fav('u-carlos', 'carlos'), { notes: { s1: [{ section: 'CORO', note: 'suave' }] } }, { merge: true }));
    await assertSucceeds(setDoc(fav('u-carlos', 'carlos'), { songs: ['s1'] }, { merge: true }));
    await assertFails(setDoc(fav('u-carlos', 'carlos'), { otra: 1 }, { merge: true }));
    await assertFails(setDoc(fav('u-carlos', 'dora'), { notes: {} }, { merge: true }));
  });
  it('las notas del director van en la canción', async () => {
    await assertSucceeds(updateDoc(song(as('u-dora')), { notes: [{ section: 'CORO', note: 'fuerte' }] }));
    await assertFails(updateDoc(song(as('u-carlos')), { notes: [] }));
  });
});

describe('seguridad: nombres con PIN y sesiones viejas', () => {
  beforeEach(seedSessions);
  const fav = (u, k) => doc(as(u), 'churches', C, 'favorites', k);
  it('un nombre de director o administrador no entra como colaborador', async () => {
    await assertFails(enter('x1', { key: ADMIN, name: 'Leonardo Riquelme', role: 'colaborador' }));
    await assertFails(enter('x2', { key: 'dora', name: 'Dora', role: 'colaborador' }));
    await assertSucceeds(enter('x3', { key: 'carlos', name: 'Carlos', role: 'colaborador' }));
  });
  it('una sesión vieja de colaborador con el nombre del admin no ve sus notas', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'churches', C, 'sessions', 'x-falso'), { key: ADMIN, name: 'Leo', role: 'colaborador' });
      await setDoc(doc(ctx.firestore(), 'churches', C, 'favorites', ADMIN), { notes: { s1: ['secreto'] } });
    });
    await assertFails(getDoc(fav('x-falso', ADMIN)));
    await assertFails(getDoc(song(as('x-falso'))));
    await assertSucceeds(getDoc(fav('u-admin', ADMIN)));
  });
  it('PIN corto (menos de 8) no sirve', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'churches', C, 'people', 'eva'), { name: 'Eva', role: 'director' });
      await setDoc(doc(ctx.firestore(), 'churches', C, 'private', 'pins'), { pins: { dora: '55555555', eva: '1234' } });
    });
    await assertFails(enter('x1', { key: 'eva', name: 'Eva', role: 'director', pin: '1234' }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'churches', C), { adminPin: '1234' });
    });
    await assertFails(enter('x2', { key: ADMIN, name: 'Leonardo', role: 'admin', pin: '1234' }));
  });
  it('el PIN del admin también puede estar guardado como número', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'churches', C), { adminPin: 12345678 });
    });
    await assertSucceeds(enter('x1', { key: ADMIN, name: 'Leonardo', role: 'admin', pin: 12345678 }));
    await assertSucceeds(getDoc(song(as('x1'))));
  });
  it('si cambia el PIN del director, su sesión vieja deja de servir', async () => {
    await assertSucceeds(getDoc(song(as('u-dora'))));
    await assertSucceeds(setDoc(doc(as('u-admin'), 'churches', C, 'private', 'pins'), { pins: { dora: '99999999' } }, { merge: true }));
    await assertFails(getDoc(song(as('u-dora'))));
  });
  it('si cambia el PIN del admin, su sesión vieja deja de servir', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'churches', C), { adminPin: '87654321' });
    });
    await assertFails(getDoc(song(as('u-admin'))));
  });
  it('si se pone o cambia el código de acceso, los colaboradores vuelven a entrar', async () => {
    await assertSucceeds(getDoc(song(as('u-carlos'))));
    await assertSucceeds(updateDoc(doc(as('u-admin'), 'churches', C), { accessCode: 'ABCDEF' }));
    await assertFails(getDoc(song(as('u-carlos'))));
    await assertSucceeds(getDoc(song(as('u-dora'))));
  });
  it('si a un colaborador lo hacen director, entra con su PIN', async () => {
    await assertSucceeds(updateDoc(doc(as('u-admin'), 'churches', C, 'people', 'carlos'), { role: 'director' }));
    await assertFails(getDoc(song(as('u-carlos'))));
  });
});

describe('límites de tamaño', () => {
  beforeEach(seedSessions);
  it('sugerencias: el nombre es el de quien entró y sin campos extra', async () => {
    const sug = (id) => doc(as('u-carlos'), 'churches', C, 'suggestions', id);
    const ok = { text: 'Hola', songId: '', songTitle: '', personKey: 'carlos', name: 'Carlos', at: 1 };
    await assertSucceeds(setDoc(sug('a'), ok));
    await assertFails(setDoc(sug('b'), { ...ok, name: 'Dora' }));
    await assertFails(setDoc(sug('c'), { ...ok, extra: 'x'.repeat(1000) }));
  });
  it('inscripciones sin campos extra', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'churches', C, 'events', 'e1'), { name: 'Culto', date: '2026-11-22' });
    });
    const d = { eventId: 'e1', personKey: 'carlos', name: 'Carlos', role: 'Bajo', group: 'instrumentos', date: '2026-11-22', at: 1 };
    const ref = doc(as('u-carlos'), 'churches', C, 'participations', 'e1__carlos');
    await assertSucceeds(setDoc(ref, d));
    await assertFails(setDoc(ref, { ...d, basura: 'x' }));
  });
  it('canciones de hasta 50.000 letras', async () => {
    await assertSucceeds(updateDoc(song(as('u-dora')), { content: 'a'.repeat(1000) }));
    await assertFails(updateDoc(song(as('u-dora')), { content: 'a'.repeat(60000) }));
  });
});
