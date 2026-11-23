import { parseISO } from './dates.js';

/** Fecha y hora real del evento (si no tiene hora, se toma el final del día). */
export function eventDateTime(ev) {
  const d = parseISO(ev.date);
  if (ev.time) {
    const [h, m] = ev.time.split(':').map(Number);
    d.setHours(h, m || 0, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

/**
 * Ranking de uso: una canción cuenta como usada cuando estaba en un evento
 * cuya fecha y hora ya pasaron. "count" son los usos del último año;
 * "lastUsed" es la fecha (YYYY-MM-DD) del último evento ya realizado en que se usó.
 */
export function songUsage(songs, events, now = new Date()) {
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const stats = new Map(songs.map((s) => [s.id, { song: s, count: 0, lastUsed: null }]));

  for (const ev of events) {
    const when = eventDateTime(ev);
    if (when > now) continue; // todavía no ocurre
    const ids = new Set((ev.items || []).map((i) => i.songId)); // una vez por evento
    for (const id of ids) {
      const st = stats.get(id);
      if (!st) continue;
      if (when >= yearAgo) st.count += 1;
      if (!st.lastUsed || ev.date > st.lastUsed) st.lastUsed = ev.date;
    }
  }
  return [...stats.values()];
}

const byTitle = (a, b) => a.song.title.localeCompare(b.song.title, 'es', { numeric: true });

export function mostUsed(usage) {
  return [...usage].sort((a, b) => b.count - a.count || (b.lastUsed || '').localeCompare(a.lastUsed || '') || byTitle(a, b));
}

export function leastUsed(usage) {
  // Primero las menos usadas; a igual cantidad, la que lleva más tiempo sin usarse (o nunca).
  return [...usage].sort((a, b) => a.count - b.count || (a.lastUsed || '').localeCompare(b.lastUsed || '') || byTitle(a, b));
}
