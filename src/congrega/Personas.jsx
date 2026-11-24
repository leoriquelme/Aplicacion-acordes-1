import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TIPOS, activo, esMiembro, nombreDe, norm, useCongrega } from './datos.jsx';
import { Repetidos } from './UnirPerfiles.jsx';
import { Avatar } from '../components/Avatares.jsx';

const FILTROS = [['activos', 'Todos'], ['familias', 'Por familia'], ['miembros', 'Miembros'], ['ninos', 'Niños'], ['inactivos', 'Inactivos']];
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

export default function Personas() {
  const { people, familias, isAdmin } = useCongrega();
  const [filtro, setFiltro] = useState('activos');
  const [buscar, setBuscar] = useState('');
  const [habitual, setHabitual] = useState('');
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
  if (filtro === 'familias') {
    const grupos = new Map();
    filas.forEach((p) => { const k = p.familiaId && familias.has(p.familiaId) ? p.familiaId : ''; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); });
    const claves = [...grupos.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : norm(familias.get(a).name).localeCompare(norm(familias.get(b).name))));
    cuerpo = claves.map((k) => {
      const ms = grupos.get(k).sort((a, b) => ((ORDEN_ROL[a.rolFamilia] ?? 3) - (ORDEN_ROL[b.rolFamilia] ?? 3)));
      return (
        <section key={k || 'sin'} className="cg-stack">
          <h3 className="cg-h3">{k ? `Familia ${familias.get(k).name}` : 'Sin familia asignada'} <span className="muted">· {ms.length}</span></h3>
          <div className="card cg-lista" role="list">{ms.map((p) => <Fila key={p.key} p={p} familias={familias} />)}</div>
        </section>
      );
    });
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
          <div className="muted">{filas.length} {filas.length === 1 ? 'persona' : 'personas'}</div>
          {cuerpo}
        </>
      )}
    </div>
  );
}

