import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { sortEvents, todayISO } from '../lib/dates.js';
import EventCard from '../components/EventCard.jsx';
import SongRanking from '../components/SongRanking.jsx';

export default function Eventos() {
  const { events, songs, saveEvent } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: 'Culto dominical', date: todayISO(), time: '11:00' });
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();
  const upcoming = sortEvents(events.filter((e) => e.date >= today));
  const past = sortEvents(events.filter((e) => e.date < today), -1);

  const create = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) return;
    const id = saveEvent({ ...form, name: form.name.trim(), items: [], notes: '' });
    navigate(`/eventos/${id}`);
  };

  return (
    <div className="page">
      <h1>Eventos</h1>
      <form className="card new-event" onSubmit={create}>
        <h2>Nuevo evento</h2>
        <div className="row gap wrap">
          <label className="grow">
            Nombre
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Fecha
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label>
            Hora
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
          <button className="btn primary align-end" type="submit">Crear</button>
        </div>
      </form>

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

      <SongRanking songs={songs} events={events} />
    </div>
  );
}
