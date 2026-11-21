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
  const { me, can, participations = [], joinEvent, leaveEvent } = useStore();
  const [choosing, setChoosing] = useState(false);
  if (!joinEvent) return null; // modo local: no hay personas

  const grupos = inscritosPorGrupo(participations, event.id);
  const total = grupos.reduce((n, g) => n + g.personas.length, 0);
  const mine = me && participations.find((p) => p.id === participationId(event.id, me.key));
  const past = eventDateTime(event) < new Date();
  const teams = me?.teams || [];
  const todos = participations.filter((p) => p.eventId === event.id);

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
            {total === 0 ? 'Todavía no hay nadie inscrito.' : `${total} ${total === 1 ? 'persona inscrita' : 'personas inscritas'}.`}
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

      {me && !past && !mine && teams.length > 0 && (
        <div className="rapido">
          <span className="small muted">Inscríbete con un toque:</span>
          <div className="row gap wrap">
            {teams.map((t) => <button key={t} className="btn small role-btn" onClick={() => pick(t)}><Icon name="hand" /> {t}</button>)}
          </div>
        </div>
      )}

      {choosing && !past && (
        createPortal(<div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Elegir cómo participar" onClick={() => setChoosing(false)}>
        <div className="modal modal-roles role-picker" onClick={(e) => e.stopPropagation()}>
          <div className="modal-cabeza">
            <h2>¿Cómo vas a servir?</h2>
            <button className="btn ghost small" onClick={() => setChoosing(false)} aria-label="Cerrar">✕</button>
          </div>
          <p className="small muted">¿Cómo vas a servir?</p>
          {teams.length > 0 && (
            <div className="role-group g-otros">
              <h3>Mis equipos</h3>
              <div className="row gap wrap">
                {teams.map((r) => (
                  <button key={r} className={`btn small role-btn ${mine?.role === r ? 'selected' : ''}`} onClick={() => pick(r)}>{r}</button>
                ))}
              </div>
            </div>
          )}
          {GRUPOS.filter((g) => g.roles.length).map((g) => (
            <div key={g.id} className={`role-group g-${g.id}`}>
              <h3>{g.nombre}</h3>
              <div className="row gap wrap">
                {g.roles.map((r) => (
                  <button
                    key={r}
                    className={`btn small role-btn ${mine?.role === r ? 'selected' : ''}`}
                    onClick={() => pick(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>, document.body)
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
    </section>
  );
}
