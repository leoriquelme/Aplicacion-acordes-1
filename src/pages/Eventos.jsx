import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { sortEvents, todayISO } from '../lib/dates.js';
import EventCard from '../components/EventCard.jsx';

export default function Eventos() {
  const { events, songs, can } = useStore();
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();
  const upcoming = sortEvents(events.filter((e) => e.date >= today));
  const past = sortEvents(events.filter((e) => e.date < today), -1);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Eventos</h1>
        {can.events && (
          <Link className="btn primary" to="/eventos/nuevo">+ Nuevo evento</Link>
        )}
      </div>

      <h2>Próximos</h2>
      {upcoming.length === 0 ? (
        <p className="muted">No hay eventos próximos.</p>
      ) : (
        <div className="grid">
          {upcoming.map((e) => <EventCard key={e.id} event={e} songs={songs} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <button className="btn ghost" onClick={() => setShowPast(!showPast)}>
            {showPast ? '▾' : '▸'} Eventos pasados ({past.length})
          </button>
          {showPast && (
            <div className="grid">
              {past.map((e) => <EventCard key={e.id} event={e} songs={songs} showSongs={false} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
