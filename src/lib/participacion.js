// Inscripción de los hermanos para servir en un evento y el historial de participación.
import { eventDateTime } from './stats.js';

/** Grupos y roles que se pueden elegir. Cada persona elige uno solo por evento. */
export const GRUPOS = [
  {
    id: 'instrumentos',
    nombre: 'Instrumentos',
    roles: ['Guitarra acústica', 'Guitarra eléctrica', 'Bajo', 'Batería', 'Teclado', 'Piano', 'Percusión', 'Violín'],
  },
  {
    id: 'voces',
    nombre: 'Voces y coros',
    roles: ['Voz principal', 'Segunda voz', 'Coro'],
  },
  {
    id: 'multimedia',
    nombre: 'Multimedia y audio',
    roles: ['Sonido', 'Proyección', 'Transmisión', 'Fotografía y video', 'Luces'],
  },
];

export const HISTORIAL_MESES = 3;

export function grupoDe(role) {
  return GRUPOS.find((g) => g.roles.includes(role))?.id || 'instrumentos';
}

/** Id del registro: uno por persona y evento, así nadie queda con dos roles en el mismo servicio. */
export const participationId = (eventId, personKey) => `${eventId}__${personKey}`;

/** Inscritos de un evento, agrupados como GRUPOS. */
export function inscritosPorGrupo(participations, eventId) {
  const mine = participations.filter((p) => p.eventId === eventId);
  return GRUPOS.map((g) => ({
    ...g,
    personas: mine
      .filter((p) => p.group === g.id)
      .sort((a, b) => g.roles.indexOf(a.role) - g.roles.indexOf(b.role) || a.name.localeCompare(b.name, 'es')),
  }));
}

/**
 * Historial: cuántas veces sirvió cada persona en los últimos 3 meses.
 * Solo cuentan eventos que todavía existen y cuya fecha y hora ya pasaron.
 * Devuelve [{ key, name, count, roles: { rol: veces }, lastDate, items: [{ date, eventName, role }] }].
 */
export function historial(participations, events, now = new Date()) {
  const desde = new Date(now);
  desde.setMonth(desde.getMonth() - HISTORIAL_MESES);
  const byId = new Map(events.map((e) => [e.id, e]));
  const people = new Map();
  for (const p of participations) {
    const ev = byId.get(p.eventId);
    if (!ev) continue;
    const when = eventDateTime(ev);
    if (when > now || when < desde) continue;
    const st = people.get(p.personKey) || { key: p.personKey, name: p.name, count: 0, roles: {}, lastDate: null, items: [] };
    st.count += 1;
    st.roles[p.role] = (st.roles[p.role] || 0) + 1;
    if (!st.lastDate || ev.date > st.lastDate) st.lastDate = ev.date;
    st.items.push({ date: ev.date, eventName: ev.name, role: p.role });
    people.set(p.personKey, st);
  }
  return [...people.values()]
    .map((st) => ({ ...st, items: st.items.sort((a, b) => b.date.localeCompare(a.date)) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}
