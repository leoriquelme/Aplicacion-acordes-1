import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { plataformaActual } from '../lib/plataforma.js';

let guardado = null; // Aviso de instalación de Android/PC (Chrome, Edge).
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); guardado = e; });

const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * Botón "Instalar app" que sirve en iPhone y Android.
 * Android/PC con Chrome o Edge: abre la ventana de instalación del teléfono.
 * iPhone (Safari no deja instalar con un botón): muestra los pasos. Si está en Chrome o WhatsApp, pide abrir Safari.
 */
export default function InstalarCard({ bare = false }) {
  const [puede, setPuede] = useState(Boolean(guardado));
  const [hecho, setHecho] = useState(instalada());
  const [guia, setGuia] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const donde = plataformaActual();
  useEffect(() => {
    const on = (e) => { e.preventDefault(); guardado = e; setPuede(true); };
    const done = () => setHecho(true);
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done); };
  }, []);

  const instalar = async () => {
    if (guardado) {
      guardado.prompt();
      const r = await guardado.userChoice.catch(() => null);
      if (r?.outcome === 'accepted') setHecho(true);
      guardado = null;
      setPuede(false);
      return;
    }
    setGuia((g) => !g);
  };
  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(window.location.origin + window.location.pathname); setCopiado(true); } catch { /* nada */ }
  };

  const Caja = bare ? 'div' : 'section';
  return (
    <Caja className={bare ? '' : 'card'}>
      {!bare && <h2><Icon name="phone" /> Instalar la app</h2>}
      {hecho ? (
        <p>✓ Ya está instalada. Ábrela desde su ícono.</p>
      ) : (
        <>
          {!bare && <p className="muted small">Queda como un ícono en tu teléfono y abre sin internet.</p>}
          <button className="btn primary" onClick={instalar}>
            <Icon name="download" /> {puede ? 'Instalar app' : guia ? 'Ocultar los pasos' : 'Instalar app'}
          </button>
          {guia && !puede && (
            <div className="guia-instalar">
              {donde === 'iphone-safari' && (
                <>
                  <p className="small"><strong>En iPhone se instala desde Safari, en 3 toques:</strong></p>
                  <ol className="pasos">
                    <li>Toca <strong>Compartir</strong> <span className="tecla">⬆︎</span> (abajo en la pantalla; si no lo ves, toca primero <span className="tecla">⋯</span>).</li>
                    <li>Baja y toca <strong>“Agregar a inicio”</strong>.</li>
                    <li>Toca <strong>Agregar</strong> arriba a la derecha.</li>
                  </ol>
                  <p className="muted small">Después abre el ícono nuevo y entra con la misma cuenta.</p>
                </>
              )}
              {donde === 'iphone-otro' && (
                <>
                  <p className="small"><strong>Para instalarla en iPhone, abre esta página en Safari</strong> (la brújula azul):</p>
                  <ol className="pasos">
                    <li>Toca <strong>Copiar el link</strong> aquí abajo.</li>
                    <li>Abre <strong>Safari</strong>, pega el link arriba y ábrelo.</li>
                    <li>Toca <strong>Compartir</strong> <span className="tecla">⬆︎</span> → <strong>“Agregar a inicio”</strong> → <strong>Agregar</strong>.</li>
                  </ol>
                  <button className="btn small" onClick={copiarLink}>{copiado ? '✓ Link copiado' : 'Copiar el link'}</button>
                  <p className="muted small">Si estás en WhatsApp, también puedes tocar <span className="tecla">⋯</span> o la brújula y elegir “Abrir en Safari”.</p>
                </>
              )}
              {donde === 'android' && (
                <ol className="pasos">
                  <li>Toca el menú <span className="tecla">⋮</span> arriba a la derecha de Chrome.</li>
                  <li>Toca <strong>“Instalar app”</strong> o <strong>“Agregar a pantalla principal”</strong>.</li>
                  <li>Confirma con <strong>Instalar</strong>.</li>
                </ol>
              )}
              {donde === 'android-app' && (
                <ol className="pasos">
                  <li>Toca el menú <span className="tecla">⋮</span> y elige <strong>“Abrir en Chrome”</strong>.</li>
                  <li>En Chrome, vuelve a tocar <strong>Instalar app</strong>.</li>
                </ol>
              )}
              {donde === 'pc' && (
                <p className="small">En Chrome o Edge, toca el ícono de <strong>instalar</strong> (pantalla con flecha) a la derecha de la barra de direcciones.</p>
              )}
            </div>
          )}
        </>
      )}
    </Caja>
  );
}
