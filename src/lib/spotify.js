// Links de Spotify: se pegan a mano (no hace falta cuenta de desarrollador ni servidor).
// Acepta links como https://open.spotify.com/intl-es/track/ID?si=…, spotify:track:ID
// y links cortos https://spotify.link/… (estos solo se pueden abrir, no reproducir dentro de la app).

const TIPOS = ['track', 'album', 'playlist', 'episode', 'show', 'artist'];

/** Devuelve { type, id } si el link es de Spotify y se reconoce; si no, null. */
export function parseSpotify(texto) {
  const t = String(texto || '').trim();
  if (!t) return null;
  const uri = t.match(/^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]{10,40})$/);
  if (uri) return { type: uri[1], id: uri[2] };
  let u;
  try { u = new URL(t); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'spotify.link' || host === 'spotify.app.link') return { type: 'corto', id: '', url: u.href };
  if (host !== 'open.spotify.com' && host !== 'play.spotify.com') return null;
  const partes = u.pathname.split('/').filter(Boolean).filter((p) => !/^intl-/.test(p) && p !== 'embed');
  const i = partes.findIndex((p) => TIPOS.includes(p));
  if (i < 0 || !/^[A-Za-z0-9]{10,40}$/.test(partes[i + 1] || '')) return null;
  return { type: partes[i], id: partes[i + 1] };
}

/** ¿Es un link válido? (vacío también vale: el campo es opcional). */
export function esLinkSpotify(texto) {
  return !String(texto || '').trim() || !!parseSpotify(texto);
}

/** Link para abrir en Spotify (en el teléfono abre la app de Spotify si está instalada). */
export function linkAbrir(texto) {
  const s = parseSpotify(texto);
  if (!s) return '';
  if (s.type === 'corto') return s.url;
  return `https://open.spotify.com/${s.type}/${s.id}`;
}

/** URI para el reproductor que va dentro de la app (null si no se puede, p. ej. links cortos). */
export function uriSpotify(texto) {
  const s = parseSpotify(texto);
  return s && s.type !== 'corto' ? `spotify:${s.type}:${s.id}` : null;
}

/** Canciones del culto (en orden) que tienen link de Spotify. */
export function cancionesConSpotify(lines) {
  return lines.filter((l) => l.song && parseSpotify(l.song.spotify)).map((l) => l.song);
}
