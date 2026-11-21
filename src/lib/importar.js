// Convierte una canción copiada de una página web (acordes en la línea de arriba
// de la letra) al formato de la app: [CORO], [VERSO 2] y acordes como [G].
import { MAX_SECTION_NUMBER, cleanText, guessKey, nextSectionName, sectionHeader } from './chordpro.js';

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
  [/^(puente|bridge)$/i, 'PUENTE'],
  [/^(interludio|interlude)$/i, 'INTERLUDIO'],
  [/^(instrumental|solo)$/i, 'INSTRUMENTAL'],
  [/^(final|outro|cierre)$/i, 'FINAL'],
  [/^(coda|tag)$/i, 'CODA'],
];
const HEADER_RE = /^\s*[[(]?\s*([a-záéíóúñ]+(?:[\s-]+[a-záéíóúñ]+)*)\s*(\d+)?\s*[\])]?\s*:?\s*(.*)$/i;
const KEY_RE = /^\s*(?:tono|tonalidad|key|tono original)\s*:?\s*((?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])[#b]?m?)\b/i;

export function isChordToken(t) {
  return CHORD_TOKEN_RE.test(t);
}

function tokens(line) {
  // Separa también por barras de compás "|" y quita puntos o comas pegados al acorde ("D.", "Esus,").
  return line.trim().split(/[\s|]+/).map((t) => t.replace(/^[.,;:·]+|[.,;:·]+$/g, '')).filter(Boolean);
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
  const re = /[^\s|]+/g;
  let m;
  while ((m = re.exec(chordLine))) {
    const t = m[0].replace(/^[.,;:·]+|[.,;:·]+$/g, '');
    if (isChordToken(t)) found.push({ pos: m.index + m[0].indexOf(t), chord: normChord(t) });
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

const words = (k) => (k ? k.split(' ') : []);

/** Parecido entre dos letras (0 a 1), por palabras en el mismo orden. */
export function lyricSimilarity(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return 0;
  // Largo de la subsecuencia común más larga (LCS).
  let prev = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const row = [0];
    for (let j = 1; j <= y.length; j++) {
      row[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    }
    prev = row;
  }
  return (2 * prev[y.length]) / (x.length + y.length);
}

// Dos bloques son "el mismo" (ej. el coro escrito dos veces) si se parecen al menos así.
const SAME = 0.85;
const isSame = (a, b) => a === b || (words(a).length >= 4 && words(b).length >= 4 && lyricSimilarity(a, b) >= SAME);
const lyricLines = (lines) => lines.filter((l) => lyricKey([l]));
const chordCount = (lines) => lines.join(' ').match(/\[[^\]]*\]/g)?.length || 0;

/**
 * Si un bloque trae pegado (sin línea en blanco) otro bloque que se repite en la canción,
 * o el mismo coro dos veces seguidas, se separa en dos.
 */
function splitMerged(blocks) {
  const out = [];
  for (const b of blocks) out.push(b);
  for (let guard = 0; guard < 20; guard++) {
    let changed = false;
    for (let i = 0; i < out.length && !changed; i++) {
      const a = out[i];
      const al = lyricLines(a.lines).length;
      if (al < 4) continue;
      // El mismo bloque dos veces seguidas: mitad y mitad.
      if (a.lines.length % 2 === 0) {
        const h = a.lines.length / 2;
        const k1 = lyricKey(a.lines.slice(0, h));
        if (lyricLines(a.lines.slice(0, h)).length >= 2 && isSame(k1, lyricKey(a.lines.slice(h)))) {
          out.splice(i, 1, { ...a, lines: a.lines.slice(0, h) }, { ...a, lines: a.lines.slice(h), times: 1 });
          changed = true;
          continue;
        }
      }
      for (const b of out) {
        if (b === a || lyricLines(b.lines).length < 2 || b.lines.length >= a.lines.length) continue;
        const n = b.lines.length;
        const kb = lyricKey(b.lines);
        if (isSame(lyricKey(a.lines.slice(-n)), kb)) {
          out.splice(i, 1, { ...a, lines: a.lines.slice(0, -n) }, { base: b.base, lines: a.lines.slice(-n), times: 1 });
          changed = true;
          break;
        }
        if (isSame(lyricKey(a.lines.slice(0, n)), kb)) {
          out.splice(i, 1, { base: b.base, lines: a.lines.slice(0, n), times: 1 }, { ...a, base: null, lines: a.lines.slice(n) });
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }
  return out;
}

/**
 * Analiza el texto pegado. Devuelve { sections: [{ base, lines }], order, key }.
 * - Los títulos como "Coro:" o "Estrofa 2" se convierten en [CORO], [VERSO 2]…
 * - Si no hay títulos, los bloques que se repiten se marcan como CORO y el resto como VERSO.
 * - Las secciones repetidas se escriben una sola vez y se guarda el orden original.
 */
export function analyzeSong(raw) {
  const lines = cleanText(raw).replace(/\t/g, '    ').replace(/ /g, ' ').split('\n');
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

  const all = splitMerged(blocks);
  // Cuántas veces aparece cada bloque, aunque esté escrito un poco distinto (para adivinar el coro).
  const keys = all.map((b) => (b.lines.length ? lyricKey(b.lines) : ''));
  const repeated = (k) => k && keys.filter((x) => x && isSame(x, k)).length > 1;

  const sections = []; // { base, lines, key }
  const order = []; // posiciones en "sections", en el orden en que se canta
  const countOf = (base) => sections.filter((x) => x.base === base).length;
  for (const b of all) {
    if (!b.lines.length) {
      // "Coro" solo, sin letra: repetir el último de ese tipo.
      const prev = sections.map((x, i) => i).reverse().find((i) => sections[i].base === b.base);
      if (prev !== undefined) for (let t = 0; t < b.times; t++) order.push(prev);
      continue;
    }
    const k = lyricKey(b.lines);
    let same = k ? sections.findIndex((x) => x.key === k) : -1;
    if (same < 0 && k) same = sections.findIndex((x) => isSame(x.key, k) && (!b.base || b.base === x.base));
    if (same >= 0) {
      // Se queda con la versión que tiene más acordes.
      if (chordCount(b.lines) > chordCount(sections[same].lines)) sections[same].lines = b.lines;
      for (let t = 0; t < b.times; t++) order.push(same);
      continue;
    }
    const base = b.base || (repeated(k) ? 'CORO' : 'VERSO');
    if (countOf(base) >= MAX_SECTION_NUMBER && sections.length) {
      // Más de 5 del mismo tipo: se junta con la sección anterior.
      sections[sections.length - 1].lines.push(...b.lines);
      continue;
    }
    sections.push({ base, lines: b.lines, key: k });
    order.push(sections.length - 1);
  }

  return { sections: sections.map(({ base, lines }) => ({ base, lines })), order, key };
}

/** Nombres de cada sección según su tipo: VERSO 1, VERSO 2, CORO 1… */
export function sectionNames(sections) {
  const seen = {};
  return sections.map((x) => {
    seen[x.base] = (seen[x.base] || 0) + 1;
    return `${x.base} ${seen[x.base]}`;
  });
}

/** Arma el texto final y el orden (o undefined si es el orden natural). */
export function buildSong(sections, order) {
  const names = sectionNames(sections);
  const content = sections.map((x, i) => `[${names[i]}]\n${x.lines.join('\n')}`).join('\n\n');
  const natural = sections.map((_, i) => i);
  const valid = order.filter((i) => i >= 0 && i < sections.length);
  const same = valid.length === natural.length && valid.every((n, i) => n === i);
  return { content, order: same || !valid.length ? undefined : valid.map((i) => names[i]) };
}

/** Convierte el texto pegado. Devuelve { content, order, key }. */
export function importSong(raw) {
  const r = analyzeSong(raw);
  return { ...buildSong(r.sections, r.order), key: r.key };
}

// ---- Ajustes manuales (devuelven copias nuevas) ----

const dedupe = (order) => order.filter((n, i) => i === 0 || n !== order[i - 1]);

/** Une la sección i con la anterior. */
export function mergeWithPrevious(state, i) {
  if (i <= 0) return state;
  const sections = state.sections.map((x) => ({ ...x, lines: [...x.lines] }));
  sections[i - 1].lines.push(...sections[i].lines);
  sections.splice(i, 1);
  const order = dedupe(state.order.map((n) => (n === i ? i - 1 : n > i ? n - 1 : n)));
  return { ...state, sections, order };
}

/** Divide la sección i antes de la línea "line": la segunda parte queda como nueva sección. */
export function splitSection(state, i, line, base) {
  const sec = state.sections[i];
  if (line <= 0 || line >= sec.lines.length) return state;
  const sections = [...state.sections];
  sections.splice(i, 1, { ...sec, lines: sec.lines.slice(0, line) }, { base: base || sec.base, lines: sec.lines.slice(line) });
  const order = state.order.flatMap((n) => (n === i ? [i, i + 1] : n > i ? [n + 1] : [n]));
  return { ...state, sections, order };
}

export function removeSection(state, i) {
  const sections = state.sections.filter((_, k) => k !== i);
  const order = dedupe(state.order.filter((n) => n !== i).map((n) => (n > i ? n - 1 : n)));
  return { ...state, sections, order };
}

export function setSectionType(state, i, base) {
  const used = state.sections.filter((x, k) => k !== i && x.base === base).length;
  if (used >= MAX_SECTION_NUMBER) return state;
  return { ...state, sections: state.sections.map((x, k) => (k === i ? { ...x, base } : x)) };
}

/**
 * Para mostrar y transponer: si alguien escribió los acordes en la línea de arriba
 * (sin corchetes), los pasa al formato [G] para que también cambien de tono.
 */
export function convertPlainChords(content = '') {
  const lines = cleanText(content).split('\n');
  const plain = (l) => l.trim() && !l.includes('[') && !l.trim().startsWith('{') && !l.trim().startsWith('#');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\t/g, '    ');
    if (plain(line) && isChordLine(line)) {
      const next = lines[i + 1];
      if (next !== undefined && plain(next) && !isChordLine(next)) {
        out.push(mergeChordLine(line, next.replace(/\t/g, '    ').trimEnd()));
        i++;
      } else {
        out.push(chordsOnly(line));
      }
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}

/** Tono de una canción: el elegido o, si no hay, el del primer acorde. */
export function songKey(song) {
  return song?.key || guessKey(convertPlainChords(song?.content || ''));
}

/**
 * Botón "Autodetectar acordes" del editor: pasa los acordes escritos arriba de la letra
 * al formato [G] y los títulos como "Coro:" o "Estrofa 2" a [CORO], [VERSO 2].
 * Devuelve { content, chords, headers } con cuántas líneas cambió.
 */
export function autodetect(content = '') {
  const lines = cleanText(content).split('\n');
  const names = lines.map((l) => sectionHeader(l)).filter(Boolean);
  let headers = 0;
  const withHeaders = lines.map((line) => {
    if (!line.trim() || line.includes('[') || sectionHeader(line)) return line;
    const h = parseHeader(line);
    if (!h) return line;
    const name = nextSectionName(h.base, names);
    if (!name) return line;
    names.push(name);
    headers++;
    return `[${name}]` + (h.rest ? `\n${chordsOnly(h.rest)}` : '');
  });
  const before = withHeaders.join('\n');
  const after = convertPlainChords(before);
  const chords = before.split('\n').filter((l) => l.trim() && !l.includes('[') && isChordLine(l)).length;
  return { content: after, chords, headers };
}
