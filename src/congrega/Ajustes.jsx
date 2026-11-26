import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Avatar } from '../components/Avatares.jsx';
import { nombreDe, norm, useCongrega } from './datos.jsx';
import UnirPerfiles from './UnirPerfiles.jsx';
import MiFicha from './MiFicha.jsx';
import { PERFILES_EXTRA, PERFIL_PRINCIPAL, QUE_HACE, nombrePerfil, puedeCambiarPerfil } from './permisos.js';

export default function Ajustes() {
  const { isAdmin, dueno } = useCongrega();
  return (
    <div className="cg-stack">
      <div className="page-head"><h1>Ajustes</h1></div>
      <MiFicha />
      {isAdmin && <PerfilesAcceso />}
      {isAdmin && <UnirPerfiles />}
      {dueno && <Registro />}
    </div>
  );
}

/** Perfiles de acceso: perfil principal + perfiles extra de cada persona con cuenta. */
function PerfilesAcceso() {
  const c = useCongrega();
  const { people, churchId, church, myUid, cambiarPerfiles, equipo, removePerson } = c;
  const [miembros, setMiembros] = useState(null);
  const [abierto, setAbierto] = useState('');
  const [error, setError] = useState('');
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [perfilMasivo, setPerfilMasivo] = useState('colaborador');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState('');
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
  const editables = conCuenta.filter((p) => p.key !== myUid && puedeCambiarPerfil(c, { role: miembros.get(p.key)?.role, esDueno: p.key === owner }));
  const seleccion = editables.filter((p) => seleccionados.has(p.key));
  const perfilesMasivos = PERFIL_PRINCIPAL.filter(([k]) => k !== 'admin' || c.dueno);
  const alternarSeleccion = (uid) => setSeleccionados((actual) => {
    const nueva = new Set(actual);
    if (nueva.has(uid)) nueva.delete(uid); else nueva.add(uid);
    return nueva;
  });
  const seleccionarTodos = () => setSeleccionados((actual) => {
    const todos = editables.every((p) => actual.has(p.key));
    return todos ? new Set() : new Set(editables.map((p) => p.key));
  });
  const aplicarMasivo = async () => {
    if (!seleccion.length || procesando) return;
    setProcesando(true); setResultado(''); setError('');
    const cambios = await Promise.allSettled(seleccion.map((p) => cambiarPerfiles(p.key, perfilMasivo, miembros.get(p.key)?.perfiles || [])));
    const exitos = cambios.filter((r) => r.status === 'fulfilled').length;
    setSeleccionados(new Set(seleccion.filter((_, i) => cambios[i].status === 'rejected').map((p) => p.key)));
    setResultado(`Perfil actualizado para ${exitos} de ${cambios.length} usuarios.${exitos < cambios.length ? ` ${cambios.length - exitos} no se pudieron actualizar.` : ''}`);
    setProcesando(false);
  };
  const quitarSeleccionados = async () => {
    if (!seleccion.length || procesando) return;
    const nombres = seleccion.map(nombreDe).join(', ');
    const confirmado = window.confirm(`¿Quitar de esta iglesia a ${seleccion.length} usuario(s)?\n\n${nombres}\n\nEsto elimina su acceso y ficha en esta iglesia, pero no elimina su cuenta de Google/Firebase.`);
    if (!confirmado) return;
    setProcesando(true); setResultado(''); setError('');
    const cambios = await Promise.allSettled(seleccion.map((p) => removePerson(p.key)));
    const exitos = cambios.filter((r) => r.status === 'fulfilled').length;
    setSeleccionados(new Set(seleccion.filter((_, i) => cambios[i].status === 'rejected').map((p) => p.key)));
    setResultado(`Se quitaron ${exitos} de ${cambios.length} usuarios de la iglesia.${exitos < cambios.length ? ` ${cambios.length - exitos} no se pudieron quitar; puedes volver a intentarlo.` : ''}`);
    setProcesando(false);
  };

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
      {resultado && <div className="cg-aviso" role="status">{resultado}</div>}
      {miembros && editables.length > 0 && (
        <div className="cg-edicion-masiva">
          <div className="cg-edicion-masiva-cabeza">
            <div><strong>Edición masiva</strong><span className="muted small">Selecciona usuarios para cambiar su perfil o quitarles el acceso a esta iglesia.</span></div>
            <button type="button" className="btn small" onClick={seleccionarTodos} disabled={procesando}>
              {editables.every((p) => seleccionados.has(p.key)) ? 'Desmarcar todos' : 'Seleccionar editables'}
            </button>
          </div>
          {seleccion.length > 0 && (
            <div className="cg-edicion-masiva-acciones">
              <span className="muted">{seleccion.length} seleccionado(s)</span>
              <label className="cg-dato cg-masivo-perfil"><span>Asignar perfil principal</span>
                <select value={perfilMasivo} onChange={(e) => setPerfilMasivo(e.target.value)} disabled={procesando}>
                  {perfilesMasivos.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <button type="button" className="btn primary small" onClick={aplicarMasivo} disabled={procesando}>{procesando ? 'Procesando…' : 'Aplicar perfil'}</button>
              <button type="button" className="btn small peligro" onClick={quitarSeleccionados} disabled={procesando}>{procesando ? 'Procesando…' : 'Quitar de la iglesia'}</button>
            </div>
          )}
          <p className="muted small">No puedes seleccionarte a ti mismo ni al Súper admin. Los administradores solo pueden quitar a otros administradores si son Súper admin.</p>
        </div>
      )}
      <div className="card cg-lista">
        {!miembros && <div className="muted cg-vacio">Cargando…</div>}
        {conCuenta.map((p) => {
          const m = miembros.get(p.key);
          const yo = p.key === myUid;
          const editable = puedeCambiarPerfil(c, { role: m?.role, esDueno: p.key === owner });
          const extras = m?.perfiles || [];
          const abiertoAqui = abierto === p.key;
          const seleccionable = p.key !== myUid && editable;
          return (
            <div key={p.key} className="cg-item cg-perfil-acceso">
              {seleccionable && <input className="cg-checkbox" type="checkbox" aria-label={`Seleccionar a ${nombreDe(p)}`} checked={seleccionados.has(p.key)} onChange={() => alternarSeleccion(p.key)} disabled={procesando} />}
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
