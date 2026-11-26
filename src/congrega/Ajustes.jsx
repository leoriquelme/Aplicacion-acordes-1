import { useEffect, useState } from 'react';
import { collection, deleteField, doc, getDocs, limit, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Avatar } from '../components/Avatares.jsx';
import { CIVIL, RANGOS, ROLES_FAMILIA, TIPOS, nombreDe, norm, useCongrega } from './datos.jsx';
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
      {isAdmin && <EdicionMasiva />}
      {isAdmin && <MigrarEstadosPrivados />}
      {isAdmin && <UnirPerfiles />}
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
  useEffect(() => onSnapshot(collection(db, 'churches', churchId, 'members'), (snap) => setMiembros(new Map(snap.docs.map((d) => [d.id, d.data()]))), () => setMiembros(new Map())), [churchId]);
  const owner = church?.ownerUid;
  const conCuenta = people.filter((p) => p.uid && miembros?.has(p.key))
    .sort((a, b) => (b.key === owner) - (a.key === owner) || norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const etiquetas = (uid, m) => [
    uid === owner ? 'Súper admin' : nombrePerfil(m?.role),
    ...(m?.perfiles || []).map(nombrePerfil),
    ...(equipo.get(uid)?.estado === 'aceptado' ? ['Encargado de asistencia'] : []),
  ];
  const guardar = (uid, role, perfiles) => cambiarPerfiles(uid, role, perfiles).catch((e) => setError('No se pudo cambiar: ' + e.message));

  return (
    <section className="card cg-stack">
      <h2>Perfiles de acceso</h2>
      <p className="muted">Cambia el rol de acceso de cada persona con cuenta. Para corregir datos de las fichas de toda la congregación, usa Edición masiva más abajo.</p>
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
                <span className="cg-meta">{c.cuentas?.get(p.key)?.email ? 'Google: ' + c.cuentas.get(p.key).email : 'Google: el correo aparece cuando vuelva a abrir la app'}</span>
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
      <p className="muted small">Solo aparecen quienes ya entraron con una cuenta. Los roles de acceso se administran individualmente aquí.</p>
    </section>
  );
}

const pNombreSeleccionado = (p) => p?.nombre || (!p?.apellido && p?.name ? p.name.trim().split(/\s+/)[0] : '');
const pApellidoSeleccionado = (p) => p?.apellido || (!p?.nombre && p?.name ? p.name.trim().split(/\s+/).slice(1).join(' ') : '');

