// Peticiones de oración: un hermano escribe por qué quiere que oren y elige quién la ve:
// solo los pastores (por defecto, porque es un dato sensible según la Ley 21.719) o toda la iglesia.
// Los demás tocan "Estoy orando" (orando: { uid: true }).

export const MAX_PETICION = 600;
export const DIAS_ACTIVA = 30;
export const DIAS_RESPONDIDA = 14;
const DIA = 86400000;

/** ¿Se sigue mostrando? Activas: 30 días; respondidas: 14 días más. */
export function vigente(p, ahora = Date.now()) {
  const edad = ahora - (p.at || 0);
  return p.estado === 'respondida' ? edad <= (DIAS_ACTIVA + DIAS_RESPONDIDA) * DIA : edad <= DIAS_ACTIVA * DIA;
}

export const cuantosOran = (p) => Object.values(p.orando || {}).filter((v) => v === true).length;
export const estoyOrando = (p, uid) => p.orando?.[uid] === true;

/** Junta las peticiones (pueden venir repetidas de dos consultas) y las ordena: activas primero, más nuevas arriba. */
export function ordenarPeticiones(listas, ahora = Date.now()) {
  const porId = new Map();
  listas.flat().forEach((p) => porId.set(p.id, p));
  return [...porId.values()].filter((p) => vigente(p, ahora))
    .sort((a, b) => (a.estado === 'respondida') - (b.estado === 'respondida') || (b.at || 0) - (a.at || 0));
}

/** Petición nueva (lo mismo que piden las reglas). */
export function peticionNueva({ texto, para }, { uid, nombre }, ahora = Date.now()) {
  const t = String(texto || '').trim().slice(0, MAX_PETICION);
  if (!t) throw new Error('Escribe tu petición.');
  return { texto: t, para: para === 'iglesia' ? 'iglesia' : 'pastores', estado: 'activa', autorUid: uid, autor: String(nombre || '').slice(0, 60), at: ahora, orando: {} };
}
