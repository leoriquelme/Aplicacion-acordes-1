import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GRUPOS } from '../lib/participacion.js';

const MAX = 12;

/**
 * Cada persona marca los equipos en los que sirve (y puede crear los suyos).
 * Después, en cada evento, se inscribe con un solo toque.
 */
export default function MisEquipos() {
  const { me, setMyTeams } = useStore();
  const [otro, setOtro] = useState('');
  if (!setMyTeams || !me) return null;
  const teams = me.teams || [];
  const custom = teams.filter((t) => !GRUPOS.some((g) => g.roles.includes(t)));
  const toggle = (t) => setMyTeams(teams.includes(t) ? teams.filter((x) => x !== t) : [...teams, t].slice(0, MAX));
  const add = () => {
    const t = otro.trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!t || teams.some((x) => x.toLowerCase() === t.toLowerCase())) { setOtro(''); return; }
    setMyTeams([...teams, t].slice(0, MAX));
    setOtro('');
  };
  return (
    <section className="card mis-equipos">
      <h2>Mis equipos</h2>
      <p className="muted small">Marca dónde sirves. En cada evento te aparecerán primero para inscribirte con un toque.</p>
      {GRUPOS.filter((g) => g.roles.length).map((g) => (
        <div key={g.id} className={`role-group g-${g.id}`}>
          <h3>{g.nombre}</h3>
          <div className="row gap wrap">
            {g.roles.map((r) => (
              <button key={r} className={`btn small role-btn ${teams.includes(r) ? 'selected' : ''}`} aria-pressed={teams.includes(r)} onClick={() => toggle(r)}>
                {teams.includes(r) ? '✓ ' : ''}{r}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="role-group g-otros">
        <h3>Mis propias categorías</h3>
        <div className="row gap wrap">
          {custom.map((r) => (
            <button key={r} className="btn small role-btn selected" onClick={() => toggle(r)} title="Tocar para quitar">✓ {r} ✕</button>
          ))}
        </div>
        <div className="row gap" style={{ marginTop: '0.5rem' }}>
          <input
            className="grow" value={otro} maxLength={30}
            placeholder="Ej. Danza, Bienvenida, Niños…"
            onChange={(e) => setOtro(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            disabled={teams.length >= MAX}
          />
          <button className="btn small" disabled={!otro.trim() || teams.length >= MAX} onClick={add}>Agregar</button>
        </div>
        {teams.length >= MAX && <p className="muted small">Máximo {MAX} equipos.</p>}
      </div>
    </section>
  );
}
