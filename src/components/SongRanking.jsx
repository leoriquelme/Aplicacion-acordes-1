import { useState } from 'react';
import { Link } from 'react-router-dom';
import { leastUsed, mostUsed, songUsage } from '../lib/stats.js';
import { parseISO } from '../lib/dates.js';

function shortDate(iso) {
  return parseISO(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SongRanking({ songs, events }) {
  const [mode, setMode] = useState('mas');
  const [showAll, setShowAll] = useState(false);
  const usage = songUsage(songs, events);
  const list = mode === 'mas' ? mostUsed(usage) : leastUsed(usage);
  const visible = showAll ? list : list.slice(0, 10);

  if (songs.length === 0) return null;

  return (
    <section className="card ranking">
      <div className="page-head">
        <div>
          <h2>Top repertorio</h2>
          <p className="muted small">Último año</p>
        </div>
        <div className="segmented" role="group" aria-label="Orden del repertorio">
          <button className={mode === 'mas' ? 'active' : ''} onClick={() => setMode('mas')}>Más tocadas</button>
          <button className={mode === 'menos' ? 'active' : ''} onClick={() => setMode('menos')}>Menos tocadas</button>
        </div>
      </div>
      <ol className="lista-tarjetas">
        {visible.map((u, i) => (
          <li key={u.song.id}>
            <Link to={`/canciones/${u.song.id}`} className="tarjeta-fila tf-cabeza">
              <span className="tf-puesto">{i + 1}</span>
              <span className="grow">
                <strong>{u.song.title}</strong>
                <span className="muted small">{u.lastUsed ? `Última vez ${shortDate(u.lastUsed)}` : 'Nunca se ha tocado'}</span>
              </span>
              <span className="tf-numero"><strong>{u.count}</strong><span className="muted small">{u.count === 1 ? 'vez' : 'veces'}</span></span>
            </Link>
          </li>
        ))}
      </ol>
      {list.length > 10 && (
        <button className="btn ghost small" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Ver menos' : `Ver las ${list.length} canciones`}
        </button>
      )}
    </section>
  );
}
