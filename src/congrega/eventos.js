// Tipos de evento de asistencia: Culto dominical, Día de oración, Jóvenes, etc.
// El tipo se guarda en events/{id}.tipo. Los eventos antiguos (o creados en Adora) no lo tienen:
// se deduce del nombre, así las estadísticas por tipo incluyen todo el historial.
export const TIPOS_EVENTO = [
  { k: 'culto', l: 'Culto dominical', nombre: 'Servicio de Adoración' },
  { k: 'oracion', l: 'Día de oración', nombre: 'Reunión de oración' },
  { k: 'jovenes', l: 'Jóvenes', nombre: 'Actividad de jóvenes' },
  { k: 'escuela', l: 'Escuela dominical', nombre: 'Escuela dominical' },
  { k: 'otro', l: 'Otro', nombre: '' },
];
const POR_CLAVE = new Map(TIPOS_EVENTO.map((t) => [t.k, t]));

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tipo del evento: el guardado o el que se deduce del nombre. */
export function tipoEvento(ev) {
  if (ev?.tipo && POR_CLAVE.has(ev.tipo)) return ev.tipo;
  const n = sinTildes(ev?.name);
  if (/(^|[^a-z])(oracion|ayuno|vigilia)/.test(n)) return 'oracion';
  if (/joven|juvenil|adolescente/.test(n)) return 'jovenes';
  if (/escuela/.test(n)) return 'escuela';
  if (!n || /culto|adoracion|servicio|dominical|reunion general/.test(n)) return 'culto';
  return 'otro';
}

export const etiquetaTipo = (k) => POR_CLAVE.get(k)?.l || 'Otro';
export const nombrePorDefecto = (k) => POR_CLAVE.get(k)?.nombre || '';

/** Tipo sugerido al abrir un evento: domingo → Culto dominical; otro día → Día de oración. */
export function tipoSugerido(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00`);
  return d.getDay() === 0 ? 'culto' : 'oracion';
}

/** Documento del evento nuevo, listo para saveEvent. */
export function eventoNuevo({ tipo, nombre, fecha, hora = '' }) {
  const k = POR_CLAVE.has(tipo) ? tipo : 'otro';
  return { name: (nombre || '').trim() || nombrePorDefecto(k) || 'Evento', tipo: k, date: fecha, time: hora, items: [] };
}

/** Resumen por tipo: cuántos eventos con registro y promedio de asistentes. */
export function resumenPorTipo(events, conteo) {
  const m = new Map();
  events.forEach((e) => {
    const n = conteo.get(e.id);
    if (!n) return;
    const k = tipoEvento(e);
    const r = m.get(k) || { k, label: etiquetaTipo(k), eventos: 0, total: 0, max: 0 };
    r.eventos++; r.total += n; r.max = Math.max(r.max, n);
    m.set(k, r);
  });
  return TIPOS_EVENTO.map((t) => m.get(t.k)).filter(Boolean).map((r) => ({ ...r, promedio: Math.round(r.total / r.eventos) }));
}
