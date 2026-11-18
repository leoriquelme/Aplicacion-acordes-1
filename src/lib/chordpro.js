// Utilidades para leer canciones en formato ChordPro y transponer acordes.

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LATIN_TO_US = { Do: 'C', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
const US_TO_LATIN = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

// Tonalidades que se escriben normalmente con bemoles.
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

const NOTE_RE = '(?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])[#b]?';
const CHORD_RE = new RegExp(`^(${NOTE_RE})([^/]*)(?:/(${NOTE_RE}))?$`);

function noteToIndex(note) {
  const m = note.match(/^(Do|Re|Mi|Fa|Sol|La|Si|[A-G])([#b]?)$/);
  if (!m) return null;
  const letter = LATIN_TO_US[m[1]] || m[1];
  let i = BASE[letter];
  if (m[2] === '#') i += 1;
  if (m[2] === 'b') i -= 1;
  return (i + 12) % 12;
}

export function parseChord(chord) {
  const m = chord.trim().match(CHORD_RE);
  if (!m) return null;
  const root = noteToIndex(m[1]);
  if (root === null) return null;
  const bass = m[3] ? noteToIndex(m[3]) : null;
  return { root, suffix: m[2], bass };
}

function indexToNote(i, useFlats) {
  return (useFlats ? FLATS : SHARPS)[((i % 12) + 12) % 12];
}

function toLatin(note) {
  return US_TO_LATIN[note[0]] + note.slice(1);
}

export function keyUsesFlats(key) {
  return FLAT_KEYS.has(key);
}

/** Transpone un acorde y lo escribe en la notación elegida ('americano' o 'latino'). */
export function transposeChord(chord, steps, { useFlats = false, notation = 'americano' } = {}) {
  const p = parseChord(chord);
  if (!p) return chord; // No es un acorde reconocible (ej. "N.C."), se deja igual.
  let root = indexToNote(p.root + steps, useFlats);
  let bass = p.bass !== null ? indexToNote(p.bass + steps, useFlats) : null;
  if (notation === 'latino') {
    root = toLatin(root);
    if (bass) bass = toLatin(bass);
  }
  return root + p.suffix + (bass ? '/' + bass : '');
}

/** Devuelve el tono resultante (en notación americana) tras transponer. */
export function transposeKey(key, steps) {
  if (!key) return '';
  const p = parseChord(key);
  if (!p) return key;
  const flatGuess = indexToNote(p.root + steps, true) + p.suffix;
  const useFlats = keyUsesFlats(flatGuess);
  return indexToNote(p.root + steps, useFlats) + p.suffix;
}

/** Opciones para mostrar acordes según el tono de destino. */
export function chordOptions(key, steps, notation) {
  const target = transposeKey(key, steps);
  return { useFlats: target ? keyUsesFlats(target) : false, notation };
}

export function displayKey(key, steps, notation) {
  const k = transposeKey(key, steps);
  if (!k) return '';
  return notation === 'latino' ? transposeChord(k, 0, { notation, useFlats: k.includes('b') }) : k;
}

/** Divide una línea en segmentos { chord, text }. */
export function parseLine(line) {
  const segments = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let chord = '';
  let m;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (text || chord) segments.push({ chord, text });
    chord = m[1];
    last = re.lastIndex;
  }
  const rest = line.slice(last);
  if (rest || chord) segments.push({ chord, text: rest });
  return segments;
}

const DIRECTIVE_RE = /^\{\s*([a-zA-Z_]+)\s*(?::\s*(.*?))?\s*\}$/;

function typeFromLabel(label) {
  if (/^\s*(coro|chorus|estribillo)/i.test(label)) return 'chorus';
  if (/^\s*(puente|bridge)/i.test(label)) return 'bridge';
  return 'verse';
}

const DEFAULT_NAMES = { verse: 'Verso', chorus: 'Coro', bridge: 'Puente' };

/**
 * Convierte el texto ChordPro en secciones con nombre:
 * { name, type: 'verse' | 'chorus' | 'bridge', lines: [...] } donde cada línea es
 * { type: 'lyrics', segments } o { type: 'comment', text }.
 *
 * Una sección empieza con {start_of_verse: Verso 1}, {soc}, {start_of_bridge},
 * con un {c: Nombre} al inicio de un bloque, o simplemente después de una línea en blanco.
 * Las secciones sin nombre se llaman "Verso 1", "Verso 2", "Coro", "Puente", etc.
 */
export function parseSong(content = '') {
  const blocks = [];
  let current = null;
  let inSection = false; // dentro de {soc}…{eoc} las líneas en blanco no cortan

  const open = (type, label) => {
    current = { type, label, lines: [] };
    blocks.push(current);
    return current;
  };
  const close = () => {
    current = null;
  };

  for (const raw of content.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) continue; // comentario interno, no se muestra

    const d = trimmed.match(DIRECTIVE_RE);
    if (d) {
      const name = d[1].toLowerCase();
      const value = (d[2] || '').trim();
      if (['soc', 'start_of_chorus'].includes(name)) {
        close();
        open('chorus', value);
        inSection = true;
      } else if (['sov', 'start_of_verse'].includes(name)) {
        close();
        open(value ? typeFromLabel(value) : 'verse', value);
        inSection = true;
      } else if (['sob', 'start_of_bridge'].includes(name)) {
        close();
        open('bridge', value);
        inSection = true;
      } else if (['eoc', 'end_of_chorus', 'eov', 'end_of_verse', 'eob', 'end_of_bridge'].includes(name)) {
        close();
        inSection = false;
      } else if (['c', 'comment', 'ci', 'comment_italic'].includes(name)) {
        if (!current) open(typeFromLabel(value), value);
        else if (!current.label && current.lines.length === 0) current.label = value;
        else current.lines.push({ type: 'comment', text: value });
      }
      // {title}, {artist}, {key} y otras directivas no se muestran en la letra.
      continue;
    }

    if (trimmed === '') {
      if (!inSection) close();
      continue;
    }

    (current || open('verse', '')).lines.push({ type: 'lyrics', segments: parseLine(line) });
  }

  // Ponerle nombre único a cada sección.
  const used = new Set();
  const counters = {};
  return blocks
    .filter((b) => b.lines.length > 0)
    .map((b) => {
      let name = b.label;
      if (!name) {
        counters[b.type] = (counters[b.type] || 0) + 1;
        name = DEFAULT_NAMES[b.type] + (b.type === 'verse' ? ` ${counters[b.type]}` : '');
      }
      let unique = name;
      for (let k = 2; used.has(unique); k++) unique = `${name} ${k}`;
      used.add(unique);
      return { name: unique, type: b.type, lines: b.lines };
    });
}

/**
 * Ordena las secciones según una lista de nombres (se pueden repetir).
 * Si no hay orden o ningún nombre coincide, se usa el orden original.
 */
export function arrangeSections(sections, order) {
  if (!Array.isArray(order) || order.length === 0) return sections;
  const byName = new Map(sections.map((s) => [s.name, s]));
  const arranged = order.map((n) => byName.get(n)).filter(Boolean);
  return arranged.length ? arranged : sections;
}

/** Lee {title}, {artist} y {key} si vienen en el texto. */
export function parseMeta(content = '') {
  const meta = {};
  for (const raw of content.split('\n')) {
    const d = raw.trim().match(DIRECTIVE_RE);
    if (!d) continue;
    const name = d[1].toLowerCase();
    if (['title', 't'].includes(name)) meta.title = d[2];
    if (['artist', 'author', 'subtitle', 'st'].includes(name)) meta.author ??= d[2];
    if (name === 'key') meta.key = d[2];
  }
  return meta;
}

/** Busca sin importar mayúsculas ni tildes. */
export function normalize(text = '') {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const KEYS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];
