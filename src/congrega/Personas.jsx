import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TIPOS, activo, esMiembro, nombreDe, norm, useCongrega } from './datos.jsx';
import { gruposDuplicados } from './unir.js';
import { Avatar } from '../components/Avatares.jsx';

const FILTROS = [['activos', 'Activos'], ['familias', 'Por familia'], ['miembros', 'Miembros'], ...TIPOS.map((t) => [t, t]), ['ninos', 'Niños'], ['inactivos', 'Inactivos']];
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
  const q = norm(buscar);
  const filas = people.filter((p) => {
    if (filtro === 'inactivos' ? activo(p) : !activo(p)) return false;
    if (filtro === 'miembros' && !esMiembro(p)) return false;
    if (filtro === 'ninos' && !p.esNino) return false;
    if (TIPOS.includes(filtro) && p.tipo !== filtro) return false;
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
          : <div className="muted cg-vacio">{people.length ? 'Nadie coincide con la búsqueda.' : `Todavía no hay personas.${isAdmin ? ' Impórtalas desde Planning Center en Ajustes.' : ''}`}</div>}
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
      </div>
      {filtro === 'repetidos' ? <Repetidos /> : (
        <>
          <div className="muted">{filas.length} {filas.length === 1 ? 'persona' : 'personas'}</div>
          {cuerpo}
        </>
      )}
    </div>
  );
}

/** Personas con el mismo nombre (vienen de distintas bases): el Administrador las une en una. */
function Repetidos() {
  const { people, familias, asistencia, unirPersonas } = useCongrega();
  const [queda, setQueda] = useState({});
  const [quitar, setQuitar] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState('');
  const veces = new Map(); asistencia.forEach((a) => veces.set(a.personKey, (veces.get(a.personKey) || 0) + 1));
  const grupos = gruposDuplicados(people).sort((a, b) => norm(nombreDe(a[0])).localeCompare(norm(nombreDe(b[0]))));
  if (!grupos.length) return <div className="card muted cg-vacio">No hay personas con el mismo nombre y primer apellido. {aviso}</div>;
  const unir = async (g, id) => {
    const marcadas = g.filter((p) => !quitar[`${id}|${p.key}`]);
    const principal = marcadas.find((p) => p.key === queda[id]) || marcadas.find((p) => p.uid) || marcadas[0];
    setOcupado(id); setAviso('');
    try {
      await unirPersonas(principal.key, marcadas.filter((p) => p.key !== principal.key).map((p) => p.key));
      setAviso(`Listo: ${nombreDe(principal)} quedó como una sola persona.`);
    } catch (e) { setAviso(`No se pudo unir: ${e.message}`); }
    setOcupado('');
  };
  return (
    <div className="cg-stack">
      <p className="muted">Estas personas tienen el mismo nombre y primer apellido. Si son la misma, elige qué ficha queda y presiona Unir: se juntan sus datos, familia, ministerios y toda su asistencia. Desmarca a quien sea otra persona.</p>
      {aviso && <div className="cg-aviso info" aria-live="polite">{aviso}</div>}
      {grupos.map((g) => {
        const id = g.map((p) => p.key).sort().join('|');
        const marcadas = g.filter((p) => !quitar[`${id}|${p.key}`]);
        const elegida = marcadas.find((p) => p.key === queda[id]) || marcadas.find((p) => p.uid) || marcadas[0];
        return (
          <section key={id} className="card cg-stack">
            <div className="card cg-lista">
              {g.map((p) => {
                const fam = p.familiaId && familias.get(p.familiaId);
                const fuera = quitar[`${id}|${p.key}`];
                return (
                  <label key={p.key} className="cg-item">
                    <input type="radio" className="cg-checkbox" name={id} checked={!fuera && elegida?.key === p.key} disabled={fuera || Boolean(ocupado)} onChange={() => setQueda({ ...queda, [id]: p.key })} />
                    <span className="cg-quien">
                      <span className="cg-nombre">{nombreDe(p)}{!fuera && elegida?.key === p.key ? ' · queda esta' : ''}</span>
                      <span className="cg-meta">
                        {p.uid && <span className="cg-chip ok">Con cuenta</span>}
                        {p.tipo && <span className="cg-chip">{p.tipo}</span>}
                        {fam && <span>{fam.name}</span>}
                        <span>{veces.get(p.key) || 0} asistencias</span>
                      </span>
                    </span>
                    <button type="button" className="btn small ghost" disabled={Boolean(ocupado)} onClick={(e) => { e.preventDefault(); setQuitar({ ...quitar, [`${id}|${p.key}`]: !fuera }); }}>{fuera ? 'Incluir' : 'No es la misma'}</button>
                  </label>
                );
              })}
            </div>
            <button type="button" className="btn primary cg-izq" disabled={marcadas.length < 2 || Boolean(ocupado)} onClick={() => unir(g, id)}>
              {ocupado === id ? 'Uniendo…' : `Unir ${marcadas.length} en una`}
            </button>
          </section>
        );
      })}
    </div>
  );
}
