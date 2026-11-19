import { useState } from 'react';
import { enterChurch, useAuth } from '../lib/cloud.jsx';
import { ROLES } from '../lib/store.jsx';
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
  const [needsPin, setNeedsPin] = useState(null); // { role, result }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await enterChurch({ church, name, pin });
      localStorage.setItem(LAST, JSON.stringify({ church: church.trim(), name: name.trim() }));
      if (r.needsPin && !pin) {
        setNeedsPin({ role: r.needsPin, result: r });
      } else {
        setSession({ churchId: r.churchId, churchName: r.churchName });
      }
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
        <label>
          Iglesia
          <input value={church} onChange={(e) => setChurch(e.target.value)} placeholder="Ej. PSG" autoFocus={!church} autoComplete="organization" />
        </label>
        <label>
          Tu nombre
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNeedsPin(null); }}
            placeholder="Ej. Leonardo Riquelme"
            autoFocus={Boolean(church)}
            autoComplete="name"
          />
        </label>

        {needsPin && (
          <p className="pin-notice">
            Este nombre tiene el perfil <strong>{ROLES[needsPin.role]?.label}</strong>. Escribe tu PIN para entrar con ese perfil.
          </p>
        )}
        <label>
          PIN <span className="muted small">(solo si eres Director o Administrador)</span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            type="password"
            placeholder="Déjalo vacío si eres Colaborador"
            autoFocus={Boolean(needsPin)}
            autoComplete="off"
          />
        </label>

        <button className="btn primary big" disabled={busy || !church.trim() || !name.trim() || (needsPin && !pin)}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {needsPin && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setSession({ churchId: needsPin.result.churchId, churchName: needsPin.result.churchName })}
          >
            Entrar como Colaborador
          </button>
        )}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
