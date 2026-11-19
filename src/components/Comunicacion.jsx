import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLES, useStore } from '../lib/store.jsx';
import { enterChurch, leaveChurch, useAuth } from '../lib/cloud.jsx';
import { APP_VERSION } from '../lib/version.js';
import { Avatar } from './Avatares.jsx';
import { EquiposPerfil } from './MisEquipos.jsx';
import Icon from './Icon.jsx';

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/** Arriba de Ajustes: mi nombre (con Editar), mi perfil y el estado de la app. */
export function PerfilCard() {
  const { mode, church, me, role, pendingRole, songs, updateMyName } = useStore();
  const online = useOnline();
  const [offlineReady, setOfflineReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [pin, setPin] = useState('');
  useEffect(() => {
    navigator.serviceWorker?.getRegistration?.().then((r) => setOfflineReady(Boolean(r?.active))).catch(() => {});
  }, []);
  const cloud = mode === 'cloud';

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
    <section className="card perfil">
      <div className="perfil-head">
        {cloud && <Avatar name={me?.name || '?'} personKey={me?.key} size="lg" />}
        <div className="grow">
          {editing ? (
            <div className="row gap wrap">
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardar()} autoFocus aria-label="Tu nombre" />
              <button className="btn primary small" disabled={!name.trim()} onClick={guardar}>Guardar</button>
              <button className="btn ghost small" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          ) : (
            <h1 className="perfil-nombre">{cloud ? me?.name : 'Mi equipo'}</h1>
          )}
          {cloud && <span className={`role-pill role-${role}`}>{ROLES[role]?.label || 'Colaborador'}</span>}
          {msg && <p className="error small">{msg}</p>}
        </div>
        {cloud && !editing && (
          <button className="btn small" onClick={() => { setName(me?.name || ''); setEditing(true); }}><Icon name="edit" /> Editar</button>
        )}
      </div>

      {cloud && pendingRole && (
        <form
          className="code-box"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await enterChurch({ church: church.name, name: me.name, pin });
              setPin('');
            } catch (err) {
              setMsg(err.message);
            }
          }}
        >
          <span>Te asignaron el perfil <strong>{ROLES[pendingRole]?.label}</strong>. Escribe tu PIN para activarlo.</span>
          <div className="row gap">
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" type="password" placeholder="PIN" />
            <button className="btn primary small" disabled={!pin}>Activar</button>
          </div>
        </form>
      )}

      {cloud && <EquiposPerfil />}

      <ul className="estado-list">
        <li><span className={`dot-status ${online ? 'ok' : 'off'}`} /> {online ? 'Con internet' : 'Sin internet: puedes seguir viendo tus canciones'}</li>
        {cloud ? (
          <>
            <li><Icon name="church" /> Iglesia: <strong>{church?.name}</strong></li>
            <li><Icon name="user" /> {me?.name} · {ROLES[role]?.label || 'Colaborador'}</li>
          </>
        ) : (
          <li><Icon name="laptop" /> Usando la app solo en este equipo</li>
        )}
        <li><Icon name="music" /> {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}{offlineReady ? ' guardadas para usar sin internet' : ''}</li>
      </ul>
    </section>
  );
}

/** Botón a la página de la iglesia y sus miembros. */
export function IglesiaBoton() {
  const { mode, church, people = [] } = useStore();
  if (mode !== 'cloud') return null;
  return (
    <Link to="/mi-iglesia/miembros" className="card iglesia-boton">
      <span className="bloque-icono"><Icon name="church" /></span>
      <span className="grow">
        <span className="muted small">Perteneces a</span>
        <strong>{church?.name}</strong>
        <span className="muted small">{people.length} {people.length === 1 ? 'miembro' : 'miembros'}</span>
      </span>
      <span className="chevron" aria-hidden="true">›</span>
    </Link>
  );
}

/** Abajo de Ajustes: sugerir mejoras, apoyo, salir y versión. */
export function AjustesFinal() {
  const { mode, churchId, can, suggestions = [] } = useStore();
  const { setSession } = useAuth() || {};
  const salir = async () => {
    await leaveChurch(churchId);
    setSession?.(null);
  };
  return (
    <section className="ajustes-final">
      <Link className="btn big-inline" to="/sugerencias">
        <Icon name="bulb" /> Sugerir mejoras
        {can.users && suggestions.length > 0 && <span className="badge">{suggestions.length}</span>}
      </Link>
      <Link className="btn big-inline" to="/apoyo"><Icon name="heart" /> Apoyo: orar y donar</Link>
      {mode === 'cloud' && <button className="btn ghost" onClick={salir}>Salir / cambiar de iglesia</button>}
      <p className="muted small">Versión {APP_VERSION}</p>
    </section>
  );
}
