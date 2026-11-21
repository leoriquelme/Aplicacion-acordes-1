import { parseChord } from './chordpro.js';

// Para elegir el tono tocando una nota (C…B) y ♭ / ♯.
export const LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const LATINO = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

/** Letra y alteración ('', 'b', '#') de la nota principal de un tono (ej. "Bbm" → B, b). */
export function partesDeTono(tono = '') {
  const m = /^([A-G])([#b]?)/.exec(tono);
  return m ? { letra: m[1], alt: m[2] } : null;
}

/** Medios tonos entre el tono original y la nota elegida, entre -5 y +6. */
export function pasosHacia(original, letra, alt = '') {
  const p = parseChord(original || '');
  if (!p) return 0;
  const destino = BASE[letra] + (alt === '#' ? 1 : alt === 'b' ? -1 : 0);
  let d = (((destino - p.root) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}
