// Importar el historial de asistencia (Check-Ins) exportado de Planning Center.
// Cada fila: fecha, evento, nombre, apellido, tipo de registro, clasificación, visita sin perfil.
// Las ids son estables: importar de nuevo no duplica eventos, personas ni asistencias.
import { clavesNombre } from './importarPco.js';

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const slug = (s) => sinTildes(s).replace(/ /g, '-').slice(0, 40);
const COLS = { fecha: 'Fecha de sesión', evento: 'Evento', nombre: 'Nombre', apellido: 'Apellido', tipo: 'Tipo de registro', clasificacion: 'Clasificación', sinPerfil: 'Visita sin perfil' };

/** Filas de una hoja (la primera es el encabezado) → lista de check-ins. `fecha` convierte la celda a "AAAA-MM-DD". */
export function leerCheckins(filas, fecha) {
  const [head = [], ...resto] = filas;
  const idx = Object.fromEntries(Object.entries(COLS).map(([k, n]) => [k, head.findIndex((h) => sinTildes(h) === sinTildes(n))]));
  if (idx.fecha < 0 || idx.evento < 0 || idx.nombre < 0) return null;
  const v = (r, k) => (idx[k] < 0 ? '' : r[idx[k]] ?? '');
  return resto.map((r) => ({
    fecha: fecha(v(r, 'fecha')), evento: String(v(r, 'evento')).trim(),
    nombre: String(v(r, 'nombre')).trim(), apellido: String(v(r, 'apellido')).trim(),
    tipo: String(v(r, 'tipo')).trim(), clasificacion: String(v(r, 'clasificacion')).trim(),
    sinPerfil: v(r, 'sinPerfil') === true || /^true$/i.test(String(v(r, 'sinPerfil'))),
  })).filter((c) => c.fecha && c.evento && (c.nombre || c.apellido));
}

/** Busca la hoja de check-ins en un libro { hoja: filas }. */
export function hojaCheckins(hojas, fecha) {
  for (const n of ['CheckIns', ...Object.keys(hojas)]) {
    const r = hojas[n] && leerCheckins(hojas[n], fecha);
    if (r) return r;
  }
  return null;
}

const OTRO = /escuela|\boracion\b/; // ojo: "adoración" contiene "oración"

/**
 * Arma lo que hay que escribir:
 * - eventos: { id, name, date, nuevo } (usa el evento que ya existe ese día con ese nombre, o el culto de ese domingo)
 * - personas: { clave, nombre, apellido, n, visita, nino, match: { key, motivo } | null, candidatos: [key] }
 * - registros: { eventId, clave, date }
 */
export function planAsistencia(checkins, people = [], events = []) {
  // Eventos
  const eventos = new Map();
  const evDe = new Map();
  for (const c of checkins) {
    const k = `${c.fecha}|${sinTildes(c.evento)}`;
    if (evDe.has(k)) continue;
    const mismoDia = events.filter((e) => e.date === c.fecha);
    let e = mismoDia.find((x) => sinTildes(x.name) === sinTildes(c.evento));
    if (!e && !OTRO.test(sinTildes(c.evento))) {
      const cultos = mismoDia.filter((x) => !x.soloAsistencia && !OTRO.test(sinTildes(x.name)));
      if (cultos.length === 1) e = cultos[0];
    }
    const ev = e ? { id: e.id, name: e.name, date: c.fecha, nuevo: false } : { id: `pcoe-${c.fecha}-${slug(c.evento)}`, name: c.evento, date: c.fecha, nuevo: true };
    evDe.set(k, ev.id);
    eventos.set(ev.id, ev);
  }

  // Personas: nombre exacto primero; si no, nombre + primer apellido (sin tildes).
  const exacto = new Map(); const parecido = new Map();
  const add = (m, k, key) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(key); };
  for (const p of people) {
    add(exacto, sinTildes(p.nombre || p.apellido ? `${p.nombre || ''} ${p.apellido || ''}` : p.name), p.key);
    clavesNombre(p).forEach((k) => add(parecido, k, p.key));
  }
  const personas = new Map();
  for (const c of checkins) {
    const clave = sinTildes(`${c.nombre} ${c.apellido}`);
    if (!personas.has(clave)) {
      const ex = [...(exacto.get(clave) || [])];
      const pa = [...new Set([...clavesNombre({ nombre: c.nombre, apellido: c.apellido })].flatMap((k) => [...(parecido.get(k) || [])]))];
      const match = ex.length === 1 ? { key: ex[0], motivo: 'mismo nombre' } : !ex.length && pa.length === 1 ? { key: pa[0], motivo: 'nombre parecido' } : null;
      personas.set(clave, { clave, nombre: c.nombre, apellido: c.apellido, n: 0, visita: true, nino: false, match, candidatos: ex.length > 1 ? ex : pa });
    }
    const p = personas.get(clave);
    if (!(c.sinPerfil || c.tipo === 'Guest')) p.visita = false;
    if (c.clasificacion === 'Niño') p.nino = true;
  }

  const registros = new Map();
  for (const c of checkins) {
    const eventId = evDe.get(`${c.fecha}|${sinTildes(c.evento)}`);
    const clave = sinTildes(`${c.nombre} ${c.apellido}`);
    registros.set(`${eventId}|${clave}`, { eventId, clave, date: c.fecha });
  }
  personas.forEach((p) => { p.n = 0; });
  registros.forEach((r) => { personas.get(r.clave).n++; });
  return { eventos: [...eventos.values()], personas: [...personas.values()], registros: [...registros.values()] };
}

/** Clave estable para crear a alguien del historial que no está en la app. */
export const keyNueva = (p) => `pcoa-${slug(`${p.nombre} ${p.apellido}`) || 'sin-nombre'}`;
