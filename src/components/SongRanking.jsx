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
          <h2>Ranking de canciones</h2>
          <p className="muted small">Usos en el último año. Solo cuentan los eventos cuya fecha y hora ya pasaron.</p>
        </div>
        <div className="segmented" role="group" aria-label="Orden del ranking">
          <button className={mode === 'mas' ? 'active' : ''} onClick={() => setMode('mas')}>Más usadas</button>
          <button className={mode === 'menos' ? 'active' : ''} onClick={() => setMode('menos')}>Menos usadas</button>
        </div>
      </div>
      <table className="rank-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Canción</th>
            <th className="num">Veces</th>
            <th>Último uso</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((u, i) => (
            <tr key={u.song.id}>
              <td className="muted">{i + 1}</td>
              <td><Link to={`/canciones/${u.song.id}`}>{u.song.title}</Link></td>
              <td className="num"><strong>{u.count}</strong></td>
              <td className={u.lastUsed ? '' : 'muted'}>{u.lastUsed ? shortDate(u.lastUsed) : 'Nunca'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length > 10 && (
        <button className="btn ghost small" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Ver menos' : `Ver las ${list.length} canciones`}
        </button>
      )}
    </section>
  );
}
