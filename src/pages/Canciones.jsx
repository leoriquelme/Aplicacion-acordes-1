import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { displayKey, normalize } from '../lib/chordpro.js';

export default function Canciones() {
  const { songs, settings } = useStore();
  const [q, setQ] = useState('');
  const query = normalize(q.trim());
  const list = songs
    .filter((s) => !query || normalize(s.title).includes(query) || normalize(s.author).includes(query))
    .sort((a, b) => a.title.replace(/^[¡¿]/, '').localeCompare(b.title.replace(/^[¡¿]/, ''), 'es'));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Canciones</h1>
        <div className="row gap wrap">
          <Link className="btn" to="/canciones/importar">⤓ Importar</Link>
          <Link className="btn primary" to="/canciones/nueva">+ Nueva canción</Link>
        </div>
      </div>
      <input
        className="search"
        type="search"
        placeholder="Buscar por título o autor…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <p className="muted small">{list.length} de {songs.length} canciones</p>
      {list.length === 0 ? (
        <div className="empty card">
          <p>{songs.length ? 'No se encontraron canciones.' : 'Todavía no hay canciones.'}</p>
        </div>
      ) : (
        <ul className="song-list">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`/canciones/${s.id}`} className="song-row">
                <span>
                  <strong>{s.title}</strong>
                  {s.author && <span className="muted"> · {s.author}</span>}
                </span>
                {s.key && <span className="key-pill">{displayKey(s.key, 0, settings.notation)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
