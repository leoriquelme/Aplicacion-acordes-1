import { normalize } from './chordpro.js';

/**
 * "Leonardo  Riquelme" → "leonardo riquelme" (sin tildes, ñ→n, sin mayúsculas ni espacios de más).
 * Se usa como id de la iglesia y de cada persona: así "Iglesia Ñuñoa" e "IGLESIA nunoa" son la misma.
 * Las reglas de Firebase (norm) hacen exactamente lo mismo.
 */
export function keyOf(text = '') {
  return normalize(text).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
}
