import { useEffect, useState } from 'react';

let guardado = null; // Aviso de instalación de Android/PC (Chrome, Edge).
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); guardado = e; });

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Cómo instalar la app en el celular o PC (para abrirla sin internet y como un ícono). */
export default function InstalarCard() {
  const [puede, setPuede] = useState(Boolean(guardado));
  const [hecho, setHecho] = useState(instalada());
  useEffect(() => {
    const on = (e) => { e.preventDefault(); guardado = e; setPuede(true); };
    const done = () => setHecho(true);
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done); };
  }, []);
  return (
    <section className="card">
      <h2>📱 Instalar la app</h2>
      {hecho ? (
        <p>✓ Ya la tienes instalada. Ábrela desde su ícono; funciona aunque no haya internet.</p>
      ) : (
        <>
          <p className="muted small">Instalada, la app queda como un ícono en tu teléfono, abre sin internet y puede mostrar avisos del calendario.</p>
          {puede && (
            <button className="btn primary" onClick={async () => { guardado.prompt(); const r = await guardado.userChoice; if (r.outcome === 'accepted') setHecho(true); guardado = null; setPuede(false); }}>
              ⬇ Instalar ahora
            </button>
          )}
          {esIOS() ? (
            <ol className="pasos">
              <li>Abre esta página en <strong>Safari</strong>.</li>
              <li>Toca el botón <strong>Compartir</strong> (cuadrado con flecha ↑).</li>
              <li>Elige <strong>“Agregar a pantalla de inicio”</strong> y luego <strong>Agregar</strong>.</li>
            </ol>
          ) : (
            !puede && (
              <ol className="pasos">
                <li>En Android: abre el menú <strong>⋮</strong> de Chrome y toca <strong>“Instalar app”</strong> o “Agregar a pantalla principal”.</li>
                <li>En PC: en la barra de direcciones de Chrome o Edge, toca el ícono de <strong>instalar</strong> (pantalla con flecha).</li>
              </ol>
            )
          )}
        </>
      )}
    </section>
  );
}
