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
  const m = chord.trim().replace(/♯/g, '#').replace(/♭/g, 'b').match(CHORD_RE);
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

/** Si la canción no tiene tono elegido, se usa el primer acorde (ej. "Am" → "Am", "G7" → "G"). */
export function guessKey(content = '') {
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(content))) {
    if (sectionHeader(m[0])) continue;
    const p = parseChord(m[1]);
    if (!p) continue;
    const root = indexToNote(p.root, false);
    const minor = /^m(?!aj)/.test(p.suffix);
    return root + (minor ? 'm' : '');
  }
  return '';
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

/** Secciones permitidas. Se escriben solas en una línea: [VERSO], [CORO 2]… (número del 2 al 5). */
export const SECTION_NAMES = ['INTRO', 'VERSO', 'PRE CORO', 'CORO', 'PUENTE', 'INTERLUDIO', 'INSTRUMENTAL', 'FINAL', 'CODA'];
export const MAX_SECTION_NUMBER = 5;
/** Máximo de secciones personalizadas distintas por canción. */
export const MAX_CUSTOM = 3;
const SECTION_LINE_RE = /^\[\s*(INTRO|VERSO|PRE[\s-]*CORO|CORO|PUENTE|INTERLUDIO|INSTRUMENTAL|FINAL|CODA)(?:\s+([1-5]))?\s*\]$/i;
// Sección personalizada: solo MAYÚSCULAS (mínimo 3 letras), para no confundirla con un acorde.
const CUSTOM_LINE_RE = /^\[\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{1,22}[A-ZÁÉÍÓÚÑÜ])(?:\s+([1-5]))?\s*\]$/;
const LATIN_UPPER = /^(DO|RE|MI|FA|SOL|LA|SI)M?$/;

/** Limpia el nombre que escribe el usuario para una sección personalizada. */
export function cleanCustomName(text = '') {
  return text
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÑÜ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

/** ¿Se puede usar este nombre como sección personalizada? */
export function validCustomName(name) {
  return Boolean(name) && CUSTOM_LINE_RE.test(`[${name}]`) && !LATIN_UPPER.test(name) && !SECTION_LINE_RE.test(`[${name}]`);
}

/** Si la línea es un título de sección como "[CORO 2]", devuelve "CORO 2". */
export function sectionHeader(line) {
  const t = line.trim();
  const m = t.match(SECTION_LINE_RE);
  if (m) {
    const base = m[1].toUpperCase().replace(/^PRE[\s-]*CORO$/, 'PRE CORO');
    return m[2] ? `${base} ${m[2]}` : base;
  }
  const c = t.match(CUSTOM_LINE_RE);
  if (c && !LATIN_UPPER.test(c[1].trim())) {
    const base = c[1].trim().replace(/\s+/g, ' ');
    return c[2] ? `${base} ${c[2]}` : base;
  }
  return null;
}

/** Nombre para mostrar: la primera sección también lleva número ("CORO" → "CORO 1"). */
export function sectionLabel(name = '') {
  return /\s\d+$/.test(name) ? name : `${name} 1`;
}

/** Nombre sin el número final: "CORO 2" → "CORO". */
export function sectionBase(name = '') {
  return name.replace(/\s+\d+$/, '').trim();
}

/**
 * Tipo visual de una sección según su nombre (para el color):
 * intro, verse, prechorus, chorus, bridge, interlude, instrumental, final, coda o custom.
 */
export function sectionKind(name = '') {
  const b = normalize(sectionBase(name)).replace(/[-\s]+/g, ' ');
  if (/^(intro|introduccion)$/.test(b)) return 'intro';
  if (/^(verso|estrofa|verse)$/.test(b)) return 'verse';
  if (/^(pre ?coro|pre ?chorus|pre ?estribillo)$/.test(b)) return 'prechorus';
  if (/^(coro|estribillo|chorus|refran)$/.test(b)) return 'chorus';
  if (/^(puente|bridge)$/.test(b)) return 'bridge';
  if (/^interludio$/.test(b)) return 'interlude';
  if (/^(instrumental|solo)$/.test(b)) return 'instrumental';
  if (/^(final|outro|cierre)$/.test(b)) return 'final';
  if (/^(coda|tag)$/.test(b)) return 'coda';
  return 'custom';
}

const ABBR = { intro: 'I', verse: 'V', prechorus: 'PC', chorus: 'C', bridge: 'P', interlude: 'IT', instrumental: 'IN', final: 'F', coda: 'CD' };

/** Abreviatura de 1-2 letras: "PRE-CORO 1" → "PC", "SOLO DE GUITARRA" → "SO". */
export function sectionAbbr(name = '') {
  const kind = sectionKind(name);
  if (ABBR[kind]) return ABBR[kind];
  return normalize(sectionBase(name)).replace(/[^a-z]/g, '').slice(0, 2).toUpperCase() || '?';
}

/** Nombres base de las secciones personalizadas que hay en el texto (sin repetir). */
export function customBases(content = '') {
  const out = [];
  for (const raw of content.split('\n')) {
    const h = sectionHeader(raw);
    if (!h || SECTION_LINE_RE.test(raw.trim())) continue;
    const base = sectionBase(h);
    if (!out.includes(base)) out.push(base);
  }
  return out;
}

/**
 * Nombre para la siguiente sección de un tipo: "VERSO 1", luego "VERSO 2"… hasta 5.
 * Devuelve null si ya se llegó al máximo.
 */
export function nextSectionName(base, existingNames) {
  const names = new Set(existingNames.map((n) => n.toUpperCase()));
  if (!names.has(base) && !names.has(`${base} 1`)) return `${base} 1`;
  for (let n = 2; n <= MAX_SECTION_NUMBER; n++) {
    if (!names.has(`${base} ${n}`)) return `${base} ${n}`;
  }
  return null;
}

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

  for (const raw of cleanText(content).split('\n')) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) continue; // comentario interno, no se muestra

    const header = sectionHeader(trimmed);
    if (header) {
      close();
      open(typeFromLabel(header), header);
      inSection = false; // la sección termina con la próxima línea vacía
      continue;
    }

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
      return { name: unique, type: b.type, kind: sectionKind(unique), lines: b.lines };
    });
}

