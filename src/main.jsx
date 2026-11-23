import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { LocalStoreProvider, SettingsProvider } from './lib/store.jsx';
import { cloudEnabled } from './lib/firebase.js';
import App from './App.jsx';
import './styles.css';

import CloudRoot from './CloudRoot.jsx';
import { guardarInvitacionDelLink } from './lib/invitacion.js';

// Si se publicó una versión nueva mientras la app estaba abierta, una página puede no encontrarse:
// en ese caso recargar una vez para traer la versión nueva.
window.addEventListener('vite:preloadError', (e) => {
  try {
    const antes = Number(sessionStorage.getItem('recargado-por-version') || 0);
    if (Date.now() - antes < 15000) return; // ya se recargó hace poco: no repetir
    sessionStorage.setItem('recargado-por-version', String(Date.now()));
    e.preventDefault();
    window.location.reload();
  } catch { /* sin sessionStorage: no hacer nada */ }
});

// Si se abrió con un link de invitación (?unirse=CÓDIGO), guardarlo antes de mostrar nada.
guardarInvitacionDelLink();

// Con Firebase configurado: iglesias compartidas. Sin configurar: todo en este equipo.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <HashRouter>
        {cloudEnabled ? (
          <CloudRoot />
        ) : (
          <LocalStoreProvider>
            <App />
          </LocalStoreProvider>
        )}
      </HashRouter>
    </SettingsProvider>
  </StrictMode>
);

// App instalable y que abre sin internet (solo en la versión publicada).
if (import.meta.env.PROD && !import.meta.env.VITE_EMULATOR && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
