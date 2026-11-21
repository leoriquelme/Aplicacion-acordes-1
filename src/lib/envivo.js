// "En vivo": un Director (o el Administrador) va pasando la letra durante el culto
// y en el teléfono de los demás avanza sola. Todo vive en un solo documento por iglesia:
// churches/{iglesia}/live/actual { eventId, songId, song, section, by, byName, active, at }

/** Pasadas estas horas sin cambios, se da por terminado (por si el director cerró la app sin terminar). */
export const HORAS_EN_VIVO = 3;

/** ¿Hay alguien pasando la letra ahora? */
export function enVivoActivo(live, ahora = Date.now()) {
  return Boolean(live?.active && live.eventId && typeof live.at === 'number' && ahora - live.at < HORAS_EN_VIVO * 3600 * 1000);
}

/** Qué canción mostrar: se busca por id (más seguro) y si no, por número. */
export function indiceCancion(items, live) {
  if (!live || !items.length) return 0;
  const i = items.findIndex((it) => it.song?.id === live.songId);
  if (i >= 0) return i;
  return Math.min(Math.max(Number(live.song) || 0, 0), items.length - 1);
}

/** El documento que escribe el director. */
export function datosEnVivo({ eventId, songId = '', song = 0, section = 0, by, byName = '', active = true }) {
  return {
    eventId: String(eventId).slice(0, 100), songId: String(songId || '').slice(0, 100),
    song: Math.max(0, Math.floor(song) || 0), section: Math.max(0, Math.floor(section) || 0),
    by, byName: String(byName || '').slice(0, 60), active: Boolean(active), at: Date.now(),
  };
}
