import { useState } from 'react';
import { HISTORIAL_MESES, grupoDe, historial } from '../lib/participacion.js';
import { Avatar } from './Avatares.jsx';
import { parseISO } from '../lib/dates.js';

const corta = (iso) => parseISO(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });

/** Historial de quiénes han servido en los últimos 3 meses. Solo para Administrador y Director. */
export default function HistorialParticipacion({ participations, events }) {
  const [open, setOpen] = useState(null);
  const lista = historial(participations, events);

  return (
    <section className="card ranking">
      <h2>Historial de participación</h2>
      <p className="muted small">Últimos {HISTORIAL_MESES} meses</p>
      {lista.length === 0 ? (
        <p className="muted">Sin participaciones aún.</p>
      ) : (
        <ul className="lista-tarjetas">
          {lista.map((p) => (
            <li key={p.key} className="tarjeta-fila">
              <button className="tf-cabeza" onClick={() => setOpen(open === p.key ? null : p.key)} aria-expanded={open === p.key}>
                <Avatar name={p.name} personKey={p.key} />
                <span className="grow">
                  <strong>{p.name}</strong>
                  <span className="muted small">Última vez {corta(p.lastDate)}</span>
                  <span className="tf-roles">
                    {Object.entries(p.roles).map(([r, n]) => (
                      <span key={r} className={`role-tag g-${grupoDe(r)}`}>{r}{n > 1 ? ` ×${n}` : ''}</span>
                    ))}
                  </span>
                </span>
                <span className="tf-numero"><strong>{p.count}</strong><span className="muted small">{p.count === 1 ? 'vez' : 'veces'}</span></span>
                <span className={`tf-flecha ${open === p.key ? 'abierta' : ''}`} aria-hidden="true">›</span>
              </button>
              {open === p.key && (
                <ul className="tf-detalle small">
                  {p.items.map((it, i) => <li key={i}><span className="muted">{corta(it.date)}</span> · {it.eventName} · {it.role}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
