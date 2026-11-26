// Datos de Congrega: se apoyan en la misma iglesia de Adora (personas, eventos, miembros)
// y agregan familias, fichas privadas (Administrador y Pastor), notas sensibles aparte y asistencia.
// Qué ve cada uno lo decide permisos.js (y lo hacen cumplir las reglas de Firebase).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, deleteField, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useStore } from '../lib/store.jsx';
import { fusionarDatos } from './importarPco.js';
import { compararPerfiles, ordenarUnion, personaUnida } from './unir.js';
import { permisosDe } from './permisos.js';
import { registrar, useEquipoEstacion } from './estacion.jsx';

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
  const { churchId, role, myUid, people = [], misPerfiles = [], church, me } = store;
  const equipo = useEquipoEstacion(churchId);
  const perms = useMemo(() => permisosDe({ role, perfiles: misPerfiles, enEquipo: equipo.get(myUid)?.estado === 'aceptado', esDueno: church?.ownerUid === myUid }),
    [role, misPerfiles, equipo, myUid, church?.ownerUid]);
  const { admin: isAdmin, marca, verPrivado, verAsistencia } = perms;
  const [familias, setFamilias] = useState(new Map());
  const [fichas, setFichas] = useState(new Map());
  const [notas, setNotas] = useState(new Map());
  const [asistencia, setAsistencia] = useState(new Map());
  const [cuentas, setCuentas] = useState(new Map());
  const [listo, setListo] = useState({ familias: false, asistencia: false });
  const anotar = useCallback((accion, persona, detalle) => registrar(churchId, myUid, me?.name, accion, persona, detalle), [churchId, myUid, me?.name]);

  useEffect(() => {
    if (!churchId) return undefined;
    return onSnapshot(collection(db, 'churches', churchId, 'families'), (s) => {
      setFamilias(new Map(s.docs.map((d) => [d.id, { ...d.data(), id: d.id }])));
      setListo((l) => ({ ...l, familias: true }));
    }, () => setListo((l) => ({ ...l, familias: true })));
  }, [churchId]);
  // Fichas privadas: Administrador y Pastor ven todas; los demás, solo la suya.
  useEffect(() => {
    if (!churchId || !myUid) { setFichas(new Map()); return undefined; }
    if (!verPrivado) return onSnapshot(doc(db, 'churches', churchId, 'fichas', myUid), (s) => setFichas(new Map(s.exists() ? [[myUid, s.data()]] : [])), () => setFichas(new Map()));
    return onSnapshot(collection(db, 'churches', churchId, 'fichas'), (s) => setFichas(new Map(s.docs.map((d) => [d.id, d.data()]))), () => {});
  }, [churchId, verPrivado, myUid]);
  // Notas pastorales y de salud (datos sensibles): solo Administrador y Pastor.
  useEffect(() => {
    if (!churchId || !verPrivado) { setNotas(new Map()); return undefined; }
    return onSnapshot(collection(db, 'churches', churchId, 'notas'), (s) => setNotas(new Map(s.docs.map((d) => [d.id, d.data()]))), () => setNotas(new Map()));
  }, [churchId, verPrivado]);
  // Con qué cuenta de Google entró cada uno: solo Administrador y Pastor.
  useEffect(() => {
    if (!churchId || !verPrivado) { setCuentas(new Map()); return undefined; }
    return onSnapshot(collection(db, 'churches', churchId, 'cuentas'), (s) => setCuentas(new Map(s.docs.map((d) => [d.id, d.data()]))), () => setCuentas(new Map()));
  }, [churchId, verPrivado]);
  // Una sola vez: las notas que todavía estén dentro de la ficha pasan a notas/ (aparte), y el cumpleaños
  // y aniversario (día y mes) quedan en la ficha visible, para avisarlos en la estación.
  useEffect(() => {
    if (!isAdmin || !fichas.size) return;
    const b = writeBatch(db); let n = 0;
    fichas.forEach((f, k) => {
      if (n > 400) return;
      if (f.notas != null || f.notasMedicas != null) {
        const nota = { ...(notas.get(k) || {}) };
        if (f.notas) nota.notas = [nota.notas, f.notas].filter(Boolean).join('\n\n').slice(0, 5000);
        if (f.notasMedicas) nota.notasMedicas = [nota.notasMedicas, f.notasMedicas].filter(Boolean).join('\n\n').slice(0, 3000);
        if (nota.notas || nota.notasMedicas) b.set(doc(db, 'churches', churchId, 'notas', k), nota);
        b.update(doc(db, 'churches', churchId, 'fichas', k), { notas: deleteField(), notasMedicas: deleteField() }); n += 2;
      }
      const p = people.find((x) => x.key === k);
      if (!p) return;
      const cambio = {};
      if (f.motivoInactivo === 'Fallecido/a' && p.estado !== 'inactivo') cambio.estado = 'inactivo'; // quien falleció queda inactivo
      if (/^\d{4}-\d{2}-\d{2}$/.test(f.fechaNacimiento || '') && !p.birthday) cambio.birthday = f.fechaNacimiento.slice(5);
      if (/^\d{4}-\d{2}-\d{2}$/.test(f.aniversario || '') && p.aniversarioMD !== f.aniversario.slice(5)) cambio.aniversarioMD = f.aniversario.slice(5);
      if (Object.keys(cambio).length) { b.update(doc(db, 'churches', churchId, 'people', k), cambio); n++; }
    });
    if (n) b.commit().catch(() => {});
  }, [isAdmin, fichas, notas, people, churchId]);
  useEffect(() => {
    if (!churchId || !verAsistencia) { setAsistencia(new Map()); setListo((l) => ({ ...l, asistencia: true })); return undefined; }
    return onSnapshot(collection(db, 'churches', churchId, 'asistencia'), (s) => {
      setAsistencia(new Map(s.docs.map((d) => [d.id, d.data()])));
      setListo((l) => ({ ...l, asistencia: true }));
    }, () => setListo((l) => ({ ...l, asistencia: true })));
  }, [churchId, verAsistencia]);

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

  /**
   * Guarda una persona: la ficha visible (solo Administrador), la privada y las notas (Administrador y Pastor).
   * key null = persona nueva. `persona` null = no se toca la ficha visible.
   */
  const guardarPersona = useCallback(async (key, persona, ficha, cambios) => {
    const r = key ? ref('people', key) : doc(collection(db, 'churches', churchId, 'people'));
    const b = writeBatch(db);
    if (persona && isAdmin) b.set(r, { ...persona, name: (persona.name || nombreDe(persona)).slice(0, 60), ...(key ? {} : { uid: '', role: 'colaborador', creadoEn: Date.now() }) }, { merge: true });
    const anterior = fichas.get(r.id) || {};
    const { notas: n1, notasMedicas: n2, ...resto } = ficha;
    b.set(ref('fichas', r.id), {
      ...resto, actualizadoEn: Date.now(), actualizadoPor: myUid,
      cambios: [...(anterior.cambios || []), ...(cambios?.length ? [{ at: Date.now(), by: myUid, campos: cambios }] : [])].slice(-50),
    }, { merge: true });
    if (n1 !== undefined || n2 !== undefined) b.set(ref('notas', r.id), { notas: String(n1 || '').slice(0, 5000), notasMedicas: String(n2 || '').slice(0, 3000) });
    await b.commit();
    const quien = persona ? nombreDe(persona) : nombreDe(people.find((p) => p.key === r.id));
    anotar(key ? 'Editó una ficha' : 'Agregó una persona', quien, (cambios || []).join(', '));
    return r.id;
  }, [ref, churchId, fichas, myUid, isAdmin, people, anotar]);

  /** Cada persona actualiza sus propios datos de contacto y su consentimiento (fichas/{su uid}). */
  const guardarMisDatos = useCallback(async (datos, cambios) => {
    const anterior = fichas.get(myUid) || {};
    await setDoc(ref('fichas', myUid), {
      ...datos, actualizadoEn: Date.now(), actualizadoPor: myUid,
      cambios: [...(anterior.cambios || []), ...(cambios?.length ? [{ at: Date.now(), by: myUid, campos: cambios }] : [])].slice(-50),
    }, { merge: true });
    anotar('Actualizó sus datos', me?.name, (cambios || []).join(', '));
  }, [fichas, myUid, ref, anotar, me?.name]);

  const crearFamilia = useCallback(async (name) => {
    const r = doc(collection(db, 'churches', churchId, 'families'));
    await setDoc(r, { name: name.slice(0, 60) });
    return r.id;
  }, [churchId]);

  const eliminarPersona = useCallback(async (key) => {
    const persona = people.find((p) => p.key === key);
    const raiz = ['churches', churchId];
    const memberRef = ref('members', key);
    const [member, asistencias, participaciones, turnos] = await Promise.all([
      persona?.uid ? getDoc(memberRef) : Promise.resolve(null),
      getDocs(query(collection(db, ...raiz, 'asistencia'), where('personKey', '==', key))),
      getDocs(query(collection(db, ...raiz, 'participations'), where('personKey', '==', key))),
      persona?.uid ? getDocs(query(collection(db, ...raiz, 'turnosEstacion'), where('uid', '==', key))) : Promise.resolve({ docs: [] }),
    ]);
    const dependencias = [
      ...asistencias.docs.map((d) => d.ref),
      ...participaciones.docs.map((d) => d.ref),
      ...turnos.docs.map((d) => d.ref),
    ];
    // Mantén la membresía hasta que se borren los registros dependientes: las reglas
    // validan cada operación contra el permiso actual del Administrador.
    while (dependencias.length > 400) {
      const lote = writeBatch(db);
      dependencias.splice(0, 400).forEach((r) => lote.delete(r));
      await lote.commit();
    }
    const lote = writeBatch(db);
    dependencias.forEach((r) => lote.delete(r));
    lote.delete(ref('fichas', key));
    lote.delete(ref('notas', key));
    lote.delete(ref('people', key));
    if (persona?.uid) {
      if (member?.exists()) lote.delete(memberRef);
      lote.delete(ref('cuentas', key));
      lote.delete(ref('equipoEstacion', key));
    }
    await lote.commit();
    anotar('Eliminó una persona', nombreDe(persona));
  }, [asistencia, ref, anotar, people, churchId]);

  /**
   * Une a personas repetidas en una sola (solo Administrador), sacando lo mejor de cada una:
   * lo que le falta a una se completa con la otra y, donde las dos tienen un dato distinto, se usa
   * `elecciones[campo]` o, si no se eligió, el más completo. Queda la que entró con Google.
   * `otras`: una key o una lista. Devuelve la key de quien queda.
   */
  const unirPersonas = useCallback(async (keyQueda, otras, elecciones = {}) => {
    const ahora = Date.now();
    let queda = people.find((p) => p.key === keyQueda);
    const fichaDe = (k) => fichas.get(k) || {};
    let ficha = fichaDe(queda.key);
    let nota = { ...(notas.get(queda.key) || {}) };
    const unidas = [];
    for (const k of [].concat(otras)) {
      const orden = ordenarUnion(queda, people.find((p) => p.key === k));
      if (!orden) throw new Error('Dos de ellas tienen su propia cuenta; no se pueden unir.');
      const [q, o] = orden;
      const fq = q.key === queda.key ? ficha : fichaDe(q.key); const fo = o.key === queda.key ? ficha : fichaDe(o.key);
      const { cambios: c1 = [], ...restoQ } = fq; const { cambios: c2 = [], ...restoO } = fo;
      ficha = { ...fusionarDatos(restoO, restoQ), cambios: [...c1, ...c2, { at: ahora, by: myUid, campos: [`unida con ${nombreDe(o)}`] }].sort((x, y) => x.at - y.at).slice(-50) };
      const distintos = compararPerfiles(q, o, restoQ, restoO).filter((x) => x.estado === 'distinto');
      const no = notas.get(o.key) || {};
      nota = { notas: [nota.notas, no.notas].filter(Boolean).join('\n\n').slice(0, 5000), notasMedicas: [nota.notasMedicas, no.notasMedicas].filter(Boolean).join('\n\n').slice(0, 3000) };
      queda = { ...personaUnida(q, o), key: q.key };
      distintos.forEach((x) => {
        const v = Object.prototype.hasOwnProperty.call(elecciones, x.campo) ? elecciones[x.campo] : x.elegido;
        if (x.donde === 'ficha') ficha[x.campo] = v; else queda[x.campo] = v;
      });
      unidas.push(o.key);
    }
    const { key: kq, ...persona } = queda;
    const b = writeBatch(db);
    b.set(ref('people', kq), persona);
    b.set(ref('fichas', kq), { ...ficha, actualizadoEn: ahora, actualizadoPor: myUid });
    if (nota.notas || nota.notasMedicas) b.set(ref('notas', kq), nota);
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
    unidas.forEach((k) => { b2.delete(ref('fichas', k)); b2.delete(ref('notas', k)); b2.delete(ref('people', k)); });
    await b2.commit();
    anotar('Unió perfiles', nombreDe(persona), `${unidas.length + 1} fichas en una`);
    return kq;
  }, [people, fichas, notas, asistencia, ref, myUid, churchId, anotar]);

  /** Aplica una sugerencia del Inicio (tipo de asistencia o rango de edad). Administrador o Administrativo de asistencia. */
  const aplicarCambio = useCallback(async (p, cambio) => {
    await setDoc(ref('people', p.key), cambio, { merge: true });
    anotar('Aplicó una sugerencia', nombreDe(p), Object.entries(cambio).map(([k, v]) => `${k}: ${v}`).join(', '));
  }, [ref, anotar]);

  /** Cambia el perfil principal y los perfiles extra de alguien con cuenta. */
  const cambiarPerfiles = useCallback(async (uid, nuevoRol, perfiles) => {
    const b = writeBatch(db);
    b.update(ref('members', uid), { role: nuevoRol, perfiles });
    if (uid !== myUid) b.update(ref('people', uid), { role: nuevoRol });
    await b.commit();
    anotar('Cambió perfiles', nombreDe(people.find((p) => p.key === uid)), [nuevoRol, ...perfiles].join(', '));
  }, [ref, myUid, anotar, people]);

  const value = useMemo(() => ({
    ...store, ...perms, isAdmin, marca, familias, fichas, notas, asistencia, cuentas, listo, people, sinTipo, equipo, anotar,
    marcar, registrarVisita, guardarPersona, guardarMisDatos, crearFamilia, eliminarPersona, unirPersonas, cambiarPerfiles, aplicarCambio,
  }), [store, perms, isAdmin, marca, familias, fichas, notas, asistencia, cuentas, listo, people, sinTipo, equipo, anotar, marcar, registrarVisita, guardarPersona, guardarMisDatos, crearFamilia, eliminarPersona, unirPersonas, cambiarPerfiles, aplicarCambio]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCongrega = () => useContext(Ctx);
