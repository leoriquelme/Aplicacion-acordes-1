import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROLES, useStore } from '../lib/store.jsx';
import { salirDeIglesia, useAuth } from '../lib/cloud.jsx';
import { cerrarSesion } from '../lib/acceso.js';
import ConfirmX from './ConfirmX.jsx';
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
  const { mode, church, me, role, songs, updateMyName } = useStore();
  const online = useOnline();
  const [offlineReady, setOfflineReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    navigator.serviceWorker?.getRegistration?.().then((r) => setOfflineReady(Boolean(r?.active))).catch(() => {});
  }, []);
  const cloud = mode === 'cloud';
  const personal = mode === 'personal';
  const { user } = useAuth() || {};

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
            <h1 className="perfil-nombre">{cloud || personal ? me?.name : 'Mi equipo'}</h1>
          )}
          {cloud && <span className={`role-pill role-${role}`}>{ROLES[role]?.label || 'Colaborador'}</span>}
          {msg && <p className="error small">{msg}</p>}
        </div>
        {(cloud || personal) && !editing && (
          <button className="btn small" onClick={() => { setName(me?.name || ''); setEditing(true); }}><Icon name="edit" /> Editar</button>
        )}
      </div>

      {cloud && <EquiposPerfil />}

      <ul className="estado-list">
        <li><span className={`dot-status ${online ? 'ok' : 'off'}`} /> {online ? 'Con internet' : 'Sin internet: puedes seguir viendo tus canciones'}</li>
        {cloud ? (
          <>
            <li><Icon name="church" /> Iglesia: <strong>{church?.name}</strong></li>
            <li><Icon name="user" /> {me?.name} · {ROLES[role]?.label || 'Colaborador'}</li>
          </>
        ) : personal ? (
          <li><Icon name="user" /> Cuenta: <strong>{user?.email}</strong> · todavía sin iglesia abierta</li>
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
    <Link to="/mi-iglesia/miembros" state={{ from: 'ajustes' }} className="card iglesia-boton">
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

/** Abajo de Ajustes: sugerir mejoras, apoyo, cambiar de iglesia, cerrar sesión y versión. */
export function AjustesFinal() {
  const { mode, churchId, church, can, suggestions = [] } = useStore();
  const { setSession: setS, user } = useAuth() || {};
  const navigate = useNavigate();
  const setSession = (x) => { navigate('/'); setS?.(x); };
  const [msg, setMsg] = useState('');
  const soyDueno = church?.ownerUid && church.ownerUid === user?.uid;
  return (
    <section className="ajustes-final">
      <Link className="btn big-inline" to="/sugerencias">
        <Icon name="bulb" /> Sugerir mejoras
        {can.users && suggestions.length > 0 && <span className="badge">{suggestions.length}</span>}
      </Link>
      <Link className="btn big-inline" to="/apoyo"><Icon name="heart" /> Apoyo: orar y donar</Link>
      {mode === 'cloud' && <button className="btn" onClick={() => setSession?.(null)}><Icon name="home" /> Mis iglesias y mis canciones</button>}
      {mode === 'cloud' && !soyDueno && (
        <ConfirmX label={`Salir de ${church?.name}`} className="btn ghost" text={`Salir de ${church?.name}`} armedText="¿Seguro? Para volver necesitarás el código"
          onConfirm={async () => {
            try { await salirDeIglesia(churchId); setSession?.(null); } catch (e) { setMsg(`No se pudo: ${e.message}`); }
          }} />
      )}
      {(mode === 'cloud' || mode === 'personal') && (
        <button className="btn ghost" onClick={async () => { setSession?.(null); await cerrarSesion(); }}>Cerrar sesión</button>
      )}
      {msg && <p className="error">{msg}</p>}
      <p className="muted small">Versión {APP_VERSION}</p>
    </section>
  );
}
