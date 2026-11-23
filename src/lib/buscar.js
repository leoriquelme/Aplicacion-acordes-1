import { normalize } from './chordpro.js';

/** Las líneas de letra de una canción, sin acordes ni nombres de secciones. */
export function lineasDeLetra(content = '') {
  return content
    .split('\n')
    .map((l) => l.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Para comparar: sin tildes, sin mayúsculas y sin signos (comas, puntos, ¡!, ¿?).
const limpio = (t) => normalize(t).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** La primera línea de la letra que contiene lo buscado (o '' si no está). Ignora tildes, mayúsculas y signos. */
export function lineaQueCoincide(content, query) {
  const q = limpio(query || '');
  if (!q) return '';
  return lineasDeLetra(content).find((l) => limpio(l).includes(q)) || '';
}
