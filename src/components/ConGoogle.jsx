import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { crearIglesia, entrarConCuenta, misIglesiasGoogle, soySuperAdmin, useAuth } from '../lib/cloud.jsx';
import { entrarConGoogle, googleEmail, mensajeGoogle, salirDeGoogle } from '../lib/google.js';
import { keyOf } from '../lib/claves.js';
import Icon from './Icon.jsx';

/** Recuadro "Con cuenta de Google" de la página de entrada: mis iglesias, crear una iglesia nueva. */
export default function ConGoogle() {
  const { user, setSession, authVersion, refreshUser } = useAuth();
  const email = googleEmail(user);
  const [iglesias, setIglesias] = useState(null);
  const [esSuper, setEsSuper] = useState(false);
  const [crear, setCrear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) { setIglesias(null); setEsSuper(false); return; }
    let vivo = true;
    misIglesiasGoogle().then((l) => vivo && setIglesias(l)).catch(() => vivo && setIglesias([]));
    soySuperAdmin().then((s) => vivo && setEsSuper(s));
    return () => { vivo = false; };
  }, [email, authVersion]);

  const abrir = (r) => setSession({ churchId: r.churchId, churchName: r.churchName, at: Date.now() });
  const hacer = (fn) => async (...args) => {
    setBusy(true);
    setError('');
    try {
      await fn(...args);
    } catch (e) {
      setError(mensajeGoogle(e));
    } finally {
      setBusy(false);
    }
  };

  if (!email) {
    return (
      <section className="welcome-card card google-box">
        <h2>Con cuenta de Google</h2>
        <p className="muted small">
          Para <strong>registrar tu iglesia</strong> en el Cancionero, o si eres Administrador o Director y ya vinculaste tu cuenta.
          Los Colaboradores no la necesitan.
        </p>
        <button className="btn big" disabled={busy} onClick={hacer(async () => { await entrarConGoogle(); refreshUser(); })}>
          <GoogleG /> Entrar con Google
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="welcome-card card google-box">
      <h2>Con cuenta de Google</h2>
      <p className="muted small">Conectado como <strong>{email}</strong></p>
      {iglesias === null && <p className="muted">Buscando tus iglesias…</p>}
      {iglesias?.length > 0 && (
        <div className="stack">
          {iglesias.map((i) => (
            <button key={i.churchId} className="btn primary" disabled={busy || i.status === 'bloqueada'}
              onClick={hacer(async () => abrir(await entrarConCuenta(i)))}>
              <Icon name="church" /> Entrar a {i.churchName} <span className="small">({i.role === 'admin' ? 'Administrador' : 'Director'}{i.status === 'bloqueada' ? ', bloqueada' : ''})</span>
            </button>
          ))}
        </div>
      )}
      {iglesias?.length === 0 && !crear && (
        <p className="muted small">Todavía no tienes iglesias con esta cuenta. Si ya eres Administrador o Director, entra arriba con tu contraseña y vincula tu cuenta en Ajustes.</p>
      )}

      {crear ? (
        <NuevaIglesia busy={busy} onCancel={() => setCrear(false)} onCreate={hacer(async (datos) => abrir(await crearIglesia(datos)))} />
      ) : (
        <button className="btn" onClick={() => setCrear(true)}>+ Registrar una iglesia nueva</button>
      )}
      {error && <p className="error">{error}</p>}

      <div className="row gap wrap google-pie">
        {esSuper && <Link className="btn small" to="/super"><Icon name="sliders" /> Super Admin</Link>}
        <button className="btn small ghost" onClick={hacer(async () => { await salirDeGoogle(); })}>Salir de Google</button>
      </div>
    </section>
  );
}

function NuevaIglesia({ busy, onCreate, onCancel }) {
  const [church, setChurch] = useState('');
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const id = keyOf(church);
  return (
    <form className="nueva-iglesia" onSubmit={(e) => { e.preventDefault(); onCreate({ church, city, name }); }}>
      <label>
        Nombre de la iglesia
        <input value={church} onChange={(e) => setChurch(e.target.value)} maxLength={60} placeholder="Ej. Iglesia Bautista Gracia" autoFocus />
      </label>
      {id && <p className="muted small">Los hermanos entrarán escribiendo <strong>{church.trim().replace(/\s+/g, ' ').toUpperCase()}</strong> (no importan mayúsculas ni tildes). No puede haber dos iglesias con el mismo nombre.</p>}
      <label>
        Ciudad o comuna <span className="muted small">(opcional)</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="Ej. Santiago" />
      </label>
      <label>
        Tu nombre <span className="muted small">(serás el Administrador)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ej. Juan Pérez" autoComplete="name" />
      </label>
      <div className="row gap wrap">
        <button className="btn primary" disabled={busy || id.length < 3 || !keyOf(name)}>{busy ? 'Creando…' : 'Crear iglesia'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ verticalAlign: '-3px' }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