/** En un orden, las "marcas" (secciones sin letra, ej. un instrumental) se guardan con "~" adelante. */
export const MARKER = '~';
export const isMarker = (n) => typeof n === 'string' && n.startsWith(MARKER);
export const markerName = (n) => (isMarker(n) ? n.slice(1) : n);

/**
 * Ordena las secciones según una lista de nombres (se pueden repetir).
 * Las repeticiones seguidas se juntan en una sola sección con `times` (×2, ×3…).
 * Si no hay orden o ningún nombre coincide, se usa el orden original.
 */
export function arrangeSections(sections, order) {
  let list = sections;
  if (Array.isArray(order) && order.length > 0) {
    const byName = new Map(sections.map((s) => [s.name, s]));
    const arranged = order
      .map((n) => (isMarker(n)
        ? { name: markerName(n), type: 'verse', kind: sectionKind(markerName(n)), lines: [], marker: true }
        : byName.get(n)))
      .filter(Boolean);
    if (arranged.some((s) => !s.marker)) list = arranged;
  }
  const out = [];
  for (const s of list) {
    const prev = out[out.length - 1];
    if (prev && prev.name === s.name) prev.times += 1;
    else out.push({ ...s, times: 1 });
  }
  return out;
}

/** Agrupa repeticiones seguidas: ['CORO','CORO','VERSO'] → [{name:'CORO', times:2}, {name:'VERSO', times:1}]. */
export function groupOrder(order = []) {
  const out = [];
  for (const name of order) {
    const prev = out[out.length - 1];
    if (prev && prev.name === name) prev.times += 1;
    else out.push({ name, times: 1 });
  }
  return out;
}

/**
 * Al editar la letra: las secciones nuevas se agregan al final del orden elegido
 * y se quitan las que ya no existen (las marcas sin letra se mantienen).
 */
