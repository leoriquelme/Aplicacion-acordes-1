import { Link, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { displayKey } from '../lib/chordpro.js';
import { formatLong } from '../lib/dates.js';
import { songKey } from '../lib/importar.js';
import { eventLines } from '../lib/evento.js';
import { inscritosPorGrupo } from '../lib/participacion.js';
import Icon from '../components/Icon.jsx';

/** Hoja estándar del culto para imprimir o guardar como PDF: orden arriba, participantes abajo. */
export default function Imprimir() {
  const { id } = useParams();
  const { events, songs, settings, participations = [], church } = useStore();
  const event = events.find((e) => e.id === id);
  if (!event) return <div className="page"><p>No se encontró el evento.</p><Link to="/eventos">← Eventos</Link></div>;
  const lines = eventLines(event, songs);
  const grupos = inscritosPorGrupo(participations, event.id).filter((g) => g.personas.length);

  return (
    <div className="page print-page">
      <div className="row gap no-print" style={{ marginBottom: '1rem' }}>
        <Link className="btn" to={`/eventos/${event.id}`}>← Volver</Link>
        <button className="btn primary" onClick={() => window.print()}><Icon name="print" /> Imprimir o guardar PDF</button>
      </div>
      <p className="muted small no-print">En el celular: pulsa el botón y elige "Guardar como PDF" o compártelo.</p>

      <article className="hoja">
        <header className="hoja-head">
          {church?.name && <div className="hoja-iglesia">{church.name}</div>}
          <h1>{event.name}</h1>
          <div>{formatLong(event.date)}{event.time ? ` · ${event.time}` : ''}</div>
          {event.notes && <p className="hoja-notas">{event.notes}</p>}
        </header>

        <section>
          <h2>Orden del servicio</h2>
          {lines.length === 0 ? <p>—</p> : (
            <table className="hoja-tabla">
              <thead><tr><th>#</th><th>Parte / Canción</th><th>Tono</th><th>Detalle</th></tr></thead>
              <tbody>
                {lines.map(({ item, index, song }, n) => (
                  <tr key={index}>
                    <td>{n + 1}</td>
                    <td>{song ? <strong>{song.title}</strong> : item.label}</td>
                    <td>{song && songKey(song) ? displayKey(songKey(song), item.transpose || 0, settings.notation) : ''}</td>
                    <td>{song ? song.author || '' : item.detail || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Participantes</h2>
          {grupos.length === 0 ? <p className="muted">Nadie inscrito todavía.</p> : (
            <div className="hoja-grupos">
              {grupos.map((g) => (
                <div key={g.id}>
                  <h3>{g.nombre}</h3>
                  <ul>{g.personas.map((p) => <li key={p.id}><strong>{p.role}:</strong> {p.name}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