const CAMPOS_MASIVOS = [
  { key: 'nombre', label: 'Nombre', grupo: 'persona', tipo: 'texto', requerido: true },
  { key: 'apellido', label: 'Apellidos', grupo: 'persona', tipo: 'texto' },
  { key: 'apodo', label: 'Apodo', grupo: 'persona', tipo: 'texto' },
  { key: 'segundoNombre', label: 'Segundo nombre', grupo: 'ficha', tipo: 'texto' },
  { key: 'miembro', label: 'Es miembro', grupo: 'persona', tipo: 'bool' },
  { key: 'tipo', label: 'Asistencia habitual', grupo: 'persona', tipo: 'select', opciones: TIPOS },
  { key: 'estado', label: 'Estado de actividad', grupo: 'persona', tipo: 'select', opciones: [['activo', 'Activo'], ['inactivo', 'Inactivo']] },
  { key: 'motivoInactivo', label: 'Motivo de inactividad', grupo: 'ficha', tipo: 'select', opciones: ['Cambio de iglesia', 'Cambio de domicilio', 'No volvió a asistir', 'Fallecido/a', 'Otro'] },
  { key: 'fechaInactivo', label: 'Inactivo desde', grupo: 'ficha', tipo: 'fecha' },
  { key: 'rangoEdad', label: 'Rango de edad', grupo: 'persona', tipo: 'select', opciones: RANGOS },
  { key: 'esNino', label: 'Es niño/a', grupo: 'persona', tipo: 'bool' },
  { key: 'familiaId', label: 'Familia', grupo: 'persona', tipo: 'familia' },
  { key: 'rolFamilia', label: 'Rol en la familia', grupo: 'persona', tipo: 'select', opciones: ROLES_FAMILIA },
  { key: 'teams', label: 'Ministerio o equipo (reemplaza los actuales)', grupo: 'persona', tipo: 'texto' },
  { key: 'fechaNacimiento', label: 'Fecha de nacimiento', grupo: 'ficha', tipo: 'fecha' },
  { key: 'genero', label: 'Género', grupo: 'ficha', tipo: 'select', opciones: ['Femenino', 'Masculino', 'Prefiere no decir'] },
  { key: 'estadoCivil', label: 'Estado civil', grupo: 'ficha', tipo: 'select', opciones: CIVIL },
  { key: 'aniversario', label: 'Aniversario de matrimonio', grupo: 'ficha', tipo: 'fecha' },
  { key: 'telefono', label: 'Celular', grupo: 'ficha', tipo: 'texto' },
  { key: 'email', label: 'Correo', grupo: 'ficha', tipo: 'email' },
  { key: 'direccion', label: 'Dirección', grupo: 'ficha', tipo: 'texto' },
  { key: 'comuna', label: 'Comuna', grupo: 'ficha', tipo: 'texto' },
  { key: 'region', label: 'Región', grupo: 'ficha', tipo: 'texto' },
  { key: 'fechaLlegada', label: 'Fecha de llegada a la iglesia', grupo: 'ficha', tipo: 'fecha' },
  { key: 'fechaConversion', label: 'Fecha de conversión', grupo: 'ficha', tipo: 'fecha' },
  { key: 'bautizado', label: 'Bautizado/a', grupo: 'ficha', tipo: 'bool' },
  { key: 'fechaBautismo', label: 'Fecha de bautismo', grupo: 'ficha', tipo: 'fecha' },
  { key: 'consentimiento', label: 'Consentimiento de datos', grupo: 'ficha', tipo: 'bool' },
  { key: 'fechaConsentimiento', label: 'Fecha de consentimiento', grupo: 'ficha', tipo: 'fecha' },
  { key: 'medioConsentimiento', label: 'Medio del consentimiento', grupo: 'ficha', tipo: 'select', opciones: ['Formulario en papel', 'Formulario digital', 'Verbal', 'Entregados por la persona'] },
  { key: 'notaConsentimiento', label: 'Nota del consentimiento', grupo: 'ficha', tipo: 'texto' },
  { key: 'notas', label: 'Notas pastorales', grupo: 'ficha', tipo: 'area', max: 5000 },
  { key: 'notasMedicas', label: 'Notas médicas', grupo: 'ficha', tipo: 'area', max: 3000 },
];

