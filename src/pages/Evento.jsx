import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { displayKey, normalize } from '../lib/chordpro.js';
import { formatLong } from '../lib/dates.js';
import TransposeControls from '../components/TransposeControls.jsx';

export default function Evento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, songs, settings, saveEvent, deleteEvent } = useStore();
  const [q, setQ] = useState('');
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="page">
        <p>No se encontró el evento.</p>
        <Link to="/eventos">← Volver a eventos</Link>
      </div>
    );
  }

  const byId = new Map(songs.map((s) => [s.id, s]));
  const update = (patch) => saveEvent({ ...event, ...patch });
  const setItems = (items) => update({ items });

  const move = (i, dir) => {
    const items = [...event.items];
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    setItems(items);
  };

  const query = normalize(q.trim());
  const results = query
    ? songs.filter((s) => normalize(s.title).includes(query) || normalize(s.author).includes(query)).slice(0, 8)
    : [];

  const remove = () => {
    if (window.confirm(`¿Eliminar el evento "${event.name}"?`)) {
      deleteEvent(event.id);
      navigate('/eventos');
    }
  };

  return (
    <div className="page">
      <Link to="/eventos" className="back">← Eventos</Link>
      <div className="page-head">
        <div>
          <h1>{event.name}</h1>
          <p className="muted">{formatLong(event.date)}{event.time ? ` · ${event.time}` : ''}</p>
        </div>
        {event.items.length > 0 && (
          <Link className="btn primary" to={`/presentar/evento/${event.id}`}>▶ Presentar</Link>
        )}
      </div>

      <div className="card">
        <div className="row gap wrap">
          <label className="grow">
            Nombre
            <input value={event.name} onChange={(e) => update({ name: e.target.value })} />
          </label>
          <label>
            Fecha
            <input type="date" value={event.date} onChange={(e) => e.target.value && update({ date: e.target.value })} />
          </label>
          <label>
            Hora
            <input type="time" value={event.time || ''} onChange={(e) => update({ time: e.target.value })} />
          </label>
        </div>
        <label>
          Notas
          <textarea rows={2} value={event.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder="Ej. Santa Cena, bautismo…" />
        </label>
      </div>

      <h2>Lista de canciones</h2>
      {event.items.length === 0 ? (
        <p className="muted">Busca canciones abajo para agregarlas.</p>
      ) : (
        <ol className="setlist">
          {event.items.map((item, i) => {
            const s = byId.get(item.songId);
            if (!s) return null;
            return (
              <li key={i} className="setlist-item">
                <span className="setlist-num">{i + 1}</span>
                <Link className="grow" to={`/canciones/${s.id}`}><strong>{s.title}</strong></Link>
                <TransposeControls
                  compact
                  songKey={s.key}
                  steps={item.transpose || 0}
                  notation={settings.notation}
                  onChange={(t) => setItems(event.items.map((x, k) => (k === i ? { ...x, transpose: t } : x)))}
                />
                <div className="row">
                  <button className="btn ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                  <button className="btn ghost small" onClick={() => move(i, 1)} disabled={i === event.items.length - 1} aria-label="Bajar">↓</button>
                  <button className="btn ghost small" onClick={() => setItems(event.items.filter((_, k) => k !== i))} aria-label="Quitar">✕</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="card">
        <label>
          Agregar canción
          <input type="search" placeholder="Buscar por título o autor…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {results.length > 0 && (
          <ul className="picker">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  className="picker-row"
                  onClick={() => {
                    setItems([...event.items, { songId: s.id, transpose: 0 }]);
                    setQ('');
                  }}
                >
                  <span>+ {s.title} {s.author && <span className="muted">· {s.author}</span>}</span>
                  {s.key && <span className="key-pill">{displayKey(s.key, 0, settings.notation)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && results.length === 0 && <p className="muted">No se encontraron canciones.</p>}
      </div>

      <div className="danger-zone">
        <button className="btn danger ghost" onClick={remove}>Eliminar evento</button>
      </div>
    </div>
  );
}
