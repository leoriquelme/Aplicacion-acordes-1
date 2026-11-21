import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROLES, useStore } from '../lib/store.jsx';
import { marcarIglesiaCerrada, salirDeIglesia, useAuth } from '../lib/cloud.jsx';
import { cerrarSesion } from '../lib/acceso.js';
import ConfirmX from './ConfirmX.jsx';
import { APP_VERSION } from '../lib/version.js';
import Avatares, { Avatar } from './Avatares.jsx';
import IglesiaLogo from './IglesiaLogo.jsx';
import ElegirFoto from './ElegirFoto.jsx';
import { EquiposPerfil } from './MisEquipos.jsx';
import Icon from './Icon.jsx';

/** Un grupo de filas, como en los ajustes del teléfono. */
export function Grupo({ titulo, children }) {
  return (
    <section className="grupo">
      {titulo && <h2 className="grupo-titulo">{titulo}</h2>}
      <div className="grupo-filas">{children}</div>
    </section>
  );
}

/** Una fila: nombre a la izquierda, valor a la derecha y flecha si lleva a otra parte. */
export function Fila({ label, valor, to, state, onClick, flecha = Boolean(to || onClick), className = '', children }) {
  const inner = (
    <>
      <span className="fila-label">{label}</span>
      {valor != null && <span className="fila-valor">{valor}</span>}
      {children}
      {flecha && <span className="fila-flecha" aria-hidden="true">›</span>}
    </>
  );
  if (to) return <Link to={to} state={state} className={`fila ${className}`}>{inner}</Link>;
  if (onClick) return <button type="button" className={`fila ${className}`} onClick={onClick}>{inner}</button>;
  return <div className={`fila ${className}`}>{inner}</div>;
}

/** Una fila que se abre hacia abajo para mostrar más (respaldo, instalar…). */
export function FilaAbre({ label, valor, children }) {
  return (
    <details className="fila-abre">
      <summary className="fila">
        <span className="fila-label">{label}</span>
        {valor != null && <span className="fila-valor">{valor}</span>}
        <span className="fila-flecha" aria-hidden="true">›</span>
      </summary>
      <div className="fila-detalle">{children}</div>
    </details>
  );
}

/** Arriba de Ajustes: foto, nombre, perfil y botón "Editar perfil". */
export function PerfilCard() {
  const { mode, me, role } = useStore();
  const cloud = mode === 'cloud';
  const personal = mode === 'personal';
  const nombre = cloud || personal ? me?.name : 'Mi equipo';
  return (
    <header className="perfil-resumen">
      <Avatar name={nombre || '?'} personKey={me?.key} size="xl" photo={me?.photo || ''} />
      <div className="perfil-resumen-datos">
        <h2 className="perfil-nombre">{nombre}</h2>
        {cloud && <span className={`role-pill role-${role}`}>{ROLES[role]?.label || 'Colaborador'}</span>}
        {(cloud || personal) && <Link className="btn perfil-editar" to="/ajustes/perfil">Editar perfil</Link>}
      </div>
    </header>
  );
}

/** Debajo del perfil: mi iglesia con sus miembros. Al tocarla se entra a la iglesia. */
export function IglesiaTarjeta() {
  const { mode, church, people = [] } = useStore();
  const { profile } = useAuth() || {};
  const tieneIglesias = Object.keys(profile?.churches || {}).length > 0;
  if (mode !== 'cloud' && mode !== 'personal') return null;
  const cloud = mode === 'cloud';
  return (
    <section className="grupo">
      <div className="grupo-titulo row between">
        <span>Iglesia</span>
        {cloud && <Link to="/mi-iglesia" className="grupo-accion">Cambiar</Link>}
      </div>
      {cloud ? (
        <Link to="/mi-iglesia/miembros" state={{ from: 'ajustes' }} className="iglesia-tarjeta">
          <IglesiaLogo className="logo-tarjeta" />
          <span className="grow">
            <strong>{church?.name}</strong>
            <span className="muted">{people.length} {people.length === 1 ? 'miembro' : 'miembros'}</span>
          </span>
          <Avatares people={people} max={3} size="sm" />
        </Link>
      ) : (
        <Link to="/mi-iglesia" className="iglesia-tarjeta">
          <span className="grow"><strong>Mis iglesias</strong><span className="muted">{tieneIglesias ? 'Entrar, unirme o crear una' : 'Unirme o crear una'}</span></span>
          <span className="fila-flecha" aria-hidden="true">›</span>
        </Link>
      )}
    </section>
  );
}

