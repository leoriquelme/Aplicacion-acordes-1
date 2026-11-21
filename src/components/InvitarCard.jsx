import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { linkDeInvitacion, mensajeDeInvitacion } from '../lib/invitacion.js';
import Icon from './Icon.jsx';

/** Link para invitar hermanos (por WhatsApp u otro medio). Solo lo ve el Administrador. */
export default function InvitarCard() {
  const { can, church, getAccessCode } = useStore();
  const [code, setCode] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!getAccessCode || !can.users) return;
    getAccessCode().then(setCode).catch(() => setCode(''));
  }, [getAccessCode, can.users]);
  if (!can.users || !getAccessCode) return null;

  const link = code ? linkDeInvitacion(code) : '';
  const texto = code ? mensajeDeInvitacion(code, church?.name) : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMsg('✓ Link copiado. Pégalo en WhatsApp, un correo o donde quieras.');
    } catch {
      setMsg('No se pudo copiar solo: mantén el dedo sobre el link y elige Copiar.');
    }
  };
  const compartir = async () => {
    try {
      await navigator.share({ title: `Únete a ${church?.name || 'la iglesia'}`, text: texto });
    } catch { /* la persona cerró la ventana */ }
  };

  return (
    <section className="card invitar">
      <h2><Icon name="users" /> Invitar hermanos</h2>
      {code === null && <p className="muted">Cargando…</p>}
      {code === '' && <p className="muted small">La iglesia no tiene código de acceso, así que nadie nuevo puede unirse. Pon uno en Ajustes → tu iglesia.</p>}
      {code && (
        <>
          <p className="muted small">
            Envía este link. Al abrirlo, la persona entra con su cuenta (Google o correo), queda unida como Colaborador
            y ve cómo dejar la app como un ícono en su teléfono.
          </p>
          <p className="link-invitacion"><a href={link} target="_blank" rel="noreferrer">{link}</a></p>
          <div className="row gap wrap">
            <a className="btn primary" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
              <Icon name="phone" /> Enviar por WhatsApp
            </a>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="btn" onClick={compartir}>Compartir…</button>
            )}
            <button className="btn" onClick={copiar}>Copiar link</button>
          </div>
          {msg && <p className="small">{msg}</p>}
          <p className="muted small">Si cambias el código de acceso, este link deja de servir y tendrás que enviar el nuevo.</p>
        </>
      )}
    </section>
  );
}
