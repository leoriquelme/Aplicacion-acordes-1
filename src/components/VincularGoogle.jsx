import { useState } from 'react';
import { useAuth, vincularPerfil } from '../lib/cloud.jsx';
import { entrarConGoogle, googleEmail, mensajeGoogle } from '../lib/google.js';
import { useStore } from '../lib/store.jsx';

/**
 * Ajustes (solo Administrador y Director): vincular la cuenta de Google con su perfil,
 * para entrar después con un toque, sin escribir la contraseña.
 */
export default function VincularGoogle() {
  const { mode, role, church, me, people } = useStore();
  const { user, refreshUser } = useAuth() || {};
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  if (mode !== 'cloud' || (role !== 'admin' && role !== 'director')) return null;

  const email = googleEmail(user);
  const yo = people.find((p) => p.key === me?.key);
  const vinculado = role === 'director' ? yo?.uid === user?.uid && Boolean(email) : null;

  const vincular = async () => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const r = await entrarConGoogle();
      refreshUser();
      if (r.changed) {
        setError('Esa cuenta de Google ya se había usado antes en el Cancionero. Toca "Salir", luego "Entrar con Google" en la pantalla de inicio, entra a la iglesia con tu nombre y contraseña, y vuelve aquí a vincular.');
        return;
      }
      await vincularPerfil({ churchId: church.id, churchName: church.name, role, key: me.key, name: me.name });
      setMsg(`Listo. La próxima vez toca "Entrar con Google" en la pantalla de inicio y entrarás a ${church.name} sin contraseña.`);
    } catch (e) {
      setError(mensajeGoogle(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Cuenta de Google</h2>
      <p className="muted small">
        Vincula tu cuenta de Google para entrar con un toque, sin escribir tu contraseña. Tu contraseña sigue funcionando igual.
        {email && <> Ahora estás conectado como <strong>{email}</strong>.</>}
      </p>
      {vinculado ? <p className="ok">✓ Tu cuenta de Google ya está vinculada.</p> : (
        <button className="btn" disabled={busy} onClick={vincular}>{busy ? 'Vinculando…' : 'Vincular mi cuenta de Google'}</button>
      )}
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
