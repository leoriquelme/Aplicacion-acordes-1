import { useState } from 'react';
import { APP_NOMBRE } from '../lib/marca.js';
import { useNavigate } from 'react-router-dom';
import { unirseAIglesia, useAuth } from '../lib/cloud.jsx';
import { borrarInvitacion } from '../lib/invitacion.js';
import InstalarCard from './InstalarCard.jsx';
import Icon from './Icon.jsx';

/**
 * Se abrió la app con un link de invitación: unirse a la iglesia con un toque
 * y luego mostrar cómo instalar la app en el teléfono.
 */
export default function AceptarInvitacion({ code, onListo }) {
  const { profile, user, setSession } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unida, setUnida] = useState(null);
  const name = profile?.name || user.displayName || '';
  const cuantas = Object.keys(profile?.churches || {}).length;

  const unirme = async () => {
    setBusy(true);
    setError('');
    try {
      setUnida(await unirseAIglesia({ code, name, cuantas }));
      borrarInvitacion();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const ahoraNo = () => { borrarInvitacion(); onListo(); };
  const entrar = () => {
    setSession({ churchId: unida.churchId, churchName: unida.churchName, at: Date.now() });
    navigate('/');
    onListo();
  };

  return (
    <div className="welcome">
      <div className="welcome-card card wide invitacion">
        {!unida ? (
          <>
            <div className="welcome-logo"><Icon name="church" size="2.4rem" /></div>
            <h1>Te invitaron a una iglesia</h1>
            <p>Hola, <strong>{name}</strong>. Con este link te puedes unir a una iglesia en {APP_NOMBRE} para ver sus canciones y eventos.</p>
            <p className="muted small">Código de la invitación: <strong className="codigo">{code}</strong></p>
            <button className="btn primary big" disabled={busy} onClick={unirme}>{busy ? 'Uniéndote…' : 'Unirme a la iglesia'}</button>
            {error && <p className="error">{error}</p>}
            <button className="btn ghost small" disabled={busy} onClick={ahoraNo}>Ahora no</button>
          </>
        ) : (
          <>
            <div className="welcome-logo">✓</div>
            <h1>¡Listo! Ya eres parte de {unida.churchName}</h1>
            <p className="muted">Último paso: deja la app como un ícono en tu teléfono para abrirla rápido.</p>
            <InstalarCard />
            <button className="btn primary big" onClick={entrar}>Entrar a la iglesia</button>
          </>
        )}
      </div>
    </div>
  );
}
