// Trae la letra con acordes desde un link (pensado para LaCuerda), sin IA.
// El navegador no deja leer otra página directamente (bloqueo CORS), así que
// se pide a través de servicios "proxy" públicos y gratuitos. Si uno falla,
// se prueba el siguiente.

// Si algún día armamos un servicio propio (gratis, en Cloudflare), su dirección va aquí,
// por ejemplo 'https://cancionero.leo.workers.dev/?url='. Se prueba antes que los públicos.
export const PROXY_PROPIO = '';

// Cada proxy: cómo armar la dirección y, si hace falta, cómo sacar el HTML de la respuesta.
const PROXIES = [
  { name: 'propio', url: (u) => PROXY_PROPIO && PROXY_PROPIO + encodeURIComponent(u) },
  { name: 'allorigins', url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  {
    name: 'allorigins-json',
    url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    json: (d) => d.contents,
  },
  { name: 'codetabs', url: (u) => `https://api.codetabs.com/v1/proxy?quest=${u}` },
  { name: 'jina', url: (u) => `https://r.jina.ai/${u}`, headers: { 'X-Return-Format': 'html' } },
  { name: 'corsproxy', url: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
  { name: 'cors.lol', url: (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}` },
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    const low = e.toLowerCase();
    if (low in ENTITIES) return ENTITIES[low];
    // Letras con tilde: &aacute; &ntilde; &Uuml; …
    const acc = e.match(/^([a-z])(acute|grave|tilde|uml|circ)$/i);
    if (acc) {
      const marks = { acute: '́', grave: '̀', tilde: '̃', uml: '̈', circ: '̂' };
      return (acc[1] + marks[acc[2].toLowerCase()]).normalize('NFC');
    }
    if (low === 'iexcl') return '¡';
    if (low === 'iquest') return '¿';
    return m;
  });
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
  );
}

function cleanBlock(text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  // No más de una línea vacía seguida.
  return lines.filter((l, i) => l.trim() || (lines[i - 1] ?? '').trim()).join('\n');
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s(¡¿"'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}

/** Busca título y autor en la página. */
function findMeta(html) {
  const pick = (re) => {
    const m = html.match(re);
    return m ? stripTags(m[1]).replace(/\s+/g, ' ').trim() : '';
  };
  let title = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let author = pick(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  // <title>RENUEVAME, Marcos Witt: Acordes</title>
  const t = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const tm = t.match(/^(.+?),\s*(.+?)\s*:\s*[^:]*$/);
  if (!title && tm) title = titleCase(tm[1]);
  if (!author && tm) author = tm[2];
  if (author.length > 60) author = '';
  if (title.length > 80) title = '';
  return { title, author };
}

/**
 * Saca la letra con acordes del HTML de la página.
 * LaCuerda la pone en un bloque <pre> (los acordes van marcados dentro, pero
 * ya alineados sobre la letra). Si hay varios, se toma el más largo.
 */
export function extractSong(html) {
  const blocks = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) => cleanBlock(stripTags(m[1])));
  const text = blocks.sort((a, b) => b.length - a.length)[0] || '';
  return { ...findMeta(html), text };
}

/** En LaCuerda, un link sin ".shtml" es la lista de versiones: devuelve la primera versión. */
export function firstVersionLink(html, pageUrl) {
  let base;
  try {
    base = new URL(pageUrl);
  } catch {
    return null;
  }
  const slug = base.pathname.replace(/\/+$/, '').split('/').pop();
  if (!slug) return null;
  for (const m of html.matchAll(/href\s*=\s*["']?([^"'\s>]+\.shtml)/gi)) {
    const abs = new URL(m[1], base);
    const file = abs.pathname.split('/').pop();
    if (file.replace(/(-\d+)?\.shtml$/, '') === slug.replace(/\.shtml$/, '')) return abs.href;
  }
  return null;
}

/** Revisa que sea un link web válido; devuelve el link listo o null. */
export function normalizeUrl(input) {
  const s = (input || '').trim().match(/https?:\/\/\S+/i)?.[0] || (input || '').trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/\./.test(u.hostname)) return null;
    // La versión para celular (m.lacuerda.net) tiene la misma ruta que la normal.
    if (/^m\.lacuerda\.net$/i.test(u.hostname)) u.hostname = 'acordes.lacuerda.net';
    return u.href;
  } catch {
    return null;
  }
}

/** Convierte los bytes a texto: primero UTF-8; si no calza, Latin-1 (páginas antiguas). */
export function bytesToText(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

async function tryProxy(proxy, url, ms) {
  const target = proxy.url(url);
  if (!target) throw new Error('sin configurar');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(target, { signal: ctrl.signal, headers: proxy.headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let html = bytesToText(await res.arrayBuffer());
    if (proxy.json) html = proxy.json(JSON.parse(html)) || '';
    if (!/<pre/i.test(html) && !/\.shtml/i.test(html)) throw new Error('respuesta sin la canción');
    return html;
  } catch (e) {
    throw new Error(`${proxy.name}: ${e.name === 'AbortError' ? 'tardó demasiado' : e.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Descarga la página. Pregunta a todos los proxys a la vez y usa el primero que
 * responda bien (así un proxy caído o lento no frena a los demás).
 */
export async function fetchPage(url) {
  const activos = PROXIES.filter((p) => p.url(url));
  try {
    return await Promise.any(activos.map((p) => tryProxy(p, url, 20000)));
  } catch (e) {
    const detalles = (e.errors || [e]).map((x) => x.message).join(' · ');
    const err = new Error('No se pudo abrir la página');
    err.detalles = detalles;
    throw err;
  }
}

/** Todo junto: link → { title, author, text }. */
export async function importFromLink(input) {
  const url = normalizeUrl(input);
  if (!url) throw new Error('El link no parece válido. Cópialo completo desde la barra del navegador.');
  let html;
  try {
    html = await fetchPage(url);
  } catch (e) {
    const err = new Error('No se pudo leer la página de LaCuerda. Inténtalo de nuevo en un momento; si sigue igual, avísame con el detalle de abajo.');
    err.detalles = e.detalles;
    throw err;
  }
  let song = extractSong(html);
  if (!song.text) {
    const next = firstVersionLink(html, url);
    if (next) {
      try {
        song = extractSong(await fetchPage(next));
      } catch {
        /* se informa abajo */
      }
    }
  }
  if (!song.text) {
    throw new Error('No encontré la letra en esa página. Abre la versión de la canción (la página que muestra los acordes) y copia ese link.');
  }
  return song;
}
