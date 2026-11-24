// Personas repetidas (vienen de distintas bases) y el tipo de cada asistencia.
import { fusionarDatos } from './importarPco.js';

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const nombreCompleto = (p) => (p.nombre || p.apellido ? `${p.nombre || ''} ${p.apellido || ''}` : p.name || '').trim();

/** "juan olivares": primer nombre + primer apellido, sin tildes. */
export function claveDuplicado(p) {
  const n = sinTildes(p.nombre || (p.apellido ? '' : p.name)).split(' ');
  const ap = p.apellido ? sinTildes(p.apellido).split(' ')[0] : n[1];
  return n[0] && ap ? `${n[0]} ${ap}` : '';
}

/** Grupos de 2 o más personas con el mismo primer nombre y primer apellido. */
export function gruposDuplicados(people) {
  const g = new Map();
  people.forEach((p) => { const k = claveDuplicado(p); if (k) { if (!g.has(k)) g.set(k, []); g.get(k).push(p); } });
  return [...g.values()].filter((x) => x.length > 1);
}

/** Quién queda: si una tiene cuenta (entró con Google), esa. Si ambas tienen cuenta, no se pueden unir. */
export function ordenarUnion(elegida, otra) {
  if (elegida.uid && otra.uid) return null;
  return otra.uid ? [otra, elegida] : [elegida, otra];
}

/** Datos visibles de la persona que queda después de unir a `otra` en `queda`. */
export function personaUnida(queda, otra) {
  const sinClave = ({ key, ...x }) => x; // eslint-disable-line no-unused-vars
  const out = fusionarDatos(sinClave(otra), sinClave(queda)); // lo de quien queda manda; lo que falta viene de la otra
  if (queda.uid) { out.uid = queda.uid; out.role = queda.role; out.name = queda.name; }
  else { out.uid = ''; out.role = queda.role || 'colaborador'; }
  out.teams = [...new Set([...(queda.teams || []), ...(otra.teams || [])])];
  const nombres = new Set([...(queda.otrosNombres || []), ...(otra.otrosNombres || [])]);
  if (sinTildes(nombreCompleto(otra)) !== sinTildes(nombreCompleto(queda))) nombres.add(nombreCompleto(otra));
  out.otrosNombres = [...nombres].filter(Boolean).slice(0, 20);
  const pcos = new Set([...(queda.otrosPcoIds || []), ...(otra.otrosPcoIds || []), otra.pcoId].filter(Boolean).map(String));
  if (queda.pcoId) { out.pcoId = queda.pcoId; pcos.delete(String(queda.pcoId)); } else if (otra.pcoId) { out.pcoId = otra.pcoId; pcos.delete(String(otra.pcoId)); }
  out.otrosPcoIds = [...pcos];
  if (!out.otrosPcoIds.length) delete out.otrosPcoIds;
  if (!out.otrosNombres.length) delete out.otrosNombres;
  return out;
}

export const TIPOS_ASISTENCIA = [['regular', 'Regular'], ['visita', 'Visita'], ['colaborador', 'Colaborador']];
export const VISITAS_ANTES_DE_REGULAR = 3;

/**
 * Tipo por defecto al marcar a alguien:
 * colaborador si sirve en ese evento; visita mientras lleve menos de 3 asistencias (y no sea miembro
 * ni asistente habitual); desde la cuarta, regular.
 */
export function tipoPorDefecto(p, { sirve = false, anteriores = 0 } = {}) {
  if (sirve) return 'colaborador';
  if (anteriores >= VISITAS_ANTES_DE_REGULAR) return 'regular';
  if (p.tipo === 'Visita') return 'visita';
  if (p.miembro === true || p.tipo === 'Activo' || p.tipo === 'Regular' || p.uid) return 'regular';
  return 'visita';
}

/** Tipo de registro de Planning Center Check-Ins → tipo de asistencia. */
export const tipoDePco = (c) => (c.tipo === 'Volunteer' ? 'colaborador' : c.tipo === 'Guest' || c.sinPerfil ? 'visita' : 'regular');

// Campos que se comparan al unir: [campo, etiqueta, dónde está ('people' o 'ficha')].
export const CAMPOS_UNION = [
  ['nombre', 'Nombre', 'people'], ['apellido', 'Apellidos', 'people'], ['apodo', 'Apodo', 'people'], ['segundoNombre', 'Segundo nombre', 'ficha'],
  ['photo', 'Foto', 'people'], ['familiaId', 'Familia', 'people'], ['rolFamilia', 'Rol en la familia', 'people'],
  ['tipo', 'Asistencia habitual', 'people'], ['miembro', 'Miembro', 'people'], ['rangoEdad', 'Rango de edad', 'people'],
  ['telefono', 'Celular', 'ficha'], ['email', 'Correo', 'ficha'], ['direccion', 'Dirección', 'ficha'], ['comuna', 'Comuna', 'ficha'], ['region', 'Región', 'ficha'],
  ['fechaNacimiento', 'Fecha de nacimiento', 'ficha'], ['genero', 'Género', 'ficha'], ['estadoCivil', 'Estado civil', 'ficha'], ['aniversario', 'Aniversario', 'ficha'],
  ['fechaLlegada', 'Llegó a la iglesia', 'ficha'], ['fechaConversion', 'Fecha de conversión', 'ficha'], ['bautizado', 'Bautizado/a', 'ficha'], ['fechaBautismo', 'Fecha de bautismo', 'ficha'],
];
const vacio = (v) => v === '' || v == null || (Array.isArray(v) && !v.length);
const mismo = (a, b) => (typeof a === 'string' && typeof b === 'string' ? sinTildes(a) === sinTildes(b) : JSON.stringify(a) === JSON.stringify(b));

/** El "mejor" de dos valores distintos: el texto más completo (más largo); si empatan, el de la base. */
export function valorMejor(base, otro) {
  if (vacio(base)) return otro;
  if (vacio(otro)) return base;
  if (typeof base === 'string' && typeof otro === 'string' && !base.startsWith('data:') && otro.trim().length > base.trim().length) return otro;
  return base;
}

/**
 * Compara dos perfiles campo por campo. `base` es el que queda (el que tiene cuenta de Google, si hay).
 * Devuelve [{ campo, label, donde, a, b, estado: 'igual' | 'soloA' | 'soloB' | 'distinto', elegido }].
 */
export function compararPerfiles(base, otra, fBase = {}, fOtra = {}) {
  return CAMPOS_UNION.map(([campo, label, donde]) => {
    // Quien entró con Google a veces solo tiene `name` (sin nombre y apellido separados).
    const de = (p, f) => (donde === 'ficha' ? f[campo] : campo === 'nombre' && !p.nombre && !p.apellido ? p.name : p[campo]);
    const a = de(base, fBase);
    const b = de(otra, fOtra);
    let estado = 'igual';
    if (vacio(a) && vacio(b)) return null;
    if (vacio(a)) estado = 'soloB'; else if (vacio(b)) estado = 'soloA'; else if (!mismo(a, b)) estado = 'distinto';
    return { campo, label, donde, a, b, estado, elegido: estado === 'soloB' ? b : estado === 'distinto' ? valorMejor(a, b) : a };
  }).filter(Boolean);
}
