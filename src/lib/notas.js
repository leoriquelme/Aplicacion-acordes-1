// Notas preestablecidas que se ponen en una sección de la canción.
// Dos tipos: del director (guardadas en la canción, las ven todos) y propias (solo la persona).
export const NOTAS = [
  { id: 'suave', label: 'Suave', icon: 'volumeLow' },
  { id: 'fuerte', label: 'Fuerte', icon: 'volumeHigh' },
  { id: 'lento', label: 'Más lento', icon: 'slow' },
  { id: 'animado', label: 'Más animado', icon: 'fast' },
  { id: 'pausa', label: 'Pausa', icon: 'pause' },
  { id: 'repetir', label: 'Repetir', icon: 'repeat' },
  { id: 'subir', label: 'Subir medio tono', icon: 'arrowUp' },
  { id: 'voces', label: 'Solo voces', icon: 'mic' },
  { id: 'instrumentos', label: 'Solo instrumentos', icon: 'guitar' },
  { id: 'todos', label: 'Todos cantan', icon: 'users' },
  { id: 'piano', label: 'Solo piano', icon: 'music' },
  { id: 'oracion', label: 'Momento de oración', icon: 'pray' },
  { id: 'final', label: 'Final', icon: 'flag' },
];
export const notaPorId = (id) => NOTAS.find((n) => n.id === id);
export const MAX_NOTAS = 40;

/** Agrupa las notas por sección: { 'CORO 1': [{ id, mine }] } */
export function notasPorSeccion(director = [], mias = []) {
  const out = {};
  for (const n of director) if (notaPorId(n.note)) (out[n.section] ||= []).push({ id: n.note, mine: false });
  for (const n of mias) if (notaPorId(n.note)) (out[n.section] ||= []).push({ id: n.note, mine: true });
  return out;
}

/** Agrega o quita una nota (si ya está en esa sección, se quita). */
export function alternarNota(list = [], section, note) {
  const i = list.findIndex((n) => n.section === section && n.note === note);
  if (i >= 0) return list.filter((_, k) => k !== i);
  return [...list, { section, note }].slice(0, MAX_NOTAS);
}
