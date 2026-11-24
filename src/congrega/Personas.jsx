import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TIPOS, activo, esMiembro, nombreDe, norm, useCongrega } from './datos.jsx';
import { Repetidos } from './UnirPerfiles.jsx';
import { Avatar } from '../components/Avatares.jsx';

const FILTROS = [['activos', 'Todos'], ['miembros', 'Miembros'], ['ninos', 'Niños'], ['inactivos', 'Inactivos']];
const ORDEN_ROL = { 'Contacto principal': 0, 'Cónyuge': 1, 'Hijo/a': 2 };

function Fila({ p, familias }) {
  const fam = p.familiaId && familias.get(p.familiaId);
  return (
    <Link className="cg-item" role="listitem" to={`/congrega/personas/${p.key}`}>
      <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="lg" />
      <span className="cg-quien">
        <span className="cg-nombre">{nombreDe(p)}</span>
        <span className="cg-meta">
          {esMiembro(p) && <span className="cg-chip ok">Miembro</span>}
          {p.tipo && <span className={`cg-chip${p.tipo === 'Visita' ? ' visita' : ''}`}>{p.tipo}</span>}
          {!activo(p) && <span className="cg-chip">Inactivo</span>}
          {fam && <span>{fam.name}{p.rolFamilia ? ` (${p.rolFamilia})` : ''}</span>}
          {(p.teams || []).length > 0 && <span>{p.teams.join(', ')}</span>}
        </span>
      </span>
    </Link>
  );
}

/** Fila de una familia: al tocarla se despliegan sus integrantes (solo activos). */
function FilaFamilia({ fam, ms, familias, abierta, onToggle }) {
  return (
    <div className={`cg-familia-fila${abierta ? ' abierta' : ''}`} role="listitem">
      <button type="button" className="cg-item cg-familia-cabeza" aria-expanded={abierta} onClick={onToggle}>
        <span className="cg-familia-avatares" aria-hidden="true">
          {ms.slice(0, 3).map((p) => <Avatar key={p.key} name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />)}
        </span>
        <span className="cg-quien">
          <span className="cg-nombre">Familia {fam.name}</span>
          <span className="cg-meta">{ms.length} {ms.length === 1 ? 'integrante' : 'integrantes'} · {ms.map((p) => p.nombre || nombreDe(p).split(' ')[0]).join(', ')}</span>
        </span>
        <span className="cg-flecha" aria-hidden="true">{abierta ? '▴' : '▾'}</span>
      </button>
      {abierta && (
        <div className="cg-familia-integrantes">
          {ms.map((p) => <Fila key={p.key} p={p} familias={familias} />)}
          <Link className="cg-familia-ver" to={`/congrega/familias/${fam.id}`}>Ver perfil familiar ›</Link>
        </div>
      )}
    </div>
  );
}

export default function Personas() {
  const { people, familias, isAdmin } = useCongrega();
  const [filtro, setFiltro] = useState('activos');
  const [buscar, setBuscar] = useState('');
  const [habitual, setHabitual] = useState('');
  const [abiertas, setAbiertas] = useState(() => new Set());
  const alternar = (id) => setAbiertas((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const q = norm(buscar);
  const filas = people.filter((p) => {
    if (filtro === 'inactivos' ? activo(p) : !activo(p)) return false;
    if (filtro === 'miembros' && !esMiembro(p)) return false;
    if (filtro === 'ninos' && !p.esNino) return false;
    if (habitual && p.tipo !== habitual) return false;
    if (!q) return true;
    const fam = p.familiaId && familias.get(p.familiaId);
    return norm(`${nombreDe(p)} ${p.apodo || ''} ${fam?.name || ''} ${(p.teams || []).join(' ')}`).includes(q);
  }).sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));

  let cuerpo;
  if (filtro === 'activos' && !habitual) {
    // Agrupadas por familia: cada familia es una fila que se despliega; quien no tiene familia aparece sola.
    const grupos = new Map(); const solos = [];
    filas.forEach((p) => { if (p.familiaId && familias.has(p.familiaId)) { if (!grupos.has(p.familiaId)) grupos.set(p.familiaId, []); grupos.get(p.familiaId).push(p); } else solos.push(p); });
    const items = [
      ...[...grupos].map(([id, ms]) => ({ orden: norm(familias.get(id).name), id, ms: ms.sort((a, b) => ((ORDEN_ROL[a.rolFamilia] ?? 3) - (ORDEN_ROL[b.rolFamilia] ?? 3))) })),
      ...solos.map((p) => ({ orden: norm(p.apellido || nombreDe(p)), p })),
    ].sort((a, b) => a.orden.localeCompare(b.orden));
    cuerpo = (
      <div className="card cg-lista" role="list">
        {items.length ? items.map((x) => (x.p ? <Fila key={x.p.key} p={x.p} familias={familias} />
          : <FilaFamilia key={x.id} fam={familias.get(x.id)} ms={x.ms} familias={familias} abierta={Boolean(q) || abiertas.has(x.id)} onToggle={() => alternar(x.id)} />))
          : <div className="muted cg-vacio">{people.length ? 'Nadie coincide con la búsqueda.' : `Todavía no hay personas.${isAdmin ? ' Agrégalas con + Nueva persona.' : ''}`}</div>}
      </div>
    );
  } else {
    cuerpo = (
      <div className="card cg-lista" role="list">
        {filas.length ? filas.map((p) => <Fila key={p.key} p={p} familias={familias} />)
          : <div className="muted cg-vacio">{people.length ? 'Nadie coincide con la búsqueda.' : `Todavía no hay personas.${isAdmin ? ' Agrégalas con + Nueva persona.' : ''}`}</div>}
      </div>
    );
  }

  return (
    <div className="cg-stack">
      <div className="page-head">
        <h1>Personas</h1>
        {isAdmin && <Link className="btn primary" to="/congrega/personas/nueva">+ Nueva persona</Link>}
      </div>
      <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar persona, familia o ministerio…" aria-label="Buscar persona" />
      <div className="cg-tags" role="group" aria-label="Filtrar">
        {FILTROS.map(([k, l]) => <button key={k} type="button" className="cg-tag" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>)}
        {isAdmin && <button type="button" className="cg-tag" aria-pressed={filtro === 'repetidos'} onClick={() => setFiltro('repetidos')}>Repetidos</button>}
        {filtro !== 'repetidos' && (
          <select className="cg-tag cg-habitual" value={habitual} onChange={(e) => setHabitual(e.target.value)} aria-label="Asistencia habitual">
            <option value="">Asistencia: cualquiera</option>
            {TIPOS.map((t) => <option key={t} value={t}>Asistencia: {t}</option>)}
          </select>
        )}
      </div>
      {filtro === 'repetidos' ? <><p className="muted">Elige qué perfil queda y presiona Unir. Si alguno es otra persona, toca "Es otra". También puedes unir dos perfiles cualquiera en Ajustes → Unir perfiles.</p><Repetidos /></> : (
        <>
          <div className="muted">{filas.length} {filas.length === 1 ? 'persona' : 'personas'}{filtro === 'activos' && !habitual ? ' · toca una familia para ver a sus integrantes' : ''}</div>
          {cuerpo}
        </>
      )}
    </div>
  );
}

