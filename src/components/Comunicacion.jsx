import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROLES, useStore } from '../lib/store.jsx';
import { salirDeIglesia, useAuth } from '../lib/cloud.jsx';
import { cerrarSesion } from '../lib/acceso.js';
import ConfirmX from './ConfirmX.jsx';
import { APP_VERSION } from '../lib/version.js';
import { Avatar } from './Avatares.jsx';
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

/** Arriba de Ajustes: mi foto (iniciales), nombre y perfil. Debajo, el grupo "Perfil". */
export function PerfilCard() {
  const { mode, church, me, role, updateMyName, setMyPhoto } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const cloud = mode === 'cloud';
  const personal = mode === 'personal';
  const { user } = useAuth() || {};
  const nombre = cloud || personal ? me?.name : 'Mi equipo';

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
    <>
      <header className="perfil-cabeza">
        <div className="perfil-foto">
          <Avatar name={nombre || '?'} personKey={me?.key} size="xl" photo={me?.photo || ''} />
          {setMyPhoto && (
            <ElegirFoto className="perfil-camara" label="Cambiar foto" onFoto={setMyPhoto}>
              <Icon name="camera" />
            </ElegirFoto>
          )}
        </div>
        <h1 className="perfil-nombre">{nombre}</h1>
        {cloud && <span className={`role-pill role-${role}`}>{ROLES[role]?.label || 'Colaborador'}</span>}
        {me?.photo && setMyPhoto && <button className="btn ghost small" onClick={() => setMyPhoto(null)}>Quitar foto</button>}
      </header>

      {(cloud || personal) && (
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
          {cloud ? (
            <Fila label="Iglesia" valor={church?.name} to="/mi-iglesia/miembros" state={{ from: 'ajustes' }} />
          ) : (
            <Fila label="Iglesia" valor="Ninguna" to="/mi-iglesia" />
          )}
          {cloud && <EquiposPerfil />}
        </Grupo>
      )}
    </>
  );
}

/** Abajo de Ajustes: sugerir mejoras, apoyo, cambiar de iglesia, cerrar sesión y versión. */
export function AjustesFinal() {
  const { mode, churchId, church, can, suggestions = [] } = useStore();
  const { setSession: setS, user } = useAuth() || {};
  const navigate = useNavigate();
  const setSession = (x) => { navigate('/'); setS?.(x); };
  const [msg, setMsg] = useState('');
  const soyDueno = church?.ownerUid && church.ownerUid === user?.uid;
  const pendientes = can.users && suggestions.length > 0 ? suggestions.length : null;
  return (
    <>
      <Grupo>
        <Fila label={<><Icon name="bulb" /> Sugerir mejoras</>} valor={pendientes} to="/sugerencias" />
        <Fila label={<><Icon name="heart" /> Apoyo</>} to="/apoyo" />
      </Grupo>
      {(mode === 'cloud' || mode === 'personal') && (
        <Grupo>
          {mode === 'cloud' && <Fila label="Cerrar esta iglesia" onClick={() => setSession?.(null)} flecha={false} />}
          {mode === 'cloud' && !soyDueno && (
            <ConfirmX label={`Salir de ${church?.name}`} className="fila fila-peligro" text={`Salir de ${church?.name}`} armedText="¿Seguro? Necesitarás el código para volver"
              onConfirm={async () => {
                try { await salirDeIglesia(churchId); setSession?.(null); } catch (e) { setMsg(`No se pudo: ${e.message}`); }
              }} />
          )}
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
