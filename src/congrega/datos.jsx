// Datos de Congrega: se apoyan en la misma iglesia de Adora (personas, eventos, miembros)
// y agregan familias, fichas privadas (solo Administrador) y asistencia.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useStore } from '../lib/store.jsx';

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

  const marcar = useCallback((event, key, presente) => {
    const r = ref('asistencia', asistenciaId(event.id, key));
    return presente ? setDoc(r, { eventId: event.id, personKey: key, date: event.date || '', at: Date.now(), por: myUid }) : deleteDoc(r);
  }, [ref, myUid]);

  const registrarVisita = useCallback(async ({ nombre, apellido }, event) => {
    const r = doc(collection(db, 'churches', churchId, 'people'));
    await setDoc(r, {
      name: `${nombre} ${apellido}`.trim().slice(0, 60), nombre, apellido, uid: '', role: 'colaborador', tipo: 'Visita', estado: 'activo',
      miembro: false, creadoEn: Date.now(), creadoPor: myUid, primeraVisita: event?.date || '',
    });
    if (event) await marcar(event, r.id, true);
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

  const habilitarAsistencia = useCallback((uid, si) => updateDoc(ref('members', uid), { asistencia: si }), [ref]);

  const value = useMemo(() => ({
    ...store, isAdmin, marca, familias, fichas, asistencia, listo, people,
    marcar, registrarVisita, guardarPersona, crearFamilia, eliminarPersona, habilitarAsistencia,
  }), [store, isAdmin, marca, familias, fichas, asistencia, listo, people, marcar, registrarVisita, guardarPersona, crearFamilia, eliminarPersona, habilitarAsistencia]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCongrega = () => useContext(Ctx);
