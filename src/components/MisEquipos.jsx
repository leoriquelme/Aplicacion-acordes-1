import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Avatares from './Avatares.jsx';
import { useStore } from '../lib/store.jsx';
import { GRUPOS } from '../lib/participacion.js';

const MAX = 12;

/**
 * Cada persona marca los equipos en los que sirve (y puede crear los suyos).
 * Después, en cada evento, se inscribe con un solo toque.
 */
function EditorEquipos() {
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
    <div className="mis-equipos">
      <p className="muted small">Marca dónde sirves.</p>
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
            placeholder="Otro equipo"
            onChange={(e) => setOtro(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            disabled={teams.length >= MAX}
          />
          <button className="btn small" disabled={!otro.trim() || teams.length >= MAX} onClick={add}>Agregar</button>
        </div>
        {teams.length >= MAX && <p className="muted small">Máximo {MAX} equipos.</p>}
      </div>
    </div>
  );
}

/** En Ajustes (perfil): una fila con mis equipos que abre la ventana para elegirlos. */
export function EquiposPerfil() {
  const { me, setMyTeams } = useStore();
  const [open, setOpen] = useState(false);
  if (!setMyTeams || !me) return null;
  const teams = me.teams || [];
  return (
    <>
      <button type="button" className="fila" onClick={() => setOpen(true)}>
        <span className="fila-label">Mis equipos</span>
        <span className="fila-valor">{teams.length ? teams.join(', ') : 'Elegir'}</span>
        <span className="fila-flecha" aria-hidden="true">›</span>
      </button>
      {open && createPortal(
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Elegir mis equipos" onClick={() => setOpen(false)}>
          <div className="modal modal-roles" onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabeza">
              <h2>Mis equipos</h2>
              <button className="btn ghost small" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <EditorEquipos />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.8rem' }}>
              <button className="btn primary" onClick={() => setOpen(false)}>Listo</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** En Mi iglesia: resumen de mis equipos y de quiénes sirven en cada uno. */
export default function ResumenEquipos() {
  const { me, people = [] } = useStore();
  if (!me) return null;
  const mine = me.teams || [];
  const porEquipo = new Map();
  for (const p of people) for (const t of p.teams || []) porEquipo.set(t, [...(porEquipo.get(t) || []), p]);
  const equipos = [...porEquipo.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'es'));
  return (
    <section className="card resumen-equipos">
      <div className="row between wrap">
        <h2 style={{ margin: 0 }}>Equipos</h2>
        <Link className="btn small ghost" to="/ajustes">Elegir mis equipos</Link>
      </div>
      <p className="small">
        <span className="muted">Mis equipos: </span>
        {mine.length ? mine.join(' · ') : <span className="muted">ninguno</span>}
      </p>
      {equipos.length > 0 && (
        <ul className="equipos-lista">
          {equipos.map(([t, ps]) => (
            <li key={t}>
              <span className="grow">{t}</span>
              <Avatares people={ps} max={5} size="sm" />
              <span className="muted small">{ps.length}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
