// Equipo de estación (Encargados de asistencia) y sus turnos.
// equipoEstacion/{uid}: { estado: 'invitado' | 'aceptado', por, at, nombre }
// turnosEstacion/{evento__uid}: { eventId, uid, nombre, date, estado: 'ofrecido' | 'aprobado', at, por }
// Funciona dentro y fuera de Congrega (también se usa en el Inicio de Adora).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useStore } from '../lib/store.jsx';
import { formatLong, sortEvents, todayISO } from '../lib/dates.js';
import { permisosDe } from './permisos.js';
import './congrega.css';

const col = (c, n) => collection(db, 'churches', c, n);
export const turnoId = (eventId, uid) => `${eventId}__${uid}`;

/** Equipo de estación de la iglesia: Map uid → { estado, por, at, nombre }. */
export function useEquipoEstacion(churchId) {
  const [equipo, setEquipo] = useState(new Map());
  useEffect(() => {
    if (!churchId) return undefined;
    return onSnapshot(col(churchId, 'equipoEstacion'), (s) => setEquipo(new Map(s.docs.map((d) => [d.id, d.data()]))), () => setEquipo(new Map()));
  }, [churchId]);
  return equipo;
}

/** Turnos de estación: todos (Administrador o Administrativo) o solo los míos. Map id → turno. */
export function useTurnos(churchId, myUid, todos, activo = true) {
  const [turnos, setTurnos] = useState(new Map());
  useEffect(() => {
    if (!churchId || !myUid || !activo) { setTurnos(new Map()); return undefined; }
    const q = todos ? col(churchId, 'turnosEstacion') : query(col(churchId, 'turnosEstacion'), where('uid', '==', myUid));
    return onSnapshot(q, (s) => setTurnos(new Map(s.docs.map((d) => [d.id, { ...d.data(), id: d.id }]))), () => setTurnos(new Map()));
  }, [churchId, myUid, todos, activo]);
  return turnos;
}

/** Anota un cambio en el registro (lo lee solo el Súper admin). Nunca hace fallar la acción. */
export function registrar(churchId, myUid, nombre, accion, persona = '', detalle = '') {
  if (!churchId || !myUid) return Promise.resolve();
  return addDoc(col(churchId, 'registro'), {
    at: Date.now(), uid: myUid, nombre: String(nombre || '').slice(0, 60), accion: String(accion).slice(0, 60),
    persona: String(persona || '').slice(0, 80), detalle: String(detalle || '').slice(0, 300),
  }).catch(() => {});
}

export const estacion = {
  invitar: (c, uid, nombre, por) => setDoc(doc(db, 'churches', c, 'equipoEstacion', uid), { estado: 'invitado', por, at: Date.now(), nombre: String(nombre || '').slice(0, 60) }),
  quitar: (c, uid) => deleteDoc(doc(db, 'churches', c, 'equipoEstacion', uid)),
  aceptar: (c, uid) => updateDoc(doc(db, 'churches', c, 'equipoEstacion', uid), { estado: 'aceptado', at: Date.now() }),
  ofrecer: (c, ev, uid, nombre, estado = 'ofrecido', por = '') => setDoc(doc(db, 'churches', c, 'turnosEstacion', turnoId(ev.id, uid)), {
    eventId: ev.id, uid, nombre: String(nombre || '').slice(0, 60), date: ev.date || '', estado, at: Date.now(), ...(por ? { por } : {}),
  }),
  aprobar: (c, id, por) => updateDoc(doc(db, 'churches', c, 'turnosEstacion', id), { estado: 'aprobado', at: Date.now(), por }),
  quitarTurno: (c, id) => deleteDoc(doc(db, 'churches', c, 'turnosEstacion', id)),
};

/** Eventos de hoy en adelante (próximas 3 semanas). */
export function proximosEventos(events, hoy = todayISO()) {
  const hasta = new Date(`${hoy}T12:00:00`); hasta.setDate(hasta.getDate() + 21);
  const lim = hasta.toISOString().slice(0, 10);
  return sortEvents(events.filter((e) => e.date && e.date >= hoy && e.date <= lim && !e.soloAsistencia), 1);
}

/**
 * Avisos de la estación para el Inicio:
 * - invitación a tomar asistencia (aceptar o no),
 * - a quien está en el equipo: servicios próximos para ofrecerse,
 * - al Administrador y al Administrativo de asistencia: ofrecimientos por aprobar.
 */
export function AvisosEstacion() {
  const { mode, churchId, myUid, role, misPerfiles = [], church, events = [], me } = useStore();
  const equipo = useEquipoEstacion(mode === 'cloud' ? churchId : null);
  const mio = equipo.get(myUid);
  const p = permisosDe({ role, perfiles: misPerfiles, enEquipo: mio?.estado === 'aceptado', esDueno: church?.ownerUid === myUid });
  const turnos = useTurnos(churchId, myUid, p.asisAdmin, mode === 'cloud' && (p.asisAdmin || Boolean(mio)));
  const [error, setError] = useState('');
  const hoy = todayISO();
  const proximos = useMemo(() => proximosEventos(events, hoy), [events, hoy]);
  if (mode !== 'cloud' || !churchId) return null;
  const falla = (e) => setError(`No se pudo: ${e.message}`);
  const nombre = me?.name || '';
  const porAprobar = p.asisAdmin ? [...turnos.values()].filter((t) => t.estado === 'ofrecido' && (t.date || '') >= hoy) : [];
  const libres = mio?.estado === 'aceptado' ? proximos.filter((e) => !turnos.has(turnoId(e.id, myUid))).slice(0, 2) : [];
  if (mio?.estado !== 'invitado' && !porAprobar.length && !libres.length) return null;
  const quienInvita = mio?.por && mio.por !== myUid ? 'Te invitaron' : 'Te invitamos';

  return (
    <section className="card bloque-propuestas cg-avisos-estacion">
      {mio?.estado === 'invitado' && (
        <div className="cg-stack">
          <h2>📋 {quienInvita} a tomar asistencia</h2>
          <p className="muted">Serías parte del equipo de estación: te ofreces para un servicio y, si se aprueba, marcas quién llegó ese día desde la Estación.</p>
          <div className="cg-row">
            <button type="button" className="btn primary" onClick={() => estacion.aceptar(churchId, myUid).then(() => registrar(churchId, myUid, nombre, 'Aceptó el equipo de estación')).catch(falla)}>Acepto</button>
            <button type="button" className="btn ghost" onClick={() => estacion.quitar(churchId, myUid).catch(falla)}>Ahora no</button>
          </div>
        </div>
      )}
      {libres.map((ev) => (
        <div key={ev.id} className="cg-row cg-entre">
          <span><strong>¿Tomas asistencia?</strong><br /><span className="muted">{ev.name || 'Servicio'} · {formatLong(ev.date)}</span></span>
          <button type="button" className="btn small primary" onClick={() => estacion.ofrecer(churchId, ev, myUid, nombre).catch(falla)}>Me ofrezco</button>
        </div>
      ))}
      {porAprobar.length > 0 && (
        <div className="cg-row cg-entre">
          <span><strong>{porAprobar.length === 1 ? `${porAprobar[0].nombre} se ofrece` : `${porAprobar.length} personas se ofrecen`} para la estación</strong><br /><span className="muted">Apruébalo en la Estación.</span></span>
          <Link className="btn small primary" to="/congrega/estacion">Revisar</Link>
        </div>
      )}
      {error && <div className="cg-aviso" role="alert">{error}</div>}
    </section>
  );
}
