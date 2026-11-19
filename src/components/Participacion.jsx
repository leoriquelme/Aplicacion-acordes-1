import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { eventDateTime } from '../lib/stats.js';
import { GRUPOS, inscritosPorGrupo, participationId } from '../lib/participacion.js';
import ConfirmX from './ConfirmX.jsx';

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

  const pick = (role) => {
    joinEvent(event, role, me);
    setChoosing(false);
  };

  return (
    <section className="card participacion">
      <div className="page-head">
        <div>
          <h2>Participación</h2>
          <p className="muted small">
            {total === 0 ? 'Todavía no hay nadie inscrito.' : `${total} ${total === 1 ? 'persona inscrita' : 'personas inscritas'}.`}
            {' '}Cada persona elige un solo rol por servicio.
          </p>
        </div>
        {me && !past && (
          mine ? (
            <div className="row gap wrap">
              <span className="mi-rol">✓ Participas como <strong>{mine.role}</strong></span>
              <button className="btn small" onClick={() => setChoosing(!choosing)}>{choosing ? 'Cerrar' : 'Cambiar rol'}</button>
              <button className="btn small ghost danger" onClick={() => { leaveEvent(event.id, me.key); setChoosing(false); }}>Ya no participo</button>
            </div>
          ) : (
            <button className="btn primary" onClick={() => setChoosing(!choosing)}>{choosing ? 'Cerrar' : '🙋 Participar'}</button>
          )
        )}
      </div>

      {choosing && !past && (
        <div className="role-picker">
          <p className="small muted">Elige cómo vas a servir. Con un clic quedas asignado.</p>
          {GRUPOS.map((g) => (
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
      )}

      {total > 0 && (
        <div className="inscritos">
          {grupos.filter((g) => g.personas.length).map((g) => (
            <div key={g.id} className={`role-group g-${g.id}`}>
              <h3>{g.nombre}</h3>
              <ul>
                {g.personas.map((p) => (
                  <li key={p.id}>
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
