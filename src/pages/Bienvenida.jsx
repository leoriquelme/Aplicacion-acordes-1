import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, useEmulator } from '../lib/firebase.js';
import { createChurch, joinChurch, logout, saveMyName, signInWithGoogle, useAuth } from '../lib/cloud.jsx';

const NAME_KEY = 'cancionero-nombre';

/** Página de apertura: nombre, inicio de sesión y elegir la iglesia. */
export default function Bienvenida({ notice }) {
  const { user, profile, setChurchId } = useAuth();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [code, setCode] = useState('');
  const [newChurch, setNewChurch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  const myName = (name || profile?.name || user?.displayName || '').trim();

  if (!user) {
    return (
      <div className="welcome">
        <div className="welcome-card card">
          <div className="welcome-logo" aria-hidden="true">🎵</div>
          <h1>Cancionero</h1>
          <p className="muted">Letras y acordes para tu iglesia</p>
          <label>
            Tu nombre
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Leonardo Riquelme" autoFocus />
          </label>
          <button
            className="btn primary big"
            disabled={busy}
            onClick={() => run(async () => {
              localStorage.setItem(NAME_KEY, name.trim());
              await signInWithGoogle();
            })}
          >
            Entrar con Google
          </button>
          {useEmulator && (
            <form
              className="row gap test-login"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  localStorage.setItem(NAME_KEY, name.trim());
                  try {
                    await signInWithEmailAndPassword(auth, testEmail, 'prueba123');
                  } catch {
                    await createUserWithEmailAndPassword(auth, testEmail, 'prueba123');
                  }
                });
              }}
            >
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="correo de prueba" />
              <button className="btn small">Entrar (prueba)</button>
            </form>
          )}
          {error && <p className="error">{error}</p>}
          {notice && <p className="muted small">{notice}</p>}
        </div>
      </div>
    );
  }

  const enter = (id) => {
    if (myName && myName !== profile?.name) saveMyName(user.uid, myName);
    setChurchId(id);
  };

  return (
    <div className="welcome">
      <div className="welcome-card card wide">
        <h1>¡Hola{myName ? `, ${myName.split(' ')[0]}` : ''}!</h1>
        <label>
          Tu nombre
          <input value={myName} onChange={(e) => setName(e.target.value)} placeholder="Como te verán los demás" />
        </label>

        {notice && <p className="error">{notice}</p>}

        {profile?.churches?.length > 0 && (
          <>
            <h2>¿A qué iglesia quieres entrar?</h2>
            <div className="church-list">
              {profile.churches.map((c) => (
                <button key={c.id} className="btn church-btn" disabled={!myName} onClick={() => enter(c.id)}>
                  ⛪ {c.name}
                </button>
              ))}
            </div>
          </>
        )}

        <h2>{profile?.churches?.length ? 'Entrar a otra iglesia' : '¿A qué iglesia quieres entrar?'}</h2>
        <form
          className="row gap wrap"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => enter(await joinChurch(user, myName, code)));
          }}
        >
          <input className="grow code-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de la iglesia, ej. GRACIA-4821" />
          <button className="btn primary" disabled={busy || !code.trim() || !myName}>Entrar</button>
        </form>
        <p className="muted small">Pídele el código al administrador de tu iglesia.</p>

        <details className="create-church">
          <summary>Crear una iglesia nueva</summary>
          <p className="muted small">Quedarás como Administrador y recibirás un código para invitar a los músicos.</p>
          <form
            className="row gap wrap"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => enter(await createChurch(user, myName, newChurch.trim())));
            }}
          >
            <input className="grow" value={newChurch} onChange={(e) => setNewChurch(e.target.value)} placeholder="Nombre de la iglesia" />
            <button className="btn" disabled={busy || !newChurch.trim() || !myName}>Crear</button>
          </form>
        </details>

        {!myName && <p className="error">Escribe tu nombre para continuar.</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn ghost small" onClick={logout}>Cerrar sesión ({user.email})</button>
      </div>
    </div>
  );
}

function friendly(e) {
  const m = e?.code || e?.message || '';
  if (m.includes('popup-closed')) return 'Se cerró la ventana de Google antes de terminar.';
  if (m.includes('popup-blocked')) return 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes e intenta de nuevo.';
  if (m.includes('network')) return 'No hay conexión a internet.';
  if (m.includes('permission')) return 'No tienes permiso para hacer esto.';
  return e?.message || 'Ocurrió un error.';
}