function EdicionMasiva() {
  const c = useCongrega();
  const { people, familias, fichas, notas, asistencia, churchId, church, myUid, eliminarPersona, guardarPersona } = c;
  const [miembros, setMiembros] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [campo, setCampo] = useState(CAMPOS_MASIVOS[0].key);
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState('');
  const [confirmarEdicion, setConfirmarEdicion] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [palabraBorrado, setPalabraBorrado] = useState('');
  const [confirmoConsentimiento, setConfirmoConsentimiento] = useState(false);
  const [confirmoNotas, setConfirmoNotas] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => onSnapshot(collection(db, 'churches', churchId, 'members'), (snap) => setMiembros(new Map(snap.docs.map((d) => [d.id, d.data()]))), () => setMiembros(new Map())), [churchId]);
  const owner = church?.ownerUid;
  const ordenadas = [...people].sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const elegibles = ordenadas.filter((p) => p.key !== myUid && p.key !== owner && (!p.uid || (miembros?.has(p.key) && puedeCambiarPerfil(c, { role: miembros.get(p.key)?.role || 'colaborador', esDueno: p.key === owner }))));
  const asistenciasPorPersona = new Map();
  asistencia.forEach((a) => asistenciasPorPersona.set(a.personKey, (asistenciasPorPersona.get(a.personKey) || 0) + 1));
  const q = norm(buscar);
  const visibles = elegibles.filter((p) => {
    const pasaBusqueda = !q || norm(nombreDe(p)).includes(q) || norm(p.tipo || '').includes(q) || norm(p.email || fichas.get(p.key)?.email || '').includes(q);
    const pasaFiltro = filtro === 'visitas' ? p.tipo === 'Visita'
      : filtro === 'una-visita' ? p.tipo === 'Visita' && asistenciasPorPersona.get(p.key) === 1
        : filtro === 'sin-cuenta' ? !p.uid
          : filtro === 'inactivos' ? p.estado === 'inactivo' : true;
    return pasaBusqueda && pasaFiltro;
  });
  const seleccion = elegibles.filter((p) => seleccionados.has(p.key));
  const def = CAMPOS_MASIVOS.find((x) => x.key === campo) || CAMPOS_MASIVOS[0];
  const mostrarValor = (x) => {
    if (def.key === 'familiaId' && !x) return 'Sin familia';
    if (def.key === 'teams' && Array.isArray(x)) return x.length ? x.join(', ') : 'vacío';
    if (x === '__vaciar' || x === null || x === '') return 'vacío';
    if (x === true) return 'Sí';
    if (x === false) return 'No';
    if (def.key === 'familiaId') return x ? (familias.get(x)?.name || 'Familia seleccionada') : 'Sin familia';
    if (def.key === 'estado') return x === 'activo' ? 'Activo' : 'Inactivo';
    return String(x);
  };
  const toggle = (key) => setSeleccionados((antes) => {
    const despues = new Set(antes);
    if (despues.has(key)) despues.delete(key); else despues.add(key);
    return despues;
  });
  const toggleVisibles = () => setSeleccionados((antes) => {
    const todos = visibles.length > 0 && visibles.every((p) => antes.has(p.key));
    const despues = new Set(antes);
    visibles.forEach((p) => todos ? despues.delete(p.key) : despues.add(p.key));
    return despues;
  });
  const normalizarValor = () => {
    if (valor === '__vaciar') return null;
    if (def.tipo === 'bool') return valor === '' ? undefined : valor === 'si';
    if (def.tipo === 'familia') return valor || null;
    if (def.key === 'teams') return valor.trim() ? [valor.trim().slice(0, 80)] : [];
    if (valor === '') return null;
    if (def.tipo === 'texto' || def.tipo === 'email') return valor.trim().slice(0, 120);
    return valor;
  };
  const validar = () => {
    if (!seleccion.length) return 'Selecciona al menos una persona.';
    if (def.tipo === 'bool' && valor === '') return 'Elige Sí o No.';
    if (def.tipo === 'select' && valor === '') return 'Elige un valor.';
    if (def.requerido && !valor.trim()) return 'El nombre no puede quedar vacío.';
    if (['nombre', 'apellido'].includes(def.key)) {
      const nombreLargo = seleccion.some((p) => {
        const nombreNuevo = def.key === 'nombre' ? valor.trim() : pNombreSeleccionado(p);
        const apellidoNuevo = def.key === 'apellido' ? valor.trim() : pApellidoSeleccionado(p);
        return (nombreNuevo + ' ' + apellidoNuevo).trim().length > 60;
      });
      if (nombreLargo) return 'El nombre completo no puede superar 60 caracteres.';
    }
    if (def.tipo === 'email' && valor.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())) return 'Escribe un correo válido.';
    if (def.tipo === 'texto' && valor.length > 120) return 'El texto no puede superar 120 caracteres.';
    if (def.tipo === 'area' && valor.length > def.max) return 'El texto no puede superar ' + def.max + ' caracteres.';
    if (def.tipo === 'familia' && valor && !familias.has(valor)) return 'La familia elegida ya no existe.';
    if (def.tipo === 'fecha' && valor && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Selecciona una fecha válida.';
    if (def.key === 'consentimiento' && valor === 'si' && !confirmoConsentimiento) return 'Confirma que todas las personas seleccionadas dieron su consentimiento.';
    if (['notas', 'notasMedicas'].includes(def.key) && !confirmoNotas) return 'Confirma que deseas reemplazar estas notas en todas las fichas seleccionadas.';
    return '';
  };
  const prepararEdicion = () => {
    const mensaje = validar();
    if (mensaje) { setError(mensaje); return; }
    setError(''); setResultado(''); setConfirmarEdicion(true); setConfirmarBorrado(false);
  };
  const aplicarEdicion = async () => {
    const mensaje = validar();
    if (mensaje) { setError(mensaje); setConfirmarEdicion(false); return; }
    setProcesando(true); setError(''); setResultado('');
    const v = normalizarValor();
    const fallidos = [];
    let exitos = 0;
    for (const p of seleccion) {
      try {
        if (def.grupo === 'ficha') {
          const anterior = { ...(fichas.get(p.key) || {}), ...(notas.get(p.key) || {}) };
          let personaPublica = null;
          if (def.key === 'fechaNacimiento' || def.key === 'aniversario') {
            const campoPublico = def.key === 'fechaNacimiento' ? 'birthday' : 'aniversarioMD';
            personaPublica = { name: nombreDe(p), [campoPublico]: v ? v.slice(5) : (campoPublico === 'birthday' ? deleteField() : null) };
          }
          await guardarPersona(p.key, personaPublica, { ...anterior, [def.key]: v }, [def.label]);
        } else {
          const persona = { name: nombreDe(p), [def.key]: v };
          if (def.key === 'nombre' || def.key === 'apellido') {
            const nombre = def.key === 'nombre' ? v : pNombreSeleccionado(p);
            const apellido = def.key === 'apellido' ? (v || '') : pApellidoSeleccionado(p);
            persona.name = [nombre, apellido].filter(Boolean).join(' ').slice(0, 60);
          }
          await guardarPersona(p.key, persona, fichas.get(p.key) || {}, [def.label]);
        }
        exitos++;
      } catch (e) { fallidos.push({ key: p.key, texto: nombreDe(p) + ': ' + e.message }); }
    }
    setProcesando(false); setConfirmarEdicion(false);
    setResultado('Se actualizaron ' + exitos + ' de ' + seleccion.length + ' fichas.' + (fallidos.length ? ' Fallaron: ' + fallidos.slice(0, 3).map((f) => f.texto).join('; ') + (fallidos.length > 3 ? '; y ' + (fallidos.length - 3) + ' más.' : '.') : ''));
    setSeleccionados(new Set(fallidos.map((f) => f.key)));
    setValor(''); setConfirmoConsentimiento(false);
  };
  const iniciarBorrado = () => {
    if (!seleccion.length) { setError('Selecciona al menos una ficha.'); return; }
    setError(''); setResultado(''); setConfirmarBorrado(true); setConfirmarEdicion(false); setPalabraBorrado('');
  };
  const borrarSeleccion = async () => {
    if (palabraBorrado !== 'ELIMINAR') { setError('Escribe ELIMINAR para confirmar.'); return; }
    setProcesando(true); setError(''); setResultado('');
    const fallidos = [];
    let exitos = 0;
    for (const p of seleccion) {
      try { await eliminarPersona(p.key); exitos++; }
      catch (e) { fallidos.push({ key: p.key, texto: nombreDe(p) + ': ' + e.message }); }
    }
    setProcesando(false); setConfirmarBorrado(false); setPalabraBorrado('');
    setResultado('Se eliminaron ' + exitos + ' de ' + seleccion.length + ' perfiles.' + (fallidos.length ? ' No se pudieron eliminar: ' + fallidos.slice(0, 3).map((f) => f.texto).join('; ') + (fallidos.length > 3 ? '; y ' + (fallidos.length - 3) + ' más.' : '.') : ''));
    setSeleccionados(new Set(fallidos.map((f) => f.key)));
  };
  const cuentasSeleccionadas = seleccion.filter((p) => p.uid).length;
  const visitasSeleccionadas = seleccion.filter((p) => p.tipo === 'Visita' || p.miembro === false).length;
  const visitasDeUnaVez = seleccion.filter((p) => p.tipo === 'Visita' && asistenciasPorPersona.get(p.key) === 1).length;

  return (
    <section className="card cg-stack">
      <h2>Edición masiva de fichas</h2>
      <p className="muted">Corrige un dato en varias fichas a la vez. Incluye miembros, personas sin cuenta y visitas. Los cambios de rol de acceso se hacen individualmente en Perfiles de acceso; las notas pastorales y médicas siguen editándose una ficha a la vez.</p>
      <div className="cg-grid">
        <label className="cg-dato"><span>Buscar personas</span><input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, tipo o correo" /></label>
        <label className="cg-dato"><span>Filtrar lista</span><select value={filtro} onChange={(e) => { setFiltro(e.target.value); setSeleccionados(new Set()); }}><option value="todas">Toda la congregación</option><option value="visitas">Visitas</option><option value="una-visita">Visitas con una asistencia</option><option value="sin-cuenta">Fichas sin cuenta</option><option value="inactivos">Inactivos</option></select></label>
      </div>
      <div className="cg-edicion-masiva-cabeza">
        <strong>{seleccion.length} seleccionada(s) · {visibles.length} visible(s)</strong>
        <button type="button" className="btn small" onClick={toggleVisibles} disabled={!miembros || !visibles.length || procesando}>{visibles.length && visibles.every((p) => seleccionados.has(p.key)) ? 'Desmarcar visibles' : 'Seleccionar visibles'}</button>
      </div>
      <div className="card cg-lista cg-masivo-lista">
        {!miembros && <div className="muted cg-vacio">Cargando permisos…</div>}
        {miembros && !visibles.length && <div className="muted cg-vacio">No hay personas para mostrar.</div>}
        {miembros && visibles.map((p) => {
          const m = miembros.get(p.key);
          const seleccionable = seleccion.some((x) => x.key === p.key) || (!p.uid || puedeCambiarPerfil(c, { role: m?.role || 'colaborador', esDueno: p.key === owner }));
          return (
            <label key={p.key} className="cg-item cg-perfil-acceso">
              <input type="checkbox" className="cg-checkbox" checked={seleccionados.has(p.key)} onChange={() => toggle(p.key)} disabled={!miembros || !seleccionable || procesando} aria-label={'Seleccionar a ' + nombreDe(p)} />
              <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
              <span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}</span>
                <span className="cg-meta">{[p.tipo || 'Sin tipo', p.uid ? 'Cuenta en Iglesia' : 'Sin cuenta', p.estado === 'inactivo' ? 'Inactivo' : 'Activo'].join(' · ')}</span>
              </span>
            </label>
          );
        })}
      </div>
      {seleccion.length > 0 && (
        <div className="cg-edicion-masiva">
          <div className="cg-grid">
            <label className="cg-dato"><span>Dato que corregir</span>
              <select value={campo} onChange={(e) => { setCampo(e.target.value); setValor(''); setConfirmoConsentimiento(false); setConfirmoNotas(false); setConfirmarEdicion(false); }}>
                {CAMPOS_MASIVOS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
            </label>
            <label className="cg-dato"><span>Nuevo valor{def.tipo === 'familia' ? '' : ' para todas las seleccionadas'}</span>
              {def.tipo === 'select' && <select value={valor} onChange={(e) => setValor(e.target.value)}><option value="">Selecciona…</option>{def.opciones.map((o) => { const pair = Array.isArray(o) ? o : [o, o]; return <option key={pair[0]} value={pair[0]}>{pair[1]}</option>; })}<option value="__vaciar">Vaciar campo</option></select>}
              {def.tipo === 'bool' && <select value={valor} onChange={(e) => setValor(e.target.value)}><option value="">Selecciona…</option><option value="si">Sí</option><option value="no">No</option></select>}
              {def.tipo === 'familia' && <select value={valor} onChange={(e) => setValor(e.target.value)}><option value="">Sin familia</option>{[...familias.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
              {['texto', 'email', 'fecha'].includes(def.tipo) && <input type={def.tipo === 'fecha' ? 'date' : def.tipo === 'email' ? 'email' : 'text'} value={valor} onChange={(e) => setValor(e.target.value)} maxLength={120} />}
              {def.tipo === 'area' && <textarea value={valor} onChange={(e) => setValor(e.target.value)} maxLength={def.max} rows={4} />}
            </label>
          </div>
          {def.key === 'consentimiento' && valor === 'si' && <label className="cg-masivo-legal"><input type="checkbox" checked={confirmoConsentimiento} onChange={(e) => setConfirmoConsentimiento(e.target.checked)} /> Confirmo que todas las personas seleccionadas dieron su consentimiento.</label>}
          {['notas', 'notasMedicas'].includes(def.key) && <label className="cg-masivo-legal"><input type="checkbox" checked={confirmoNotas} onChange={(e) => setConfirmoNotas(e.target.checked)} /> Confirmo que quiero reemplazar las notas de todas las fichas seleccionadas.</label>}
          {error && <div className="cg-aviso" role="alert">{error}</div>}
          {resultado && <div className="cg-aviso" role="status">{resultado}</div>}
          {!confirmarEdicion ? (
            <button type="button" className="btn primary" onClick={prepararEdicion} disabled={procesando}>Revisar cambio</button>
          ) : (
            <div className="cg-edicion-preview">
              <strong>Validación del cambio</strong>
              <p>Se cambiará “{def.label}” a “{mostrarValor(normalizarValor())}” en {seleccion.length} ficha(s):</p>
              <p className="muted small">{seleccion.slice(0, 8).map(nombreDe).join(', ')}{seleccion.length > 8 ? ' y ' + (seleccion.length - 8) + ' más.' : ''}</p>
              <div className="cg-row">
                <button type="button" className="btn primary" onClick={aplicarEdicion} disabled={procesando}>{procesando ? 'Aplicando…' : 'Confirmar y aplicar'}</button>
                <button type="button" className="btn" onClick={() => setConfirmarEdicion(false)} disabled={procesando}>Volver</button>
              </div>
            </div>
          )}
          {!confirmarBorrado ? <button type="button" className="btn peligro" onClick={iniciarBorrado} disabled={procesando}>Eliminar perfiles seleccionados</button> : (
            <div className="cg-edicion-preview cg-confirmar-borrado">
              <strong>Confirma la eliminación permanente</strong>
              <p>Se eliminarán {seleccion.length} perfiles, incluyendo datos personales y registros de asistencia; esta acción no se puede deshacer.</p>
              <p>{visitasSeleccionadas} visita(s), de ellas {visitasDeUnaVez} con una sola asistencia · {cuentasSeleccionadas} usuario(s) con cuenta. Las cuentas de Google/Firebase no se eliminan; se les quitará acceso a esta iglesia.</p>
              <p className="muted small">{seleccion.slice(0, 8).map(nombreDe).join(', ')}{seleccion.length > 8 ? ' y ' + (seleccion.length - 8) + ' más.' : ''}</p>
              <label className="cg-dato"><span>Escribe ELIMINAR para confirmar</span><input value={palabraBorrado} onChange={(e) => setPalabraBorrado(e.target.value)} autoComplete="off" /></label>
              <div className="cg-row">
                <button type="button" className="btn peligro" onClick={borrarSeleccion} disabled={procesando || palabraBorrado !== 'ELIMINAR'}>{procesando ? 'Eliminando…' : 'Eliminar definitivamente'}</button>
                <button type="button" className="btn" onClick={() => { setConfirmarBorrado(false); setPalabraBorrado(''); }} disabled={procesando}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="muted small">Los perfiles principales y las notas pastorales o médicas no se cambian en bloque. Tú y el Súper admin no se pueden eliminar desde esta herramienta.</p>
    </section>
  );
}

/** Migra estado de membresía/actividad desde people a una colección privada. */
function MigrarEstadosPrivados() {
  const { churchId } = useCongrega();
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const migrar = async () => {
    setProcesando(true); setMensaje('');
    try {
      const snap = await getDocs(collection(db, 'churches', churchId, 'people'));
      const pendientes = snap.docs.filter((d) => {
        const x = d.data();
        return Object.prototype.hasOwnProperty.call(x, 'miembro') || Object.prototype.hasOwnProperty.call(x, 'estado');
      });
      if (!pendientes.length) { setMensaje('La migración ya está completa.'); return; }
      const confirmada = window.confirm(`Se moverá el estado de ${pendientes.length} perfiles a datos privados. Se conservarán los valores y se quitarán de las fichas visibles. ¿Continuar?`);
      if (!confirmada) return;
      for (let i = 0; i < pendientes.length; i += 200) {
        const lote = writeBatch(db);
        pendientes.slice(i, i + 200).forEach((d) => {
          const x = d.data(); const privado = {};
          if (Object.prototype.hasOwnProperty.call(x, 'miembro')) privado.miembro = x.miembro === true;
          if (Object.prototype.hasOwnProperty.call(x, 'estado')) privado.estado = x.estado === 'inactivo' ? 'inactivo' : 'activo';
          lote.set(doc(db, 'churches', churchId, 'estadoPersonas', d.id), privado, { merge: true });
          lote.update(d.ref, { miembro: deleteField(), estado: deleteField() });
        });
        await lote.commit();
      }
      setMensaje(`Listo: ${pendientes.length} perfiles migrados. Ahora puedes publicar las reglas de Firestore incluidas en firestore.rules.actualizadas.txt.`);
    } catch (e) {
      setMensaje(`No se pudo completar la migración: ${e.message}`);
    } finally { setProcesando(false); }
  };
  return (
    <section className="card cg-stack">
      <h2>Privacidad de membresía</h2>
      <p className="muted">Mueve el estado de miembro y actividad fuera del perfil visible. Ejecuta esto una vez antes de publicar las nuevas reglas de Firestore.</p>
      <button type="button" className="btn" onClick={migrar} disabled={procesando}>{procesando ? 'Migrando…' : 'Migrar datos de privacidad'}</button>
      {mensaje && <div className="cg-aviso info" role="status">{mensaje}</div>}
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
