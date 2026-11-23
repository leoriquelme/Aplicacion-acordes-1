// Cumpleaños de los hermanos: se guarda solo el día y el mes ("MM-DD"), sin el año.
// En Inicio se avisa desde 7 días antes y el mismo día.

export const DIAS_ANTES = 7;

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const pad = (n) => String(n).padStart(2, '0');
const diasDelMes = (mes) => [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];

/** ¿Es un cumpleaños válido ("MM-DD")? */
export function cumpleValido(texto) {
  if (typeof texto !== 'string' || !/^\d{2}-\d{2}$/.test(texto)) return false;
  const [m, d] = texto.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= diasDelMes(m);
}

/** Armar "MM-DD" a partir de día y mes (números). Devuelve '' si no es válido. */
export function armarCumple(dia, mes) {
  const t = `${pad(Number(mes))}-${pad(Number(dia))}`;
  return cumpleValido(t) ? t : '';
}

/** "14 de marzo" */
export function formatoCumple(texto) {
  if (!cumpleValido(texto)) return '';
  const [m, d] = texto.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

const esBisiesto = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Fecha del cumpleaños en un año dado (el 29 de febrero se celebra el 28 en años no bisiestos). */
function fechaEn(texto, year) {
  const [m, d] = texto.split('-').map(Number);
  if (m === 2 && d === 29 && !esBisiesto(year)) return new Date(year, 1, 28);
  return new Date(year, m - 1, d);
}

/** Días que faltan para el próximo cumpleaños (0 = hoy). */
export function diasParaCumple(texto, hoy = new Date()) {
  if (!cumpleValido(texto)) return null;
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let f = fechaEn(texto, base.getFullYear());
  if (f < base) f = fechaEn(texto, base.getFullYear() + 1);
  return Math.round((f - base) / 86400000);
}

/**
 * Personas con cumpleaños hoy o en los próximos 7 días, de la más cercana a la más lejana.
 * Devuelve [{ persona, dias }].
 */
export function proximosCumples(people = [], hoy = new Date(), diasAntes = DIAS_ANTES) {
  return people
    .map((persona) => ({ persona, dias: diasParaCumple(persona.birthday, hoy) }))
    .filter(({ dias }) => dias != null && dias <= diasAntes)
    .sort((a, b) => a.dias - b.dias || (a.persona.name || '').localeCompare(b.persona.name || ''));
}

/** "¡Hoy está de cumpleaños Ana!" / "Mañana está de cumpleaños Ana" / "Cumpleaños de Ana en 5 días" */
export function textoCumple(nombre, dias) {
  if (dias === 0) return `¡Hoy está de cumpleaños ${nombre}!`;
  if (dias === 1) return `Mañana está de cumpleaños ${nombre}`;
  return `Cumpleaños de ${nombre} en ${dias} días`;
}

/** ¿Es una fecha de nacimiento válida ("AAAA-MM-DD", no en el futuro)? */
export function nacimientoValido(iso, hoy = new Date()) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const y = Number(iso.slice(0, 4));
  if (y < 1900 || y > hoy.getFullYear()) return false;
  const md = iso.slice(5);
  if (!cumpleValido(md) || (md === '02-29' && !esBisiesto(y))) return false;
  const [m, d] = md.split('-').map(Number);
  return new Date(y, m - 1, d) <= hoy;
}

/** De la fecha de nacimiento sale el cumpleaños ("MM-DD"), que es lo único que ven los demás. */
export function cumpleDeNacimiento(iso) {
  return nacimientoValido(iso) ? iso.slice(5) : '';
}

/** "14 de marzo de 1990" */
export function formatoNacimiento(iso) {
  if (!nacimientoValido(iso)) return '';
  return `${formatoCumple(iso.slice(5))} de ${iso.slice(0, 4)}`;
}
