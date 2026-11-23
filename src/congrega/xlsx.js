// Lector mínimo de planillas Excel (.xlsx) sin dependencias: abre el zip con DecompressionStream
// y lee las celdas de cada hoja. Devuelve { 'NombreHoja': [[celda, …], …] }.
// Fechas: Excel las guarda como número de días; `fechaExcel` las pasa a "AAAA-MM-DD".

const dec = new TextDecoder();

async function inflar(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** Lee los archivos del zip: Map(nombre → texto). Solo los que pide `quiere(nombre)`. */
async function abrirZip(buf, quiere) {
  const u = new Uint8Array(buf);
  const v = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let e = u.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('El archivo no es una planilla Excel (.xlsx).');
  const total = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const out = new Map();
  for (let i = 0; i < total; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo = v.getUint16(p + 10, true);
    const comprimido = v.getUint32(p + 20, true);
    const nLen = v.getUint16(p + 28, true); const xLen = v.getUint16(p + 30, true); const cLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const nombre = dec.decode(u.subarray(p + 46, p + 46 + nLen));
    p += 46 + nLen + xLen + cLen;
    if (!quiere(nombre)) continue;
    const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const datos = u.subarray(ini, ini + comprimido);
    out.set(nombre, dec.decode(metodo === 0 ? datos : await inflar(datos)));
  }
  return out;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const texto = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, c) => (c[0] === '#' ? String.fromCodePoint(c[1] === 'x' || c[1] === 'X' ? parseInt(c.slice(2), 16) : +c.slice(1)) : ENT[c] ?? m));
const tTexto = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => texto(m[1])).join('');
const columna = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** Número de serie de Excel → "AAAA-MM-DD" (o '' si no es fecha). */
export function fechaExcel(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

export async function leerXlsx(buf) {
  const zip = await abrirZip(buf, (n) => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/[^/]+\.xml$/.test(n));
  const wb = zip.get('xl/workbook.xml');
  if (!wb) throw new Error('El archivo no es una planilla Excel (.xlsx).');
  const rels = new Map([...(zip.get('xl/_rels/workbook.xml.rels') || '').matchAll(/<Relationship\b[^>]*>/g)].map(([r]) => [r.match(/Id="([^"]+)"/)?.[1], r.match(/Target="([^"]+)"/)?.[1]]));
  const compartidos = [...(zip.get('xl/sharedStrings.xml') || '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => tTexto(m[1]));
  const hojas = {};
  for (const [, attrs] of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const nombre = texto(attrs.match(/name="([^"]*)"/)?.[1] || '');
    const destino = rels.get(attrs.match(/r:id="([^"]+)"/)?.[1]) || '';
    const xml = zip.get(`xl/${destino.replace(/^\/?xl\//, '')}`);
    if (!xml) continue;
    const filas = [];
    for (const [, fila] of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const r = [];
      for (const [, a, cuerpo = ''] of fila.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = a.match(/r="([A-Z]+)\d+"/)?.[1];
        const t = a.match(/t="(\w+)"/)?.[1];
        const val = cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let x = null;
        if (t === 's') x = compartidos[+val] ?? '';
        else if (t === 'inlineStr') x = tTexto(cuerpo);
        else if (t === 'str' || t === 'e' || t === 'd') x = val == null ? '' : texto(val);
        else if (t === 'b') x = val === '1';
        else if (val != null) x = Number(val);
        r[ref ? columna(ref) : r.length] = x;
      }
      filas.push(Array.from(r, (c) => c ?? null));
    }
    hojas[nombre] = filas;
  }
  return hojas;
}
