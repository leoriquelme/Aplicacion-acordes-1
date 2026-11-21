import { songKey } from '../lib/importar.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import AddMenu from '../components/AddMenu.jsx';
import AgregarEjemplos from '../components/AgregarEjemplos.jsx';
import { displayKey, normalize } from '../lib/chordpro.js';
import Icon from '../components/Icon.jsx';

const VISTA_KEY = 'cancionero-vista-canciones';
const VISTA_INICIAL = { orden: 'az', tono: '', onlyFav: false };
const leerVista = () => { try { return { ...VISTA_INICIAL, ...JSON.parse(localStorage.getItem(VISTA_KEY)) }; } catch { return VISTA_INICIAL; } };
const guardarVista = (v) => { try { localStorage.setItem(VISTA_KEY, JSON.stringify(v)); } catch { /* sin espacio */ } };

export default function Canciones() {
  const { songs, settings, can, mode, favorites = [] } = useStore();
  const [q, setQ] = useState('');
  const [vista, setVistaState] = useState(leerVista);
  const setVista = (patch) => setVistaState((v) => { const n = { ...v, ...patch }; guardarVista(n); return n; });
  const { orden, tono, onlyFav } = vista;
  const [panel, setPanel] = useState(false);
  const query = normalize(q.trim());
  const tonos = [...new Set(songs.map((s) => songKey(s)).filter(Boolean))].sort();
  const titulo = (s) => s.title.replace(/^[¡¿]/, '');
  const ORDENES = {
    az: (a, b) => titulo(a).localeCompare(titulo(b), 'es'),
    za: (a, b) => titulo(b).localeCompare(titulo(a), 'es'),
    autor: (a, b) => (a.author || '~').localeCompare(b.author || '~', 'es') || titulo(a).localeCompare(titulo(b), 'es'),
    tono: (a, b) => (songKey(a) || '~').localeCompare(songKey(b) || '~') || titulo(a).localeCompare(titulo(b), 'es'),
    recientes: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  };
  const list = songs
    .filter((s) => !onlyFav || favorites.includes(s.id))
    .filter((s) => !tono || songKey(s) === tono)
    .filter((s) => !query || normalize(s.title).includes(query) || normalize(s.author).includes(query))
    .sort(ORDENES[orden] || ORDENES.az);
  const activos = (orden !== 'az') + Boolean(tono) + Boolean(onlyFav);

  return (
    <div className="page">
      <div className="canciones-head">
        <div className="grow">
          <h1><span className="song-count">{songs.length}</span> {songs.length === 1 ? 'canción' : 'canciones'}</h1>
        </div>
        {can.edit && <AddMenu cloud={mode !== 'local'} />}
        {!can.edit && mode === 'cloud' && <Link className="btn" to="/canciones/biblioteca"><Icon name="globe" /> Otras iglesias</Link>}
      </div>
      <input
        className="search"
        type="search"
        placeholder="Buscar por título o autor…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="row between wrap filtro-fila">
        <p className="muted small">{list.length === songs.length ? 'Todas' : `${list.length} de ${songs.length}`}</p>
        <button className={`btn small ${activos ? 'primary' : ''}`} onClick={() => setPanel(!panel)} aria-expanded={panel}>
          <Icon name="sliders" /> Filtrar y ordenar{activos ? ` (${activos})` : ''}
        </button>
      </div>
      {panel && (
        <div className="card filtro-panel">
          <label>
            Ordenar por
            <select value={orden} onChange={(e) => setVista({ orden: e.target.value })}>
              <option value="az">Título (A–Z)</option>
              <option value="za">Título (Z–A)</option>
              <option value="autor">Autor</option>
              <option value="tono">Tono</option>
              <option value="recientes">Editadas recientemente</option>
            </select>
          </label>
          <label>
            Tono
            <select value={tono} onChange={(e) => setVista({ tono: e.target.value })}>
              <option value="">Todos</option>
              {tonos.map((k) => <option key={k} value={k}>{displayKey(k, 0, settings.notation)}</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={onlyFav} onChange={(e) => setVista({ onlyFav: e.target.checked })} />
            Solo mis favoritas ★{favorites.length ? ` (${favorites.length})` : ''}
          </label>
          {activos > 0 && <button className="btn small ghost" onClick={() => setVista(VISTA_INICIAL)}>Quitar filtros</button>}
        </div>
      )}
      {list.length === 0 ? (
        <div className="empty card">
          <p>{onlyFav && !favorites.length ? 'Aún no tienes favoritas (☆).' : songs.length ? 'No se encontraron canciones.' : 'Todavía no hay canciones.'}</p>
          {!songs.length && (
            <>
              <AgregarEjemplos className="btn primary" />
            </>
          )}
        </div>
      ) : (
        <ul className="song-blocks">
          {list.map((s) => (
            <li key={s.id}>
              <Link to={`/canciones/${s.id}`} className="song-block">
                <span className="song-block-text">
                  <strong>{s.title}</strong>
                  {s.author && <span className="muted small">{s.author}</span>}
                </span>
                {favorites.includes(s.id) && <span className="fav-mini" aria-label="Favorita">★</span>}
                {songKey(s) && <span className="key-pill">{displayKey(songKey(s), 0, settings.notation)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
