// Diagramas de acordes de guitarra (afinación estándar).
// Cada forma es [6ª, 5ª, 4ª, 3ª, 2ª, 1ª] cuerda: número de traste, 0 = al aire, -1 = no se toca.
import { parseChord } from './chordpro.js';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = { 'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb', 'F#': 'Gb' };

// Formas abiertas conocidas (las más usadas en iglesia).
const OPEN = {
  C: [-1, 3, 2, 0, 1, 0], D: [-1, -1, 0, 2, 3, 2], E: [0, 2, 2, 1, 0, 0], G: [3, 2, 0, 0, 0, 3], A: [-1, 0, 2, 2, 2, 0],
  Am: [-1, 0, 2, 2, 1, 0], Dm: [-1, -1, 0, 2, 3, 1], Em: [0, 2, 2, 0, 0, 0],
  C7: [-1, 3, 2, 3, 1, 0], D7: [-1, -1, 0, 2, 1, 2], E7: [0, 2, 0, 1, 0, 0], G7: [3, 2, 0, 0, 0, 1], A7: [-1, 0, 2, 0, 2, 0], B7: [-1, 2, 1, 2, 0, 2],
  Am7: [-1, 0, 2, 0, 1, 0], Dm7: [-1, -1, 0, 2, 1, 1], Em7: [0, 2, 0, 0, 0, 0],
  Cmaj7: [-1, 3, 2, 0, 0, 0], Dmaj7: [-1, -1, 0, 2, 2, 2], Fmaj7: [-1, -1, 3, 2, 1, 0], Gmaj7: [3, 2, 0, 0, 0, 2], Amaj7: [-1, 0, 2, 1, 2, 0], Emaj7: [0, 2, 1, 1, 0, 0],
  Asus4: [-1, 0, 2, 2, 3, 0], Dsus4: [-1, -1, 0, 2, 3, 3], Esus4: [0, 2, 2, 2, 0, 0],
  Asus2: [-1, 0, 2, 2, 0, 0], Dsus2: [-1, -1, 0, 2, 3, 0],
};

// Formas móviles con cejilla. r = traste de la raíz.
const E_SHAPE = {
  '': (r) => [r, r + 2, r + 2, r + 1, r, r], m: (r) => [r, r + 2, r + 2, r, r, r], 7: (r) => [r, r + 2, r, r + 1, r, r],
  m7: (r) => [r, r + 2, r, r, r, r], maj7: (r) => [r, r + 2, r + 1, r + 1, r, r], sus4: (r) => [r, r + 2, r + 2, r + 2, r, r],
};
const A_SHAPE = {
  '': (r) => [-1, r, r + 2, r + 2, r + 2, r], m: (r) => [-1, r, r + 2, r + 2, r + 1, r], 7: (r) => [-1, r, r + 2, r, r + 2, r],
  m7: (r) => [-1, r, r + 2, r, r + 1, r], maj7: (r) => [-1, r, r + 2, r + 1, r + 2, r], sus4: (r) => [-1, r, r + 2, r + 2, r + 3, r],
  sus2: (r) => [-1, r, r + 2, r + 2, r, r],
};

/** Tipo de acorde que sabemos dibujar; si no, una alternativa sencilla. */
function quality(suffix) {
  const s = suffix.replace(/[()]/g, '');
  if (s === '' || s === 'M') return { q: '', simple: false };
  if (s === 'm' || s === 'min' || s === '-') return { q: 'm', simple: false };
  if (s === '7') return { q: '7', simple: false };
  if (s === 'm7' || s === 'min7' || s === '-7') return { q: 'm7', simple: false };
  if (s === 'maj7' || s === 'M7' || s === '7M') return { q: 'maj7', simple: false };
  if (s === 'sus4' || s === 'sus') return { q: 'sus4', simple: false };
  if (s === 'sus2' || s === '2') return { q: 'sus2', simple: false };
  // Alternativa sencilla: menor si dice m (no maj), si no, mayor.
  if (/^(m(?!aj)|min|-|dim|º|°)/.test(s)) return { q: 'm', simple: true };
  if (s.includes('sus')) return { q: 'sus4', simple: true };
  return { q: '', simple: true };
}

const QNAME = { '': '', m: 'm', 7: '7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', sus2: 'sus2' };

/**
 * Forma de guitarra para un acorde (ej. "F#m7", "G/B", "C7sus4").
 * Devuelve { name, shown, frets, simple, bass } o null si no es un acorde.
 */
export function guitarShape(chord) {
  const p = parseChord(chord);
  if (!p) return null;
  const { q, simple } = quality(p.suffix);
  const root = NOTES[p.root];
  const shown = (FLAT[root] && /b/.test(chord.split('/')[0]) ? FLAT[root] : root) + QNAME[q];
  const openKey = root + QNAME[q];
  let frets = OPEN[openKey];
  if (!frets) {
    const eFret = (p.root - 4 + 12) % 12; // raíz en la 6ª cuerda (E)
    const aFret = (p.root - 9 + 12) % 12; // raíz en la 5ª cuerda (A)
    const options = [];
    if (E_SHAPE[q]) options.push(E_SHAPE[q](eFret === 0 ? 12 : eFret));
    if (A_SHAPE[q]) options.push(A_SHAPE[q](aFret === 0 ? 12 : aFret));
    const low = (f) => Math.max(...f.filter((x) => x > 0));
    frets = options.sort((a, b) => low(a) - low(b))[0];
  }
  const bass = p.bass !== null && p.bass !== undefined ? NOTES[p.bass] : null;
  return { name: chord, shown, frets, simple: simple || Boolean(bass), bass };
}

/** Acordes distintos de una canción, en el orden en que aparecen. */
export function chordsInContent(content = '') {
  const out = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(content))) {
    const c = m[1].trim();
    // Se saltan los títulos de sección como [CORO 1] o [FINAL].
    if (/\s/.test(c) || /^[A-ZÁÉÍÓÚÑ]{3,}/.test(c)) continue;
    if (parseChord(c) && !out.includes(c)) out.push(c);
  }
  return out;
}
