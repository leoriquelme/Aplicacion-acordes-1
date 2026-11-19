import { useState } from 'react';
import { cleanCode, enterChurch, useAuth } from '../lib/cloud.jsx';
import Icon from '../components/Icon.jsx';

const LAST = 'cancionero-ultimo-ingreso';

function readLast() {
  try {
    return JSON.parse(localStorage.getItem(LAST)) || {};
  } catch {
    return {};
  }
}

/** Página de apertura: Iglesia + Nombre (+ PIN para Director o Administrador). */
export default function Bienvenida({ notice }) {
  const { setSession } = useAuth();
  const last = readLast();
  const [church, setChurch] = useState(last.church || '');
  const [name, setName] = useState(last.name || '');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState(last.code || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await enterChurch({ church, name, pin, code });
      localStorage.setItem(LAST, JSON.stringify({ church: church.trim(), name: name.trim(), code: cleanCode(code) }));
      setSession({ churchId: r.churchId, churchName: r.churchName, at: Date.now() }); // "at": vuelve a abrir la iglesia desde cero
    } catch (err) {
      setError(err.message?.includes('network') ? 'No hay conexión a internet.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <form className="welcome-card card" onSubmit={submit}>
        <div className="welcome-logo"><Icon name="music" size="2.4rem" /></div>
        <h1>Cancionero</h1>
        <p className="muted">Letras y acordes para tu iglesia</p>
        {notice && <p className="error">{notice}</p>}
        <fieldset className="login-grupo">
          <legend>Tu iglesia</legend>
          <label>
            Iglesia
            <input value={church} onChange={(e) => setChurch(e.target.value)} placeholder="Ej. PSG" autoFocus={!church} autoComplete="organization" />
          </label>
          <label>
            Código de acceso <span className="muted small">(pídeselo al administrador de tu iglesia)</span>
            <input
              value={code}
              onChange={(e) => setCode(cleanCode(e.target.value))}
              placeholder="Ej. KXMPRT"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="code-input"
            />
          </label>
        </fieldset>
        <fieldset className="login-grupo">
          <legend>Tus datos</legend>
          <label>
            Tu nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Leonardo Riquelme"
              autoFocus={Boolean(church)}
              autoComplete="name"
            />
          </label>
          <label>
            PIN <span className="muted small">(solo si eres Director o Administrador)</span>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              type="password"
              placeholder="Déjalo vacío si eres Colaborador"
              autoComplete="off"
            />
          </label>
        </fieldset>

        <button className="btn primary big" disabled={busy || !church.trim() || !name.trim()}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
