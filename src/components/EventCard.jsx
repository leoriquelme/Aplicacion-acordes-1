import { Link } from 'react-router-dom';
import { formatLong, relativeDay } from '../lib/dates.js';

export default function EventCard({ event, songs, showSongs = true }) {
  const byId = new Map(songs.map((s) => [s.id, s]));
  const list = event.items.map((i) => byId.get(i.songId)).filter(Boolean);
  const rel = relativeDay(event.date);
  return (
    <article className="card event-card">
      <div className="event-date">
        {rel && <span className="badge">{rel}</span>}
        <span>{formatLong(event.date)}{event.time ? ` · ${event.time}` : ''}</span>
      </div>
      <h3>{event.name}</h3>
      {showSongs && (
        list.length ? (
          <ol className="event-songs">
            {list.map((s, i) => <li key={i}>{s.title}</li>)}
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
