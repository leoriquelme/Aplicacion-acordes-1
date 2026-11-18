import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { sortEvents, todayISO } from '../lib/dates.js';
import EventCard from '../components/EventCard.jsx';

export default function Inicio() {
  const { events, songs } = useStore();
  const today = todayISO();
  const upcoming = sortEvents(events.filter((e) => e.date >= today));

  return (
    <div className="page">
      <h1>Próximos eventos</h1>
      {upcoming.length === 0 ? (
        <div className="empty card">
          <p>No hay eventos próximos.</p>
          <Link className="btn primary" to="/eventos">Crear un evento</Link>
        </div>
      ) : (
        <div className="grid">
          {upcoming.map((e) => <EventCard key={e.id} event={e} songs={songs} />)}
        </div>
      )}
    </div>
  );
}
