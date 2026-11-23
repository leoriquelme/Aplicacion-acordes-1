import { useEffect, useRef, useState } from 'react';
import { ROLES, useStore } from '../lib/store.jsx';
import { Avatar } from './Avatares.jsx';

/** "Activo hoy", "hace 3 días" o la fecha. */
export function ultimaVez(ms, now = Date.now()) {
  if (!ms) return '';
  const dias = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 86400000);
  if (dias <= 0) return 'activo hoy';
  if (dias === 1) return 'hace 1 día';
  if (dias < 30) return `hace ${dias} días`;
  return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Menú ⋯ de una persona: cambiar perfil, quitar foto o sacarla de la iglesia. */
function MenuPersona({ p, onSave, onRemove, onRemovePhoto, onClose }) {
  const ref = useRef(null);
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const cerrar = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', cerrar); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const hacer = async (fn) => {
    setMsg('');
    try { await fn(); onClose(); } catch (er) { setMsg(`No se pudo: ${er.message}`); }
  };
  const director = p.role === 'director';
  const nombre = p.name.split(' ')[0];

  return (
    <div className="menu-persona" role="menu" ref={ref}>
      <button role="menuitemradio" aria-checked={director} onClick={() => hacer(() => onSave(p.key, 'director'))}>
        Hacer Director musical {director && <span aria-hidden="true">✓</span>}
      </button>
      <button role="menuitemradio" aria-checked={!director} onClick={() => hacer(() => onSave(p.key, 'colaborador'))}>
        Dejar como Colaborador {!director && <span aria-hidden="true">✓</span>}
      </button>
      {p.photo && onRemovePhoto && (
        <button role="menuitem" onClick={() => hacer(() => onRemovePhoto(p.key))}>Quitar su foto</button>
      )}
      {!confirmar ? (
        <button role="menuitem" className="peligro" onClick={() => setConfirmar(true)}>Quitar de la iglesia</button>
      ) : (
        <div className="menu-confirmar">
          <span>¿Quitar a {nombre}? Podrá volver a unirse con el código.</span>
          <div className="row gap">
            <button className="btn small danger-solid" onClick={() => hacer(() => onRemove(p.key))}>Sí, quitar</button>
            <button className="btn small ghost" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className="error small">{msg}</p>}
    </div>
  );
}

/** Miembros como tarjetas (lo ve el Administrador): foto, equipos, perfil y menú ⋯. */
export function UsersCard() {
  const { people, me, setPersonRole, removePerson, removePhoto } = useStore();
  const [abierto, setAbierto] = useState(null);
  const sorted = [...people].sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || (b.role === 'director') - (a.role === 'director') || (a.name || '').localeCompare(b.name || '', 'es'));

  return (
    <section className="miembros-tarjetas">
      <h2>Miembros</h2>
      <p className="muted small">Toca ⋯ para cambiar el perfil o quitar a alguien.</p>
      <ul>
        {sorted.map((p) => {
          const isMe = p.key === me?.key;
          const detalle = [p.teams?.length ? p.teams.join(', ') : '', ultimaVez(p.lastSeen)].filter(Boolean).join(' · ');
          const editable = p.role !== 'admin' && !isMe;
          return (
            <li key={p.key} className="tarjeta-miembro">
              <Avatar name={p.name} personKey={p.key} size="lg" photo={p.photo || ''} />
              <div className="grow">
                <strong className="tm-nombre">{p.name}{isMe && <span className="muted"> (tú)</span>}</strong>
                {detalle && <span className="muted small tm-detalle">{detalle}</span>}
                <span className={`role-pill role-${p.role || 'colaborador'}`}>{ROLES[p.role]?.label || 'Colaborador'}</span>
              </div>
              {editable && (
                <button className="tm-mas" aria-label={`Opciones de ${p.name}`} aria-haspopup="menu" aria-expanded={abierto === p.key}
                  onClick={() => setAbierto(abierto === p.key ? null : p.key)}>⋯</button>
              )}
              {editable && abierto === p.key && (
                <MenuPersona p={p} onSave={setPersonRole} onRemove={removePerson} onRemovePhoto={removePhoto} onClose={() => setAbierto(null)} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
