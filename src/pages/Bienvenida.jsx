import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import {
  crearCuentaConCorreo, entrarConCorreo, entrarConGoogle, mensajeAcceso, recuperarContrasena,
} from '../lib/acceso.js';

/** Página de entrada: con Google, o con correo y contraseña. */
export default function Bienvenida({ notice }) {
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'crear' | 'recuperar'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const hacer = (fn) => async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      await fn();
    } catch (err) {
      setError(mensajeAcceso(err));
    } finally {
      setBusy(false);
    }
  };

  const enviar = hacer(async () => {
    if (modo === 'crear') await crearCuentaConCorreo({ name, email, password });
    else if (modo === 'recuperar') {
      await recuperarContrasena(email);
      setOk('Te enviamos un correo para crear una contraseña nueva. Revisa también la carpeta de spam.');
    } else await entrarConCorreo({ email, password });
  });

  return (
    <div className="welcome">
      <div className="welcome-card card">
        <div className="welcome-logo"><Icon name="music" size="2.4rem" /></div>
        <h1>Cancionero</h1>
        <p className="muted">Letras y acordes para tu iglesia</p>
        {notice && <p className="error">{notice}</p>}

        <button className="btn big google-btn" disabled={busy} onClick={hacer(entrarConGoogle)}>
          <GoogleG /> Entrar con Google
        </button>

        <div className="separador"><span>o con tu correo</span></div>

        <form className="login-correo" onSubmit={enviar}>
          {modo === 'crear' && (
            <label>
              Tu nombre
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ej. Juan Pérez" autoComplete="name" />
            </label>
          )}
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" autoComplete="email" />
          </label>
          {modo !== 'recuperar' && (
            <label>
              Contraseña {modo === 'crear' && <span className="muted small">(8 o más letras, números o símbolos)</span>}
              <span className="pass-field">
                <input
                  type={ver ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button type="button" className="btn small ghost" onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Ver'}</button>
              </span>
            </label>
          )}
          <button className="btn primary big" disabled={busy || !email.trim() || (modo !== 'recuperar' && !password) || (modo === 'crear' && !name.trim())}>
            {busy ? 'Un momento…' : modo === 'crear' ? 'Crear mi cuenta' : modo === 'recuperar' ? 'Enviarme un correo' : 'Entrar'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {ok && <p className="ok">{ok}</p>}

        <div className="login-links">
          {modo === 'entrar' ? (
            <>
              <button className="btn ghost small" onClick={() => { setModo('crear'); setError(''); }}>No tengo cuenta: crear una</button>
              <button className="btn ghost small" onClick={() => { setModo('recuperar'); setError(''); }}>Olvidé mi contraseña</button>
            </>
          ) : (
            <button className="btn ghost small" onClick={() => { setModo('entrar'); setError(''); setOk(''); }}>Ya tengo cuenta: entrar</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ verticalAlign: '-3px' }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
