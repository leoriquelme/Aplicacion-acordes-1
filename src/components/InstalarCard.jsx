import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

let guardado = null; // Aviso de instalación de Android/PC (Chrome, Edge).
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); guardado = e; });

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Cómo instalar la app en el celular o PC (para abrirla sin internet y como un ícono). */
export default function InstalarCard({ bare = false }) {
  const [puede, setPuede] = useState(Boolean(guardado));
  const [hecho, setHecho] = useState(instalada());
  useEffect(() => {
    const on = (e) => { e.preventDefault(); guardado = e; setPuede(true); };
    const done = () => setHecho(true);
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done); };
  }, []);
  const Caja = bare ? 'div' : 'section';
  return (
    <Caja className={bare ? '' : 'card'}>
      {!bare && <h2><Icon name="phone" /> Instalar la app</h2>}
      {hecho ? (
        <p>✓ Ya está instalada.</p>
      ) : (
        <>
          {!bare && <p className="muted small">Queda como un ícono en tu teléfono y abre sin internet.</p>}
          {puede && (
            <button className="btn primary" onClick={async () => { guardado.prompt(); const r = await guardado.userChoice; if (r.outcome === 'accepted') setHecho(true); guardado = null; setPuede(false); }}>
              <Icon name="download" /> Instalar ahora
            </button>
          )}
          {esIOS() ? (
            <ol className="pasos">
              <li>Ábrela en <strong>Safari</strong>.</li>
              <li>Toca <strong>Compartir</strong> (↑).</li>
              <li>Toca <strong>Agregar a inicio</strong>.</li>
            </ol>
          ) : (
            !puede && (
              <ol className="pasos">
                <li>Android: menú <strong>⋮</strong> → <strong>Instalar app</strong>.</li>
                <li>PC: ícono de <strong>instalar</strong> en la barra de direcciones.</li>
              </ol>
            )
          )}
        </>
      )}
    </Caja>
  );
}
