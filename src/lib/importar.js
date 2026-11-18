// Convierte una canción copiada de una página web (acordes en la línea de arriba
// de la letra) al formato de la app: [CORO], [VERSO 2] y acordes como [G].
import { nextSectionName } from './chordpro.js';

const NOTE = '(?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])[#b♯♭]?';
const CHORD_TOKEN_RE = new RegExp(
  `^\\(?${NOTE}(?:m(?!aj)|min|maj|M|dim|aug|sus|add|º|°|\\+|-)*` +
  `(?:(?:maj|M|sus|add|b|#|\\+|-)?\\d+)*(?:\\([^)]*\\))?(?:/${NOTE})?\\)?$`
);
// Cosas que pueden aparecer en una línea de acordes y no son letra.
const FILLER_RE = /^(\||\|\||-+|\/|\.+|%|x\d+|\(x\d+\)|\d+x|\*+|:|\(|\))$/i;

const SECTION_WORDS = [
  [/^(intro|introducci[oó]n)$/i, 'INTRO'],
  [/^(pre[\s-]*coro|precoro|pre[\s-]*chorus|prechorus|pre[\s-]*estribillo)$/i, 'PRE CORO'],
  [/^(coro|estribillo|chorus|refr[aá]n)$/i, 'CORO'],
  [/^(verso|estrofa|verse)$/i, 'VERSO'],
  [/^(puente|bridge|interludio|instrumental)$/i, 'PUENTE'],
  [/^(coda|final|outro|cierre|tag)$/i, 'CODA'],
];
const HEADER_RE = /^\s*[[(]?\s*([a-záéíóúñ]+(?:[\s-]+[a-záéíóúñ]+)*)\s*(\d+)?\s*[\])]?\s*:?\s*(.*)$/i;
const KEY_RE = /^\s*(?:tono|tonalidad|key|tono original)\s*:?\s*((?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])[#b]?m?)\b/i;

export function isChordToken(t) {
  return CHORD_TOKEN_RE.test(t);
}

function tokens(line) {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Una línea es de acordes si todo lo que tiene son acordes (o separadores como "|"). */
export function isChordLine(line) {
  const ts = tokens(line);
  if (!ts.length) return false;
  let chords = 0;
  for (const t of ts) {
    if (isChordToken(t)) chords++;
    else if (!FILLER_RE.test(t)) return false;
  }
  return chords > 0;
}

/** "Coro:", "[VERSO 2]", "Intro: G D Em" → { base, rest } */
export function parseHeader(line) {
  const times = Number(line.match(/\(?\s*x\s*(\d+)\s*\)?\s*$/i)?.[1]) || 1;
  const m = line.replace(/\s*\(?\s*x\s*\d+\s*\)?\s*$/i, '').match(HEADER_RE);
  if (!m) return null;
  const word = m[1].trim();
  const found = SECTION_WORDS.find(([re]) => re.test(word));
  if (!found) return null;
  const rest = m[3].trim();
  if (rest && !isChordLine(rest) && !/^\(?x\d+\)?$/i.test(rest)) return null; // "Coro de ángeles canta…" es letra
  return { base: found[1], rest: isChordLine(rest) ? rest : '', times };
}

const normChord = (c) => c.replace(/[()]/g, '').replace('♯', '#').replace('♭', 'b');

/** Pone los acordes de la línea de arriba dentro de la letra, en la misma columna. */
export function mergeChordLine(chordLine, lyric) {
  const found = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine))) {
    if (isChordToken(m[0])) found.push({ pos: m.index, chord: normChord(m[0]) });
  }
  let text = lyric;
  const maxPos = found.length ? found[found.length - 1].pos : 0;
  if (text.length < maxPos) text = text.padEnd(maxPos, ' ');
  for (let i = found.length - 1; i >= 0; i--) {
    const { pos, chord } = found[i];
    text = text.slice(0, pos) + `[${chord}]` + text.slice(pos);
  }
  return text.trimEnd();
}

function chordsOnly(line) {
  return tokens(line).filter(isChordToken).map((c) => `[${normChord(c)}]`).join(' ');
}

const lyricKey = (lines) =>
  lines.map((l) => l.replace(/\[[^\]]*\]/g, '')).join(' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zñ0-9]+/g, ' ').trim();

/**
 * Convierte el texto pegado. Devuelve { content, order, key }.
 * - Los títulos como "Coro:" o "Estrofa 2" se convierten en [CORO], [VERSO 2]…
 * - Si no hay títulos, los bloques que se repiten se marcan como CORO y el resto como VERSO.
 * - Las secciones repetidas se escriben una sola vez y se guarda el orden original.
 */
export function importSong(raw) {
  const lines = raw.replace(/\r/g, '').replace(/\t/g, '    ').replace(/ /g, ' ').split('\n');
  let key = '';
  const blocks = [];
  let cur = null;
  const newBlock = (base) => {
    cur = { base, lines: [], times: 1 };
    blocks.push(cur);
    return cur;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim()) {
      if (cur && cur.lines.length) cur = null;
      continue;
    }
    const k = line.match(KEY_RE);
    if (k) {
      key = k[1];
      continue;
    }
    const header = parseHeader(line);
    if (header) {
      newBlock(header.base).times = Math.min(header.times, 4);
      if (header.rest) cur.lines.push(chordsOnly(header.rest));
      continue;
    }
    if (isChordLine(line)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordLine(next) && !parseHeader(next)) {
        (cur || newBlock(null)).lines.push(mergeChordLine(line, next.replace(/\t/g, '    ').trimEnd()));
        i++;
      } else {
        (cur || newBlock(null)).lines.push(chordsOnly(line));
      }
      continue;
    }
    (cur || newBlock(null)).lines.push(line.trim());
  }

  // Cuántas veces aparece cada bloque (para adivinar el coro).
  const counts = new Map();
  for (const b of blocks) {
    if (!b.lines.length) continue;
    const k = lyricKey(b.lines);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const sections = []; // { name, base, lines, key }
  const order = [];
  for (const b of blocks) {
    if (!b.lines.length) {
      // "Coro" solo, sin letra: repetir el último de ese tipo.
      const prev = [...sections].reverse().find((s) => s.base === b.base);
      if (prev) for (let t = 0; t < b.times; t++) order.push(prev.name);
      continue;
    }
    const k = lyricKey(b.lines);
    const same = k && sections.find((s) => s.key === k);
    if (same) {
      order.push(same.name);
      continue;
    }
    const base = b.base || (k && counts.get(k) > 1 ? 'CORO' : 'VERSO');
    const name = nextSectionName(base, sections.map((s) => s.name));
    if (!name) {
      // Más de 5 del mismo tipo: se junta con la sección anterior.
      const last = sections[sections.length - 1];
      if (last) last.lines.push('', ...b.lines);
      continue;
    }
    sections.push({ name, base, lines: b.lines, key: k });
    order.push(name);
  }

  const content = sections.map((s) => `[${s.name}]\n${s.lines.join('\n')}`).join('\n\n');
  const natural = sections.map((s) => s.name);
  const sameAsNatural = order.length === natural.length && order.every((n, i) => n === natural[i]);
  return { content, order: sameAsNatural ? undefined : order, key };
}
