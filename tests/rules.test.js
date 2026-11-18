// Pruebas de permisos contra el emulador de Firestore: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

let env;
const C = 'iglesia1';

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
    await setDoc(doc(db, 'churches', C), { name: 'Iglesia', code: 'GRACIA-1234', createdBy: 'ana' });
    await setDoc(doc(db, 'churchCodes', 'GRACIA-1234'), { churchId: C });
    await setDoc(doc(db, 'churches', C, 'members', 'ana'), { name: 'Ana', role: 'admin' });
    await setDoc(doc(db, 'churches', C, 'members', 'dir'), { name: 'Dir', role: 'director' });
    await setDoc(doc(db, 'churches', C, 'members', 'mus'), { name: 'Mus', role: 'musico' });
    await setDoc(doc(db, 'churches', C, 'songs', 's1'), { title: 'Santo' });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const song = (db, id = 's1') => doc(db, 'churches', C, 'songs', id);

describe('canciones', () => {
  it('todos los miembros ven canciones; los de afuera no', async () => {
    for (const u of ['ana', 'dir', 'mus']) await assertSucceeds(getDoc(song(as(u))));
    await assertFails(getDoc(song(as('extraño'))));
    await assertFails(getDoc(song(env.unauthenticatedContext().firestore())));
  });
  it('editar: admin y director sí, músico no', async () => {
    await assertSucceeds(updateDoc(song(as('ana')), { title: 'A' }));
    await assertSucceeds(setDoc(song(as('dir'), 's2'), { title: 'Nueva' }));
    await assertFails(updateDoc(song(as('mus')), { title: 'B' }));
  });
  it('eliminar: solo admin', async () => {
    await assertFails(deleteDoc(song(as('dir'))));
    await assertFails(deleteDoc(song(as('mus'))));
    await assertSucceeds(deleteDoc(song(as('ana'))));
  });
});

describe('eventos', () => {
  it('crear: admin y director sí, músico no', async () => {
    const ev = (db) => doc(db, 'churches', C, 'events', 'e1');
    await assertSucceeds(setDoc(ev(as('dir')), { name: 'Culto' }));
    await assertFails(setDoc(ev(as('mus')), { name: 'Culto' }));
  });
});

describe('usuarios', () => {
  const m = (db, uid) => doc(db, 'churches', C, 'members', uid);
  it('solo el admin cambia perfiles', async () => {
    await assertSucceeds(updateDoc(m(as('ana'), 'mus'), { role: 'director' }));
    await assertFails(updateDoc(m(as('dir'), 'mus'), { role: 'admin' }));
    await assertFails(updateDoc(m(as('mus'), 'mus'), { role: 'admin' }));
    await assertSucceeds(updateDoc(m(as('mus'), 'mus'), { name: 'Músico Uno' }));
  });
  it('unirse con el código correcto como músico', async () => {
    await assertSucceeds(setDoc(m(as('nuevo'), 'nuevo'), { name: 'Nuevo', role: 'musico', code: 'GRACIA-1234' }));
  });
  it('no se puede unir con código falso ni como admin', async () => {
    await assertFails(setDoc(m(as('x'), 'x'), { name: 'X', role: 'musico', code: 'FALSO-0000' }));
    await assertFails(setDoc(m(as('y'), 'y'), { name: 'Y', role: 'admin', code: 'GRACIA-1234' }));
    await assertFails(setDoc(m(as('z'), 'otro'), { name: 'Z', role: 'musico', code: 'GRACIA-1234' }));
  });
  it('crear una iglesia deja al creador como admin', async () => {
    const db = as('pedro');
    const b = writeBatch(db);
    b.set(doc(db, 'churches', 'nueva'), { name: 'Nueva', code: 'NUEVA-1111', createdBy: 'pedro' });
    b.set(doc(db, 'churchCodes', 'NUEVA-1111'), { churchId: 'nueva' });
    b.set(doc(db, 'churches', 'nueva', 'members', 'pedro'), { name: 'Pedro', role: 'admin' });
    await assertSucceeds(b.commit());
  });
  it('nadie se agrega como admin a una iglesia ajena', async () => {
    await assertFails(setDoc(doc(as('malo'), 'churches', C, 'members', 'malo'), { name: 'M', role: 'admin' }));
  });
});
