import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { linkDeInvitacion } from '../lib/invitacion.js';
import { linkMusica } from '../lib/musica.js';
import Qr from '../components/Qr.jsx';
import Icon from '../components/Icon.jsx';
import IglesiaLogo from '../components/IglesiaLogo.jsx';
import { APP_NOMBRE } from '../lib/marca.js';

/**
 * Afiche para imprimir y pegar en la iglesia, con un código QR:
 *  - invitacion: los hermanos escanean, entran con su cuenta y quedan dentro de la iglesia.
 *  - musica: abre la música de la iglesia sin cuenta.
 */
export default function Afiche() {
  const { tipo } = useParams();
  const { church, churchId, getAccessCode, can } = useStore();
  const [code, setCode] = useState(null);
  const esInvitacion = tipo !== 'musica';
  useEffect(() => {
    if (!esInvitacion || !getAccessCode || !can?.users) return;
    getAccessCode().then(setCode).catch(() => setCode(''));
  }, [esInvitacion, getAccessCode, can?.users]);

  const link = esInvitacion ? (code ? linkDeInvitacion(code) : '') : linkMusica(churchId);
  return (
    <div className="page afiche-pagina">
      <div className="row gap wrap no-print">
        <Link className="btn ghost" to={esInvitacion ? '/mi-iglesia' : '/musica'}>‹ Volver</Link>
        <button className="btn primary" disabled={!link} onClick={() => window.print()}><Icon name="print" /> Imprimir o guardar PDF</button>
      </div>
      {esInvitacion && !can?.users && <p className="card no-print">Solo el Administrador puede imprimir el afiche de invitación.</p>}
      {esInvitacion && can?.users && code === '' && <p className="card no-print">La iglesia no tiene código de acceso. Créalo en la pestaña Iglesia.</p>}
      {link && (
        <div className="afiche hoja">
          <IglesiaLogo className="afiche-logo" />
          <h1>{church?.name}</h1>
          {esInvitacion ? (
            <>
              <h2>Únete a la iglesia en {APP_NOMBRE}</h2>
              <p>Canciones, servicios y tu ficha, en tu teléfono.</p>
            </>
          ) : (
            <>
              <h2>Escucha la música de la iglesia</h2>
              <p>Las canciones del próximo culto y las que más cantamos, en Spotify y YouTube. No necesitas cuenta.</p>
            </>
          )}
          <Qr texto={link} size={300} titulo={esInvitacion ? 'QR para unirse a la iglesia' : 'QR de la música de la iglesia'} />
          <ol className="afiche-pasos">
            <li>Abre la cámara del teléfono y apunta al código.</li>
            <li>Toca el link que aparece.</li>
            {esInvitacion && <li>Entra con tu cuenta de Google y toca “Unirme a la iglesia”.</li>}
          </ol>
          {esInvitacion && code && <p className="muted small">Si te pide un código, es: <strong className="codigo">{code}</strong></p>}
        </div>
      )}
    </div>
  );
}
