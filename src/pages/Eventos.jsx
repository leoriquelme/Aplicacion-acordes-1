import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import Icon from '../components/Icon.jsx';
import { sortEvents, todayISO } from '../lib/dates.js';
import EventCard from '../components/EventCard.jsx';
import { MAX_FUTUROS, MESES_PASADOS, pasadosVisibles } from '../lib/limitesEventos.js';

export default function Eventos() {
  const { events, songs, can } = useStore();
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();
  const upcoming = sortEvents(events.filter((e) => e.date >= today));
  const past = sortEvents(pasadosVisibles(events), -1);
  const lleno = upcoming.length >= MAX_FUTUROS;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Eventos</h1>
        {can.events && !lleno && (
          <Link className="btn primary" to="/eventos/nuevo">+ Nuevo evento</Link>
        )}
      </div>
      {can.events && lleno && (
        <p className="card aviso">Ya hay {MAX_FUTUROS} eventos próximos, que es el máximo. Cuando pase uno (o lo elimines) podrás crear otro.</p>
      )}

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
          <button className="btn ghost carpeta-pasados" onClick={() => setShowPast(!showPast)} aria-expanded={showPast}>
            <Icon name="folder" /> {showPast ? '▾' : '▸'} Eventos pasados ({past.length})
          </button>
          {showPast && <p className="muted small">Se muestran los de los últimos {MESES_PASADOS} meses. Un evento pasado se puede corregir hasta 3 días después.</p>}
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
