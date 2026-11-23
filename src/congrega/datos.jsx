// Datos de Congrega: se apoyan en la misma iglesia de Adora (personas, eventos, miembros)
// y agregan familias, fichas privadas (solo Administrador) y asistencia.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useStore } from '../lib/store.jsx';
import { fusionarDatos } from './importarPco.js';
import { ordenarUnion, personaUnida } from './unir.js';

const Ctx = createContext(null);

export const TIPOS = ['Activo', 'Regular', 'Ocasional', 'Visita'];
export const RANGOS = ['Bebé', 'Niño', 'Adolescente', 'Joven', 'Adulto', 'Adulto Mayor'];
export const CIVIL = ['Soltero/a', 'Casado/a', 'Novios / con pareja', 'Conviviente civil', 'Separado/a / Divorciado/a', 'Viudo/a'];
export const ROLES_FAMILIA = ['Contacto principal', 'Cónyuge', 'Hijo/a', 'Otro'];

export const activo = (p) => p.estado !== 'inactivo';
export const esMiembro = (p) => p.miembro === true;
export const nombreDe = (p) => (p ? ([p.nombre, p.apellido].filter(Boolean).join(' ') || p.name || 'Sin nombre') : '');
export const asistenciaId = (eventId, key) => `${eventId}__${key}`;
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CongregaProvider({ children }) {
  const store = useStore();
  const { churchId, role, myUid, people = [] } = store;
  const isAdmin = role === 'admin';
  const [miembro, setMiembro] = useState(null);
  const [familias, setFamilias] = useState(new Map());
  const [fichas, setFichas] = useState(new Map());
  const [asistencia, setAsistencia] = useState(new Map());
  const [listo, setListo] = useState({ familias: false, asistencia: false });

  useEffect(() => {
    if (!churchId || !myUid) return undefined;
    return onSnapshot(doc(db, 'churches', churchId, 'members', myUid), (s) => setMiembro(s.data() || null), () => setMiembro(null));
  }, [churchId, myUid]);
  const marca = role === 'admin' || role === 'director' || miembro?.asistencia === true;

  useEffect(() => {
    if (!churchId) return undefined;
    return onSnapshot(collection(db, 'churches', churchId, 'families'), (s) => {
      setFamilias(new Map(s.docs.map((d) => [d.id, { ...d.data(), id: d.id }])));
      setListo((l) => ({ ...l, familias: true }));
    }, () => setListo((l) => ({ ...l, familias: true })));
  }, [churchId]);
  useEffect(() => {
    if (!churchId || !isAdmin) { setFichas(new Map()); return undefined; }
    return onSnapshot(collection(db, 'churches', churchId, 'fichas'), (s) => setFichas(new Map(s.docs.map((d) => [d.id, d.data()]))), () => {});
  }, [churchId, isAdmin]);
  useEffect(() => {
    if (!churchId || !marca) { setAsistencia(new Map()); setListo((l) => ({ ...l, asistencia: true })); return undefined; }
    return onSnapshot(collection(db, 'churches', churchId, 'asistencia'), (s) => {
      setAsistencia(new Map(s.docs.map((d) => [d.id, d.data()])));
      setListo((l) => ({ ...l, asistencia: true }));
    }, () => setListo((l) => ({ ...l, asistencia: true })));
  }, [churchId, marca]);

  const ref = useCallback((...p) => doc(db, 'churches', churchId, ...p), [churchId]);

  const [sinTipo, setSinTipo] = useState(false); // las reglas publicadas todavía no aceptan el tipo
  const marcar = useCallback(async (event, key, presente, tipo, at) => {
    const r = ref('asistencia', asistenciaId(event.id, key));
    if (!presente) return deleteDoc(r);
    const base = { eventId: event.id, personKey: key, date: event.date || '', at: at || Date.now(), por: myUid };
    if (!tipo || sinTipo) return setDoc(r, base);
    try { await setDoc(r, { ...base, tipo }); } catch (e) {
      if (e?.code !== 'permission-denied') throw e;
      await setDoc(r, base); setSinTipo(true);
    }
    return undefined;
  }, [ref, myUid, sinTipo]);

  const registrarVisita = useCallback(async ({ nombre, apellido }, event) => {
    const r = doc(collection(db, 'churches', churchId, 'people'));
    await setDoc(r, {
      name: `${nombre} ${apellido}`.trim().slice(0, 60), nombre, apellido, uid: '', role: 'colaborador', tipo: 'Visita', estado: 'activo',
      miembro: false, creadoEn: Date.now(), creadoPor: myUid, primeraVisita: event?.date || '',
    });
    if (event) await marcar(event, r.id, true, 'visita');
    return r.id;
  }, [churchId, myUid, marcar]);

  /** Guarda la ficha visible y la privada de una persona (solo Administrador). key null = persona nueva. */
  const guardarPersona = useCallback(async (key, persona, ficha, cambios) => {
    const r = key ? ref('people', key) : doc(collection(db, 'churches', churchId, 'people'));
    const b = writeBatch(db);
    b.set(r, { ...persona, name: (persona.name || nombreDe(persona)).slice(0, 60), ...(key ? {} : { uid: '', role: 'colaborador', creadoEn: Date.now() }) }, { merge: true });
    const anterior = fichas.get(r.id) || {};
    b.set(ref('fichas', r.id), {
      ...ficha, actualizadoEn: Date.now(), actualizadoPor: myUid,
      cambios: [...(anterior.cambios || []), ...(cambios?.length ? [{ at: Date.now(), by: myUid, campos: cambios }] : [])].slice(-50),
    }, { merge: true });
    await b.commit();
    return r.id;
  }, [ref, churchId, fichas, myUid]);

  const crearFamilia = useCallback(async (name) => {
    const r = doc(collection(db, 'churches', churchId, 'families'));
    await setDoc(r, { name: name.slice(0, 60) });
    return r.id;
  }, [churchId]);

  const eliminarPersona = useCallback(async (key) => {
    const b = writeBatch(db);
    asistencia.forEach((a, id) => { if (a.personKey === key) b.delete(ref('asistencia', id)); });
    b.delete(ref('fichas', key));
    b.delete(ref('people', key));
    await b.commit();
  }, [asistencia, ref]);

  /** Une a personas repetidas en una sola (solo Administrador). `otras`: una key o una lista. Devuelve la key de quien queda. */
  const unirPersonas = useCallback(async (keyQueda, otras) => {
    const ahora = Date.now();
    let queda = people.find((p) => p.key === keyQueda);
    const fichaDe = (k) => fichas.get(k) || {};
    let ficha = fichaDe(queda.key);
    const unidas = [];
    for (const k of [].concat(otras)) {
      const orden = ordenarUnion(queda, people.find((p) => p.key === k));
      if (!orden) throw new Error('Dos de ellas tienen su propia cuenta; no se pueden unir.');
      const [q, o] = orden;
      const fq = q.key === queda.key ? ficha : fichaDe(q.key); const fo = o.key === queda.key ? ficha : fichaDe(o.key);
      const { cambios: c1 = [], ...restoQ } = fq; const { cambios: c2 = [], ...restoO } = fo;
      ficha = { ...fusionarDatos(restoO, restoQ), cambios: [...c1, ...c2, { at: ahora, by: myUid, campos: [`unida con ${nombreDe(o)}`] }].sort((x, y) => x.at - y.at).slice(-50) };
      queda = { ...personaUnida(q, o), key: q.key };
      unidas.push(o.key);
    }
    const { key: kq, ...persona } = queda;
    const b = writeBatch(db);
    b.set(ref('people', kq), persona);
    b.set(ref('fichas', kq), { ...ficha, actualizadoEn: ahora, actualizadoPor: myUid });
    await b.commit();
    // Asistencia y participaciones pasan a quien queda (una por una: las reglas revisan cada evento).
    const mover = [];
    const ya = new Set([...asistencia.values()].filter((a) => a.personKey === kq).map((a) => a.eventId));
    asistencia.forEach((a, id) => {
      if (!unidas.includes(a.personKey)) return;
      if (!ya.has(a.eventId)) { ya.add(a.eventId); mover.push(setDoc(ref('asistencia', asistenciaId(a.eventId, kq)), { ...a, personKey: kq, por: myUid })); }
      mover.push(deleteDoc(ref('asistencia', id)));
    });
    for (const k of unidas) {
      const parts = await getDocs(query(collection(db, 'churches', churchId, 'participations'), where('personKey', '==', k))).catch(() => null);
      parts?.docs.forEach((d) => {
        const x = d.data();
        mover.push(setDoc(ref('participations', `${x.eventId}__${kq}`), { ...x, personKey: kq, name: persona.name || nombreDe(persona) }, { merge: true }).then(() => deleteDoc(d.ref)));
      });
    }
    await Promise.all(mover);
    const b2 = writeBatch(db);
    unidas.forEach((k) => { b2.delete(ref('fichas', k)); b2.delete(ref('people', k)); });
    await b2.commit();
    return kq;
  }, [people, fichas, asistencia, ref, myUid, churchId]);

  const habilitarAsistencia = useCallback((uid, si) => updateDoc(ref('members', uid), { asistencia: si }), [ref]);

  const value = useMemo(() => ({
    ...store, isAdmin, marca, familias, fichas, asistencia, listo, people, sinTipo,
    marcar, registrarVisita, guardarPersona, crearFamilia, eliminarPersona, unirPersonas, habilitarAsistencia,
  }), [store, isAdmin, marca, familias, fichas, asistencia, listo, people, sinTipo, marcar, registrarVisita, guardarPersona, crearFamilia, eliminarPersona, unirPersonas, habilitarAsistencia]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCongrega = () => useContext(Ctx);
