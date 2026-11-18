import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { sortEvents, todayISO, formatLong } from '../lib/dates.js';
import SongView from '../components/SongView.jsx';
import TransposeControls from '../components/TransposeControls.jsx';

export default function Cancion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs, events, settings, deleteSong, saveEvent } = useStore();
  const [steps, setSteps] = useState(0);
  const [added, setAdded] = useState('');
  const song = songs.find((s) => s.id === id);

  if (!song) {
    return (
      <div className="page">
        <p>No se encontró la canción.</p>
        <Link to="/canciones">← Volver a canciones</Link>
      </div>
    );
  }

  const upcoming = sortEvents(events.filter((e) => e.date >= todayISO()));

  const remove = () => {
    if (window.confirm(`¿Eliminar "${song.title}"? Esta acción no se puede deshacer.`)) {
      deleteSong(song.id);
      navigate('/canciones');
    }
  };

  const addToEvent = (eventId) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    saveEvent({ ...ev, items: [...ev.items, { songId: song.id, transpose: steps }] });
    setAdded(`Agregada a "${ev.name}"`);
  };

  return (
    <div className="page">
      <Link to="/canciones" className="back">← Canciones</Link>
      <div className="page-head">
        <div>
          <h1>{song.title}</h1>
          {song.author && <p className="muted">{song.author}</p>}
        </div>
        <div className="row gap wrap">
          <Link className="btn" to={`/canciones/${song.id}/editar`}>✏️ Editar</Link>
          <Link className="btn primary" to={`/presentar/cancion/${song.id}?t=${steps}`}>▶ Presentar</Link>
        </div>
      </div>

      <div className="toolbar">
        <TransposeControls songKey={song.key} steps={steps} onChange={setSteps} notation={settings.notation} />
        {upcoming.length > 0 && (
          <select value="" onChange={(e) => addToEvent(e.target.value)} aria-label="Agregar a un evento">
            <option value="">+ Agregar a un evento…</option>
            {upcoming.map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {formatLong(e.date)}</option>
            ))}
          </select>
        )}
        {added && <span className="ok">✓ {added}</span>}
      </div>

      <SongView content={song.content} songKey={song.key} steps={steps} settings={settings} />

      <div className="danger-zone">
        <button className="btn danger ghost" onClick={remove}>Eliminar canción</button>
      </div>
    </div>
  );
}
