// Links de YouTube: se pegan a mano. Los videos se ven completos dentro de la app (sin iniciar sesión).

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Devuelve el id del video (11 caracteres) o null si el link no es de un video de YouTube. */
export function idYouTube(texto) {
  const t = String(texto || '').trim();
  if (!t) return null;
  let u;
  try { u = new URL(t); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const [tipo, v] = u.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live', 'v'].includes(tipo)) id = v;
    }
  }
  return id && ID.test(id) ? id : null;
}

/** ¿Es un link válido? (vacío también vale: el campo es opcional). */
export function esLinkYouTube(texto) {
  return !String(texto || '').trim() || !!idYouTube(texto);
}

/** Link para ver el video en YouTube. */
export function linkVerYouTube(texto) {
  const id = idYouTube(texto);
  return id ? `https://www.youtube.com/watch?v=${id}` : '';
}

/** Reproductor dentro de la app: empieza en el video `desde` y sigue solo con los demás, en orden. */
export function embedLista(ids, desde = 0, autoplay = false) {
  if (!ids.length) return '';
  const resto = ids.slice(desde + 1);
  const q = new URLSearchParams({ rel: '0', playsinline: '1' });
  if (resto.length) q.set('playlist', resto.join(','));
  if (autoplay) q.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${ids[desde]}?${q.toString().replace(/%2C/g, ',')}`;
}

/** Link para compartir (WhatsApp): abre en YouTube una lista con todos los videos, en orden. Máx. 50. */
export function linkListaCompartir(ids) {
  return ids.length ? `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0, 50).join(',')}` : '';
}

/** Canciones del culto (en orden) que tienen link de YouTube. */
export function cancionesConYouTube(lines) {
  return lines.filter((l) => l.song && idYouTube(l.song.youtube)).map((l) => l.song);
}
