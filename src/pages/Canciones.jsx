import { songKey } from '../lib/importar.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import AddMenu from '../components/AddMenu.jsx';
import AgregarEjemplos from '../components/AgregarEjemplos.jsx';
import { displayKey, normalize } from '../lib/chordpro.js';

export default function Canciones() {
  const { songs, settings, can, mode, favorites = [] } = useStore();
  const [q, setQ] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const query = normalize(q.trim());
  const list = songs
    .filter((s) => !onlyFav || favorites.includes(s.id))
    .filter((s) => !query || normalize(s.title).includes(query) || normalize(s.author).includes(query))
    .sort((a, b) => a.title.replace(/^[¡¿]/, '').localeCompare(b.title.replace(/^[¡¿]/, ''), 'es'));

  return (
    <div className="page">
      <div className="page-head center">
        <h1>Canciones</h1>
        {can.edit ? (
          <AddMenu cloud={mode === 'cloud'} />
        ) : (
          mode === 'cloud' && <Link className="btn" to="/canciones/biblioteca">🌐 Otras iglesias</Link>
        )}
      </div>
      <input
        className="search"
        type="search"
        placeholder="Buscar por título o autor…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="row between wrap">
        <p className="muted small">{list.length} de {songs.length} canciones</p>
        <button className={`btn small ${onlyFav ? 'primary' : ''}`} onClick={() => setOnlyFav(!onlyFav)} aria-pressed={onlyFav}>
          ★ Mis favoritas{favorites.length ? ` (${favorites.length})` : ''}
        </button>
      </div>
      {list.length === 0 ? (
        <div className="empty card">
          <p>{onlyFav && !favorites.length ? 'Aún no tienes favoritas. Abre una canción y toca la ☆ junto al título.' : songs.length ? 'No se encontraron canciones.' : 'Todavía no hay canciones.'}</p>
          {!songs.length && (
            <>
              <p className="muted small">Puedes empezar con himnos clásicos de dominio público (sin derechos de autor).</p>
              <AgregarEjemplos className="btn primary" />
            </>
          )}
        </div>
      ) : (
        <ul className="song-list">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`/canciones/${s.id}`} className="song-row">
                <span>
                  {favorites.includes(s.id) && <span className="fav-mini" aria-label="Favorita">★ </span>}
                  <strong>{s.title}</strong>
                  {s.author && <span className="muted"> · {s.author}</span>}
                </span>
                {songKey(s) && <span className="key-pill">{displayKey(songKey(s), 0, settings.notation)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
