// Música de la iglesia: la playlist del próximo culto y el repertorio que más se canta,
// para que los hermanos escuchen las canciones durante la semana (aunque no hayan ido al culto).
import { eventDateTime } from './stats.js';
import { eventLines } from './evento.js';
import { tipoEvento } from '../congrega/eventos.js';
import { parseSpotify } from './spotify.js';
import { idYouTube } from './youtube.js';

export const DIAS_REPERTORIO = 90;
export const MAX_REPERTORIO = 30;

const conMusica = (s) => Boolean(parseSpotify(s.spotify) || idYouTube(s.youtube));

/**
 * El próximo evento que tiene canciones (el que ocurre hoy también cuenta hasta que termina).
 * Prefiere el culto dominical si hay uno con canciones en los próximos días.
 * Devuelve { event, lines } o null.
 */
export function proximoCulto(events, songs, now = new Date()) {
  const futuros = events
    .filter((e) => e.date && eventDateTime({ ...e, time: '' }) >= now)
    .map((event) => ({ event, lines: eventLines(event, songs).filter((l) => l.song) }))
    .filter((x) => x.lines.length > 0)
    .sort((a, b) => (a.event.date + (a.event.time || '')).localeCompare(b.event.date + (b.event.time || '')));
  if (!futuros.length) return null;
  const primero = futuros[0];
  const culto = futuros.find((x) => tipoEvento(x.event) === 'culto' && x.event.date <= sumarDias(primero.event.date, 7));
  return culto || primero;
}

/** El último evento ya realizado que tuvo canciones ("lo que cantamos el domingo"). */
export function ultimoCulto(events, songs, now = new Date()) {
  const pasados = events
    .filter((e) => e.date && eventDateTime(e) < now)
    .map((event) => ({ event, lines: eventLines(event, songs).filter((l) => l.song) }))
    .filter((x) => x.lines.length > 0)
    .sort((a, b) => (b.event.date + (b.event.time || '')).localeCompare(a.event.date + (a.event.time || '')));
  return pasados[0] || null;
}

function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
}

/**
 * Repertorio de la iglesia: las canciones cantadas en los últimos `dias` días, de la más cantada a la menos.
 * Devuelve [{ song, count, lastUsed }].
 */
export function repertorio(songs, events, { now = new Date(), dias = DIAS_REPERTORIO, max = MAX_REPERTORIO } = {}) {
  const desde = new Date(now);
  desde.setDate(desde.getDate() - dias);
  const byId = new Map(songs.map((s) => [s.id, s]));
  const uso = new Map();
  for (const ev of events) {
    if (!ev.date) continue;
    const when = eventDateTime(ev);
    if (when > now || when < desde) continue;
    for (const id of new Set((ev.items || []).map((i) => i.songId).filter(Boolean))) {
      const song = byId.get(id);
      if (!song) continue;
      const u = uso.get(id) || { song, count: 0, lastUsed: '' };
      u.count += 1;
      if (ev.date > u.lastUsed) u.lastUsed = ev.date;
      uso.set(id, u);
    }
  }
  return [...uso.values()]
    .sort((a, b) => b.count - a.count || b.lastUsed.localeCompare(a.lastUsed) || a.song.title.localeCompare(b.song.title, 'es'))
    .slice(0, max);
}

/** Canción para la página pública: solo título, autor y links (sin letra ni acordes). */
function cancionPublica(s) {
  const out = { t: String(s.title || '').slice(0, 120) };
  if (s.author) out.a = String(s.author).slice(0, 120);
  if (parseSpotify(s.spotify)) out.sp = String(s.spotify).slice(0, 300);
  if (idYouTube(s.youtube)) out.yt = String(s.youtube).slice(0, 300);
  return out;
}

/**
 * Lo que se publica en musicaPublica/{iglesia} para el link sin cuenta.
 * No lleva datos de personas: solo el nombre de la iglesia, el culto y las canciones.
 */
export function datosPublicos({ churchName, culto, repertorio: rep }) {
  return {
    nombre: String(churchName || '').slice(0, 80),
    culto: culto
      ? {
        nombre: String(culto.event.name || '').slice(0, 100),
        fecha: String(culto.event.date || '').slice(0, 10),
        hora: String(culto.event.time || '').slice(0, 5),
        spotify: parseSpotify(culto.event.spotify) ? String(culto.event.spotify).slice(0, 300) : '',
        canciones: culto.lines.slice(0, 30).map((l) => cancionPublica(l.song)),
      }
      : null,
    repertorio: rep.slice(0, MAX_REPERTORIO).map((u) => cancionPublica(u.song)),
  };
}

/** ¿Cambió algo respecto de lo publicado? (sin contar la fecha de actualización) */
export function mismaMusica(a, b) {
  if (!a || !b) return false;
  // Firebase puede devolver los campos en otro orden: se comparan ordenados.
  const orden = (x) => (Array.isArray(x) ? x.map(orden)
    : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, orden(x[k])])) : x);
  const sin = ({ at, ...x }) => JSON.stringify(orden(x)); // eslint-disable-line no-unused-vars
  return sin(a) === sin(b);
}

/** Lista para el reproductor (EscucharCulto) a partir de las canciones públicas. */
export const lineasPublicas = (canciones = []) => canciones.map((c, i) => ({ song: { id: `p${i}`, title: c.t, author: c.a || '', spotify: c.sp || '', youtube: c.yt || '' } }));

/** Lista para el reproductor a partir del repertorio. */
export const lineasRepertorio = (rep) => rep.map((u) => ({ song: u.song }));

export const hayMusica = (lines) => lines.some((l) => conMusica(l.song));

/** Link público para compartir (no pide cuenta). */
export function linkMusica(churchId, base = window.location.origin + window.location.pathname) {
  return `${base}#/escuchar/${encodeURIComponent(churchId)}`;
}
