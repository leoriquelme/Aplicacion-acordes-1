import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { eventDateTime } from '../lib/stats.js';
import { GRUPOS, inscritosPorGrupo, participationId } from '../lib/participacion.js';
import ConfirmX from './ConfirmX.jsx';
import Avatares, { Avatar } from './Avatares.jsx';
import Icon from './Icon.jsx';

/**
 * Zona de inscripción de un evento: cada hermano elige UN rol para servir
 * (instrumentos, voces y coros, o multimedia y audio) y con un clic queda asignado.
 */
export default function Participacion({ event }) {
  const { me, can, people = [], participations = [], propuestas = [], joinEvent, leaveEvent, proponer, rechazarPropuesta } = useStore();
  const [choosing, setChoosing] = useState(false);
  const [proponiendo, setProponiendo] = useState(false);
  if (!joinEvent) return null; // modo local: no hay personas

  const grupos = inscritosPorGrupo(participations, event.id);
  const total = grupos.reduce((n, g) => n + g.personas.length, 0);
  const mine = me && participations.find((p) => p.id === participationId(event.id, me.key));
  const past = eventDateTime(event) < new Date();
  const teams = me?.teams || [];
  const todos = participations.filter((p) => p.eventId === event.id);
  const pendientes = propuestas.filter((p) => p.eventId === event.id);
  const miPropuesta = me && pendientes.find((p) => p.personKey === me.key && p.estado === 'propuesta');
  // Pendientes: todos los ven; los "no puede" solo el líder.
  const porConfirmar = pendientes.filter((p) => p.estado === 'propuesta' || can.events);

  const pick = (role) => {
    joinEvent(event, role, me);
    setChoosing(false);
  };

  return (
    <section className="card participacion">
      <div className="page-head">
        <div>
          <h2>Participación</h2>
          <Avatares people={todos} max={8} />
          <p className="muted small">
            {total === 0 ? 'Todavía no hay nadie inscrito.' : `${total} ${total === 1 ? 'voluntario' : 'voluntarios'}`}
          </p>
        </div>
        {me && !past && (
          mine ? (
            <div className="row gap wrap">
              <span className="mi-rol">✓ Participas como <strong>{mine.role}</strong></span>
              <button className="btn small" onClick={() => setChoosing(true)}>Cambiar rol</button>
              <button className="btn small ghost danger" onClick={() => { leaveEvent(event.id, me.key); setChoosing(false); }}>Ya no participo</button>
            </div>
          ) : (
            <button className="btn primary" onClick={() => setChoosing(true)}>{<><Icon name="hand" /> Participar</>}</button>
          )
        )}
      </div>

      {miPropuesta && !past && <TuPropuesta p={miPropuesta} onAcepto={() => joinEvent(event, miPropuesta.role, me)} onNoPuedo={() => rechazarPropuesta(miPropuesta)} />}

      {can.events && proponer && !past && (
        <button className="btn small proponer-btn" onClick={() => setProponiendo(true)}><Icon name="users" /> Proponer a alguien</button>
      )}

      {me && !past && !mine && !miPropuesta && teams.length > 0 && (
        <div className="rapido">
          <span className="small muted">Inscríbete con un toque:</span>
          <div className="row gap wrap">
            {teams.map((t) => <button key={t} className="btn small role-btn" onClick={() => pick(t)}><Icon name="hand" /> {t}</button>)}
          </div>
        </div>
      )}

      {choosing && !past && (
        <ElegirRol titulo="¿Cómo vas a servir?" teams={teams} selected={mine?.role} onPick={pick} onClose={() => setChoosing(false)} />
      )}

      {proponiendo && !past && (
        <Proponer event={event} people={people} ocupados={todos.map((p) => p.personKey)} onClose={() => setProponiendo(false)}
          onPropose={(role, person) => { proponer(event, role, person, me?.name); setProponiendo(false); }} />
      )}

      {total > 0 && (
        <div className="inscritos">
          {grupos.filter((g) => g.personas.length).map((g) => (
            <div key={g.id} className={`role-group g-${g.id}`}>
              <h3>{g.nombre}</h3>
              <ul>
                {g.personas.map((p) => (
                  <li key={p.id}>
                    <Avatar name={p.name} personKey={p.personKey} size="sm" />
                    <span className="role-tag">{p.role}</span>
                    <span className="grow">{p.name}{me && p.personKey === me.key ? ' (tú)' : ''}</span>
                    {can.events && (!me || p.personKey !== me.key) && (
                      <ConfirmX label={`Quitar a ${p.name}`} onConfirm={() => leaveEvent(event.id, p.personKey)} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {porConfirmar.length > 0 && (
        <div className="por-confirmar">
          <h3>Por confirmar</h3>
          <ul>
            {porConfirmar.map((p) => (
              <li key={p.id} className={`g-${p.group || 'otros'} ${p.estado === 'rechazada' ? 'rechazada' : ''}`}>
                <Avatar name={p.name} personKey={p.personKey} size="sm" />
                <span className="role-tag">{p.role}</span>
                <span className="grow">{p.name}{me && p.personKey === me.key ? ' (tú)' : ''}</span>
                <span className={`estado-pill ${p.estado}`}>{p.estado === 'rechazada' ? 'No puede' : 'Pendiente'}</span>
                {can.events && <ConfirmX label={`Quitar la propuesta a ${p.name}`} onConfirm={() => leaveEvent(event.id, p.personKey)} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** "Te proponen servir como Bajo": la persona acepta o dice que no puede (no es obligación). */
export function TuPropuesta({ p, evento, onAcepto, onNoPuedo }) {
  return (
    <div className="tu-propuesta">
      <p>
        <Icon name="hand" /> {p.por ? <strong>{p.por}</strong> : 'El líder'} te propone servir como <strong>{p.role}</strong>
        {evento ? <> en <strong>{evento}</strong></> : ''}.
        {p.estado === 'rechazada' && <span className="muted"> Dijiste que no puedes.</span>}
      </p>
      <div className="row gap wrap">
        <button className="btn primary small" onClick={onAcepto}>✓ Acepto</button>
        {p.estado !== 'rechazada' && <button className="btn small" onClick={onNoPuedo}>No puedo</button>}
      </div>
    </div>
  );
}

/** Ventana para elegir un rol (instrumentos, voces, multimedia o los equipos de la persona). */
function ElegirRol({ titulo, subtitulo, teams = [], selected, onPick, onClose, onBack }) {
  return createPortal(
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={titulo} onClick={onClose}>
      <div className="modal modal-roles role-picker" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabeza">
          {onBack && <button className="btn ghost small" onClick={onBack} aria-label="Volver">‹</button>}
          <h2>{titulo}</h2>
          <button className="btn ghost small" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {subtitulo && <p className="small muted">{subtitulo}</p>}
        {teams.length > 0 && (
          <div className="role-group g-otros">
            <h3>{onBack ? 'Sus equipos' : 'Mis equipos'}</h3>
            <div className="row gap wrap">
              {teams.map((r) => (
                <button key={r} className={`btn small role-btn ${selected === r ? 'selected' : ''}`} onClick={() => onPick(r)}>{r}</button>
              ))}
            </div>
          </div>
        )}
        {GRUPOS.filter((g) => g.roles.length).map((g) => (
          <div key={g.id} className={`role-group g-${g.id}`}>
            <h3>{g.nombre}</h3>
            <div className="row gap wrap">
              {g.roles.map((r) => (
                <button key={r} className={`btn small role-btn ${selected === r ? 'selected' : ''}`} onClick={() => onPick(r)}>{r}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

/** El líder elige a una persona y el rol que le propone. */
function Proponer({ people, ocupados, onPropose, onClose }) {
  const [persona, setPersona] = useState(null);
  const libres = people.filter((p) => !ocupados.includes(p.key)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (persona) {
    return (
      <ElegirRol titulo={`Proponer a ${persona.name.split(' ')[0]}`} subtitulo="Le llegará la propuesta y podrá aceptar o decir que no puede."
        teams={persona.teams || []} onPick={(r) => onPropose(r, persona)} onClose={onClose} onBack={() => setPersona(null)} />
    );
  }
  return createPortal(
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Proponer a alguien" onClick={onClose}>
      <div className="modal modal-roles" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabeza">
          <h2>¿A quién propones?</h2>
          <button className="btn ghost small" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <p className="small muted">No es obligación: la persona acepta o dice que no puede.</p>
        {libres.length === 0 ? <p className="muted">Todos ya están inscritos o propuestos.</p> : (
          <ul className="elegir-persona">
            {libres.map((p) => (
              <li key={p.key}>
                <button className="fila-persona" onClick={() => setPersona(p)}>
                  <Avatar name={p.name} personKey={p.key} size="sm" photo={p.photo} />
                  <span className="grow">
                    <strong>{p.name}</strong>
                    {p.teams?.length > 0 && <span className="muted small"> · {p.teams.join(', ')}</span>}
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
