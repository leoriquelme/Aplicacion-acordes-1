import { Fragment, useState } from 'react';
import { HISTORIAL_MESES, historial } from '../lib/participacion.js';
import { parseISO } from '../lib/dates.js';

const corta = (iso) => parseISO(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });

/** Historial de quiénes han servido en los últimos 3 meses. Solo para Administrador y Director. */
export default function HistorialParticipacion({ participations, events }) {
  const [open, setOpen] = useState(null);
  const lista = historial(participations, events);

  return (
    <section className="card ranking">
      <h2>Historial de participación</h2>
      <p className="muted small">
        Últimos {HISTORIAL_MESES} meses. Solo cuentan los eventos que ya pasaron. Solo lo ven Administradores y Directores.
      </p>
      {lista.length === 0 ? (
        <p className="muted">Todavía no hay participaciones registradas.</p>
      ) : (
        <div className="table-scroll">
          <table className="rank-table">
            <thead>
              <tr><th>Nombre</th><th className="num">Veces</th><th>Roles</th><th>Última vez</th></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <Fragment key={p.key}>
                  <tr className="clickable" onClick={() => setOpen(open === p.key ? null : p.key)}>
                    <td><strong>{p.name}</strong> <span className="muted small">{open === p.key ? '▾' : '▸'}</span></td>
                    <td className="num">{p.count}</td>
                    <td className="small">{Object.entries(p.roles).map(([r, n]) => (n > 1 ? `${r} ×${n}` : r)).join(', ')}</td>
                    <td>{corta(p.lastDate)}</td>
                  </tr>
                  {open === p.key && (
                    <tr className="detail-row">
                      <td colSpan={4}>
                        <ul className="small">
                          {p.items.map((it, i) => <li key={i}>{corta(it.date)} · {it.eventName} · {it.role}</li>)}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
