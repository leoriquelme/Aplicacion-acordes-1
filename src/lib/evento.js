// Partes de un culto además de las canciones.

/** Partes preestablecidas que se pueden agregar a un evento. */
export const PARTES = [
  'Bienvenida', 'Oración', 'Lectura bíblica', 'Anuncios', 'Ofrenda', 'Predicación', 'Santa Cena', 'Bendición',
];

/** Un ítem es canción si no dice lo contrario (los eventos antiguos solo tenían canciones). */
export const isSongItem = (item) => !item.type || item.type === 'song';

/** Ítems del evento con su canción (si es canción); quita canciones que ya no existen. */
export function eventLines(event, songs) {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return (event.items || [])
    .map((item, index) => (isSongItem(item) ? { item, index, song: byId.get(item.songId) } : { item, index }))
    .filter((x) => !isSongItem(x.item) || x.song);
}
