import { Link } from 'react-router-dom';
import { formatLong, relativeDay } from '../lib/dates.js';
import { eventLines } from '../lib/evento.js';

export default function EventCard({ event, songs, showSongs = true }) {
  const lines = eventLines(event, songs);
  const list = lines.filter((l) => l.song);
  const rel = relativeDay(event.date);
  return (
    <article className="card event-card">
      <div className="event-date">
        {rel && <span className="badge">{rel}</span>}
        <span>{formatLong(event.date)}{event.time ? ` · ${event.time}` : ''}</span>
      </div>
      <h3>{event.name}</h3>
      {showSongs && (
        lines.length ? (
          <ol className="event-songs">
            {lines.map((l, i) => <li key={i} className={l.song ? '' : 'muted'}>{l.song ? l.song.title : l.item.label}</li>)}
          </ol>
        ) : (
          <p className="muted">Todavía no tiene canciones.</p>
        )
      )}
      <div className="row gap">
        <Link className="btn" to={`/eventos/${event.id}`}>Ver evento</Link>
        {list.length > 0 && (
          <Link className="btn primary" to={`/presentar/evento/${event.id}`}>▶ Presentar</Link>
        )}
      </div>
    </article>
  );
}
