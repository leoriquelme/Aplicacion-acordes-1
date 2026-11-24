import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Avatar } from '../components/Avatares.jsx';
import { nombreDe, norm, useCongrega } from './datos.jsx';
import UnirPerfiles from './UnirPerfiles.jsx';
import { PERFILES_EXTRA, PERFIL_PRINCIPAL, QUE_HACE, nombrePerfil, puedeCambiarPerfil } from './permisos.js';

export default function Ajustes() {
  const { isAdmin, dueno } = useCongrega();
  if (!isAdmin) return <div className="card">Solo el Administrador de la iglesia ve los ajustes de Congrega.</div>;
  return (
    <div className="cg-stack">
      <div className="page-head"><h1>Ajustes</h1></div>
      <PerfilesAcceso />
      <UnirPerfiles />
      {dueno && <Registro />}
    </div>
  );
}

/** Perfiles de acceso: perfil principal + perfiles extra de cada persona con cuenta. */
function PerfilesAcceso() {
  const c = useCongrega();
  const { people, churchId, church, myUid, cambiarPerfiles, equipo } = c;
  const [miembros, setMiembros] = useState(null);
  const [abierto, setAbierto] = useState('');
  const [error, setError] = useState('');
  useEffect(() => onSnapshot(collection(db, 'churches', churchId, 'members'), (s) => setMiembros(new Map(s.docs.map((d) => [d.id, d.data()]))), () => setMiembros(new Map())), [churchId]);
  const owner = church?.ownerUid;
  const conCuenta = people.filter((p) => p.uid && miembros?.has(p.key))
    .sort((a, b) => (b.key === owner) - (a.key === owner) || norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const etiquetas = (uid, m) => [
    uid === owner ? 'Súper admin' : nombrePerfil(m?.role),
    ...(m?.perfiles || []).map(nombrePerfil),
    ...(equipo.get(uid)?.estado === 'aceptado' ? ['Encargado de asistencia'] : []),
  ];
  const guardar = (uid, role, perfiles) => cambiarPerfiles(uid, role, perfiles).catch((e) => setError(`No se pudo cambiar: ${e.message}`));

  return (
    <section className="card cg-stack">
      <h2>Perfiles de acceso</h2>
      <p className="muted">Cada persona tiene un perfil principal y puede sumar otros (por ejemplo, Pastor y Director musical). El Encargado de asistencia se elige en la pestaña <strong>Estación</strong>.</p>
      <details className="cg-que-hace">
        <summary>Qué hace cada perfil</summary>
        <dl>
          {[['dueno', 'Súper admin'], ...PERFIL_PRINCIPAL.slice(0, 1), ['pastor', 'Pastor'], ['director', 'Director musical'], ['asisAdmin', 'Administrativo de asistencia'], ['asistencia', 'Encargado de asistencia'], ['colaborador', 'Colaborador'], ['miembro', 'Miembro']].map(([k, l]) => (
            <div key={k}><dt>{l}</dt><dd>{QUE_HACE[k]}</dd></div>
          ))}
        </dl>
      </details>
      {error && <div className="cg-aviso" role="alert">{error}</div>}
      <div className="card cg-lista">
        {!miembros && <div className="muted cg-vacio">Cargando…</div>}
        {conCuenta.map((p) => {
          const m = miembros.get(p.key);
          const yo = p.key === myUid;
          const editable = puedeCambiarPerfil(c, { role: m?.role, esDueno: p.key === owner });
          const extras = m?.perfiles || [];
          const abiertoAqui = abierto === p.key;
          return (
            <div key={p.key} className="cg-item cg-perfil-acceso">
              <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
              <span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}{yo && <span className="muted"> (tú)</span>}</span>
                <span className="cg-meta cg-etiquetas">{etiquetas(p.key, m).map((e) => <span key={e} className="cg-chip">{e}</span>)}</span>
                <span className="cg-meta">{c.cuentas?.get(p.key)?.email ? `Google: ${c.cuentas.get(p.key).email}` : 'Google: el correo aparece cuando vuelva a abrir la app'}</span>
              </span>
              {(editable || yo) && <button type="button" className="btn small" aria-expanded={abiertoAqui} onClick={() => setAbierto(abiertoAqui ? '' : p.key)}>{abiertoAqui ? 'Listo' : 'Cambiar'}</button>}
              {abiertoAqui && (
                <div className="cg-perfil-editar">
                  {editable && !yo && (
                    <label className="cg-dato"><span>Perfil principal</span>
                      <select value={m?.role || 'colaborador'} onChange={(e) => guardar(p.key, e.target.value, extras)}>
                        {PERFIL_PRINCIPAL.filter(([k]) => k !== 'admin' || c.dueno || m?.role === 'admin').map(([k, l]) => <option key={k} value={k} disabled={k === 'admin' && !c.dueno}>{l}</option>)}
                      </select>
                    </label>
                  )}
                  {m?.role !== 'admin' && (
                    <div className="cg-dato"><span>Además es</span>
                      <div className="cg-tags">
                        {PERFILES_EXTRA.map(([k, l]) => (
                          <button key={k} type="button" className="cg-tag" aria-pressed={extras.includes(k)}
                            onClick={() => guardar(p.key, m?.role || 'colaborador', extras.includes(k) ? extras.filter((x) => x !== k) : [...extras, k])}>{l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {m?.role === 'admin' && <p className="muted small">El Administrador ya puede hacer todo lo de los demás perfiles.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted small">Solo aparecen quienes ya entraron a la app con su cuenta. Las personas sin cuenta no tienen acceso.</p>
    </section>
  );
}

/** Registro de cambios: solo el Súper admin. */
function Registro() {
  const { churchId } = useCongrega();
  const [filas, setFilas] = useState(null);
  const [ver, setVer] = useState(false);
  useEffect(() => {
    if (!ver) return undefined;
    return onSnapshot(query(collection(db, 'churches', churchId, 'registro'), orderBy('at', 'desc'), limit(100)), (s) => setFilas(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setFilas([]));
  }, [churchId, ver]);
  return (
    <section className="card cg-stack">
      <div className="cg-row cg-entre"><h2>Registro de cambios</h2><button type="button" className="btn small" onClick={() => setVer(!ver)}>{ver ? 'Ocultar' : 'Ver'}</button></div>
      <p className="muted">Quién cambió qué y cuándo (los últimos 100). Solo lo ves tú, como Súper admin. No se puede borrar.</p>
      {ver && (
        <div className="card cg-lista">
          {!filas ? <div className="muted cg-vacio">Cargando…</div> : !filas.length ? <div className="muted cg-vacio">Todavía no hay cambios registrados.</div> : filas.map((f) => (
            <div key={f.id} className="cg-item">
              <span className="cg-quien">
                <span className="cg-nombre">{f.nombre || 'Alguien'} · {f.accion}{f.persona ? `: ${f.persona}` : ''}</span>
                <span className="cg-meta">{new Date(f.at).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}{f.detalle ? ` · ${f.detalle}` : ''}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