export function syncOrder(order, oldContent, newContent) {
  if (!Array.isArray(order) || order.length === 0) return order;
  const before = new Set(parseSong(oldContent).map((s) => s.name));
  const now = parseSong(newContent).map((s) => s.name);
  const nowSet = new Set(now);
  const kept = order.filter((n) => isMarker(n) || nowSet.has(n));
  const added = now.filter((n) => !before.has(n) && !kept.includes(n));
  const result = [...kept, ...added];
  return result.some((n) => !isMarker(n)) ? result : undefined;
}

export function flattenGroups(groups) {
  return groups.flatMap((g) => Array(g.times).fill(g.name));
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

/**
 * Limpia texto pegado de otras apps o páginas web: todos los tipos de salto de línea pasan a ser
 * un Enter normal, los espacios especiales a espacio normal y se quitan caracteres invisibles.
 */
export function cleanText(text = '') {
  return String(text)
    .replace(/\r\n?|[\u2028\u2029\u0085\u000b\u000c]/g, '\n')
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, '')
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ');
}

/** "Sol", "sol m", "G" → nombre de tono como en KEYS ("G", "Gm"); '' si no se entiende. */
export function normalizeKey(key = '') {
  const s = key.trim();
  const m = s.match(/^(Do|Re|Mi|Fa|Sol|La|Si|[A-G])\s*([#b]?)\s*(m|menor)?$/i);
  if (!m) return '';
  const note = m[1].length > 1 ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : m[1].toUpperCase();
  const idx = noteToIndex(note + m[2]);
  if (idx === null) return '';
  const minor = !!m[3];
  const flats = m[2] === 'b' || FLAT_KEYS.has(indexToNote(idx, true) + (minor ? 'm' : ''));
  const name = indexToNote(idx, flats) + (minor ? 'm' : '');
  if (KEYS.includes(name)) return name;
  const alt = indexToNote(idx, !flats) + (minor ? 'm' : '');
  return KEYS.includes(alt) ? alt : name;
}

// Acordes de cada grado en un tono mayor: [distancia desde la tónica, ¿menor?, peso].
const MAJOR_DEGREES = [[0, false, 3], [2, true, 1], [4, true, 1], [5, false, 2], [7, false, 2], [9, true, 1.5]];

/**
 * Adivina el tono mirando todos los acordes: el tono en que más acordes "calzan",
 * con un extra si la canción empieza o termina en ese acorde.
 */
export function detectKey(content = '') {
  const chords = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(content))) {
    if (sectionHeader(m[0])) continue;
    const p = parseChord(m[1]);
    if (p) chords.push({ root: p.root, minor: /^m(?!aj)/.test(p.suffix) || /^min/.test(p.suffix), flat: /^[A-G]b|^(Do|Re|Mi|Fa|Sol|La|Si)b/.test(m[1]) });
  }
  if (!chords.length) return '';
  const first = chords[0];
  const last = chords[chords.length - 1];
  let best = null;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const minor of [false, true]) {
      const rel = minor ? (tonic + 3) % 12 : tonic; // el mayor relativo
      let score = 0;
      for (const c of chords) {
        const d = MAJOR_DEGREES.find(([off, min]) => (rel + off) % 12 === c.root && min === c.minor);
        if (d) score += 1;
        // En menor, el V suele ser mayor (ej. B en Em).
        else if (minor && !c.minor && c.root === (tonic + 7) % 12) score += 0.8;
      }
      const isTonic = (c) => c.root === tonic && c.minor === minor;
      if (isTonic(first)) score += chords.length * 0.15 + 1;
      if (isTonic(last)) score += chords.length * 0.1 + 0.5;
      if (!minor) score += 0.01; // empate: mayor
      if (!best || score > best.score) best = { score, tonic, minor };
    }
  }
  const useFlats = chords.some((c) => c.flat);
  return normalizeKey(indexToNote(best.tonic, useFlats) + (best.minor ? 'm' : ''));
}