/** Pantalla "Editar perfil": foto, nombre, correo y mis equipos. */
export function EditarPerfil() {
  const { mode, me, role, updateMyName, setMyPhoto } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const cloud = mode === 'cloud';
  const { user } = useAuth() || {};
  if (mode !== 'cloud' && mode !== 'personal') return <div className="page"><Link to="/ajustes" className="back">← Ajustes</Link></div>;

  const guardar = async () => {
    if (!name.trim()) return;
    try {
      await updateMyName(name);
      setEditing(false);
      setMsg('');
    } catch {
      setMsg('No se pudo guardar. Revisa tu conexión.');
    }
  };

  return (
    <div className="page ajustes">
      <Link to="/ajustes" className="back">← Ajustes</Link>
      <header className="perfil-cabeza">
        <div className="perfil-foto">
          <Avatar name={me?.name || '?'} personKey={me?.key} size="xl" photo={me?.photo || ''} />
          {setMyPhoto && (
            <ElegirFoto className="perfil-camara" label="Cambiar foto" onFoto={setMyPhoto}>
              <Icon name="camera" />
            </ElegirFoto>
          )}
        </div>
        <h1 className="perfil-nombre">{me?.name}</h1>
        {cloud && <span className={`role-pill role-${role}`}>{ROLES[role]?.label || 'Colaborador'}</span>}
        {me?.photo && setMyPhoto && <button className="btn ghost small" onClick={() => setMyPhoto(null)}>Quitar foto</button>}
      </header>

      <Grupo titulo="Perfil">
        {editing ? (
          <div className="fila">
            <input className="grow" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardar()} autoFocus aria-label="Tu nombre" />
            <button className="btn primary small" disabled={!name.trim()} onClick={guardar}>Guardar</button>
            <button className="btn ghost small" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        ) : (
          <Fila label="Nombre" valor={me?.name} onClick={() => { setName(me?.name || ''); setEditing(true); }} />
        )}
        {msg && <p className="error small fila">{msg}</p>}
        {user?.email && <Fila label="Correo" valor={user.email} />}
        {cloud && <EquiposPerfil />}
      </Grupo>
    </div>
  );
}

/**
 * Dentro de la iglesia (su página y la pestaña Iglesia): salir de la iglesia (volver a mi vista personal,
 * sigo siendo miembro) o dejar de ser miembro (hace falta el código para volver).
 */
export function SalirIglesia() {
  const { mode, churchId, church } = useStore();
  const { setSession: setS, user } = useAuth() || {};
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  if (mode !== 'cloud') return null;
  const salir = () => { navigate('/'); setS?.(null); };
  const soyDueno = church?.ownerUid && church.ownerUid === user?.uid;
  return (
    <>
      <Grupo>
        <Fila label={<><Icon name="church" /> Salir de la iglesia</>} onClick={() => { marcarIglesiaCerrada(true); salir(); }} flecha={false} />
        {!soyDueno && (
          <ConfirmX label={`Dejar de ser miembro de ${church?.name}`} className="fila fila-peligro" text={`Dejar de ser miembro de ${church?.name}`} armedText="¿Seguro? Necesitarás el código para volver a entrar"
            onConfirm={async () => {
              try { await salirDeIglesia(churchId); salir(); } catch (e) { setMsg(`No se pudo: ${e.message}`); }
            }} />
        )}
      </Grupo>
      <p className="muted small">Al salir sigues siendo miembro: vuelves a entrar cuando quieras desde Ajustes.</p>
      {msg && <p className="error">{msg}</p>}
    </>
  );
}

/** Abajo de Ajustes: sugerir mejoras, apoyo, cerrar sesión y versión. */
export function AjustesFinal() {
  const { mode, can, suggestions = [] } = useStore();
  const { setSession: setS } = useAuth() || {};
  const navigate = useNavigate();
  const setSession = (x) => { navigate('/'); setS?.(x); };
  const [msg, setMsg] = useState('');
  const pendientes = can.users && suggestions.length > 0 ? suggestions.length : null;
  return (
    <>
      <Grupo>
        <Fila label={<><Icon name="bulb" /> Sugerir mejoras</>} valor={pendientes} to="/sugerencias" />
        <Fila label={<><Icon name="heart" /> Apoyo</>} to="/apoyo" />
      </Grupo>
      {(mode === 'cloud' || mode === 'personal') && (
        <Grupo>
          <Fila label="Cerrar sesión" className="fila-peligro" flecha={false} onClick={async () => { setSession?.(null); await cerrarSesion(); }} />
        </Grupo>
      )}
      {msg && <p className="error">{msg}</p>}
      <p className="muted small ajustes-version">
        Versión {APP_VERSION}
      </p>
    </>
  );
}
