import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { displayKey, normalize } from '../lib/chordpro.js';
import { songKey } from '../lib/importar.js';
import SongView from '../components/SongView.jsx';
import Icon from '../components/Icon.jsx';

/** Buscar alabanzas que compartieron otras iglesias y copiarlas a la propia. */
export default function Biblioteca() {
  const { loadLibrary, songs, saveSong, settings, can } = useStore();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState({});

  useEffect(() => {
    if (!loadLibrary) return;
    loadLibrary().then(setItems).catch((e) => setError(e.message));
  }, [loadLibrary]);

  if (!loadLibrary) {
    return (
      <div className="page">
        <Link to="/canciones" className="back">← Canciones</Link>
        <p>La biblioteca compartida funciona cuando entras a una iglesia.</p>
      </div>
    );
  }

  const mine = new Set(songs.map((s) => normalize(s.title)));
  const query = normalize(q.trim());
  const list = (items || [])
    .filter((x) => !query || normalize(x.title).includes(query) || normalize(x.author).includes(query) || normalize(x.churchName).includes(query))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));

  const copy = (x) => {
    const id = saveSong({
      title: x.title, author: x.author || '', key: x.key || '', content: x.content || '',
      ...(x.order?.length ? { order: x.order } : {}),
      copiedFrom: { church: x.churchName, at: Date.now() },
    });
    setCopied((c) => ({ ...c, [x.id]: id }));
  };

  return (
    <div className="page">
      <Link to="/canciones" className="back">← Canciones</Link>
      <h1>Biblioteca compartida</h1>
      <input type="search" className="search" placeholder="Buscar por título, autor o iglesia…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <p className="error">No se pudo cargar: {error}</p>}
      {items === null && !error && <p className="muted">Cargando…</p>}
      {items && <p className="muted small">{list.length} de {items.length}</p>}
      {items && items.length === 0 && (
        <div className="empty card"><p>Aún no hay alabanzas compartidas.</p></div>
      )}
      <ul className="song-list">
        {list.map((x) => {
          const have = mine.has(normalize(x.title));
          return (
            <li key={x.id} className="lib-item">
              <div className="song-row lib-row">
                <button className="lib-title" onClick={() => setOpen(open === x.id ? null : x.id)}>
                  <strong>{x.title}</strong>
                  {x.author && <span className="muted"> · {x.author}</span>}
                  <div className="muted small"><Icon name="church" /> {x.churchName}{x.sharedBy ? ` · compartida por ${x.sharedBy}` : ''}</div>
                </button>
                {songKey(x) && <span className="key-pill">{displayKey(songKey(x), 0, settings.notation)}</span>}
                {copied[x.id] ? (
                  <Link className="btn small" to={`/canciones/${copied[x.id]}`}>✓ Copiada · Ver</Link>
                ) : can.edit ? (
                  <button className="btn small primary" disabled={have} title={have ? 'Tu iglesia ya tiene una canción con ese título' : ''} onClick={() => copy(x)}>
                    {have ? 'Ya la tienes' : '⤓ Copiar a mi iglesia'}
                  </button>
                ) : null}
              </div>
              {open === x.id && (
                <div className="card lib-preview">
                  <SongView content={x.content} songKey={songKey(x)} order={x.order} settings={settings} fontSize={16} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
