import { APP_NOMBRE } from './marca.js';
// Link de invitación: https://…/Aplicacion-acordes-1/?unirse=CODIGO
// Al abrirlo, el código se guarda en este equipo hasta que la persona entre con su cuenta y se una.

const KEY = 'cancionero-invitacion';

const limpiar = (c = '') => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

/** Saca el código del link (?unirse=… o #/unirse/…). Devuelve '' si no hay. */
export function codigoDelLink(href) {
  try {
    const url = new URL(href);
    const q = url.searchParams.get('unirse');
    if (q) return limpiar(q);
    const m = url.hash.match(/^#\/unirse\/([^/?#]+)/i);
    return m ? limpiar(decodeURIComponent(m[1])) : '';
  } catch {
    return '';
  }
}

/** Se llama al abrir la app: guarda el código del link y lo quita de la barra de direcciones. */
export function guardarInvitacionDelLink() {
  const code = codigoDelLink(window.location.href);
  if (code.length < 4) return;
  try { localStorage.setItem(KEY, code); } catch { /* sin almacenamiento: se pierde la invitación */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('unirse');
  url.hash = '#/';
  window.history.replaceState(null, '', url.toString());
}

export function invitacionPendiente() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

export function borrarInvitacion() {
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
}

/** El link para compartir. base: la dirección de la app (sin # ni ?). */
export function linkDeInvitacion(code, base = window.location.origin + window.location.pathname) {
  return `${base}?unirse=${encodeURIComponent(limpiar(code))}`;
}

/** Mensaje listo para WhatsApp. */
export function mensajeDeInvitacion(code, churchName, base) {
  const link = linkDeInvitacion(code, base);
  return `Te invito a unirte a ${churchName || 'nuestra iglesia'} en ${APP_NOMBRE} (letras y acordes). Abre este link, entra con tu cuenta y quedas dentro:\n${link}\n\nSi te pide un código, es: ${limpiar(code)}`;
}
