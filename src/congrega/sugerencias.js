// Sugerencias del Inicio: datos que probablemente quedaron mal clasificados.
// Cada una trae el cambio a aplicar en people/{key}. Solo Administrativo de asistencia, Pastor y Administrador.

export const VENTANA_SEMANAS = 3;
export const EDAD_NO_NINO = 15;

/** Edad cumplida a la fecha `hoy` ("AAAA-MM-DD"). */
export function edadEn(nac, hoy) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nac || '');
  if (!m) return null;
  const [y, mo, d] = hoy.split('-').map(Number);
  let a = y - Number(m[1]);
  if (mo < Number(m[2]) || (mo === Number(m[2]) && d < Number(m[3]))) a--;
  return a;
}

/** Rango de edad que corresponde a una edad. */
export function rangoPorEdad(a) {
  if (a < 2) return 'Bebé';
  if (a < 13) return 'Niño';
  if (a < 18) return 'Adolescente';
  if (a < 30) return 'Joven';
  if (a < 65) return 'Adulto';
  return 'Adulto Mayor';
}

const esNinoMarcado = (p) => p.rangoEdad === 'Bebé' || p.rangoEdad === 'Niño' || (!p.rangoEdad && p.esNino === true);
const restar = (iso, dias) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() - dias); return d.toISOString().slice(0, 10); };

/**
 * people: lista; fichas: Map key → ficha; asistencia: Map/iterable de { eventId, personKey };
 * events: lista de eventos; hoy: "AAAA-MM-DD".
 * Devuelve [{ id, key, texto, accion, cambio }].
 */
export function sugerencias({ people, fichas = new Map(), asistencia, events, hoy }) {
  const out = [];
  const desde = restar(hoy, VENTANA_SEMANAS * 7);
  const conRegistro = new Set([...asistencia.values()].map((a) => a.eventId));
  const recientes = new Set(events.filter((e) => e.date && e.date >= desde && e.date <= hoy && conRegistro.has(e.id)).map((e) => e.id));
  const veces = new Map();
  asistencia.forEach((a) => { if (recientes.has(a.eventId)) veces.set(a.personKey, (veces.get(a.personKey) || 0) + 1); });
  for (const p of people) {
    if (p.estado === 'inactivo') continue;
    const n = veces.get(p.key) || 0;
    // Viene seguido pero figura como visita u ocasional.
    if (recientes.size >= 3 && n >= 3 && (p.tipo === 'Visita' || p.tipo === 'Ocasional' || !p.tipo)) {
      out.push({ id: `regular:${p.key}`, key: p.key, texto: `Vino ${n} veces en las últimas ${VENTANA_SEMANAS} semanas y figura como ${p.tipo || 'sin clasificar'}.`, accion: 'Pasar a Regular', cambio: { tipo: 'Regular' } });
    }
    // Figura como regular pero no vino ninguna vez.
    if (recientes.size >= 3 && n === 0 && (p.tipo === 'Regular' || p.tipo === 'Activo')) {
      out.push({ id: `ocasional:${p.key}`, key: p.key, texto: `Figura como ${p.tipo} y no vino en las últimas ${VENTANA_SEMANAS} semanas (${recientes.size} eventos).`, accion: 'Pasar a Ocasional', cambio: { tipo: 'Ocasional' } });
    }
    // Clasificado como niño y ya tiene 15 o más.
    const edad = edadEn(fichas.get(p.key)?.fechaNacimiento, hoy);
    if (edad != null && edad >= EDAD_NO_NINO && esNinoMarcado(p)) {
      const r = rangoPorEdad(edad);
      out.push({ id: `edad:${p.key}:${r}`, key: p.key, texto: `Tiene ${edad} años y está clasificado como ${p.rangoEdad || 'niño'}.`, accion: `Pasar a ${r}`, cambio: { rangoEdad: r, esNino: false } });
    }
  }
  return out;
}
