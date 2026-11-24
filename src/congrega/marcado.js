// Lógica compartida para marcar asistencia (pantalla Asistencia y Estación).
import { activo, nombreDe, norm } from './datos.jsx';
import { tipoPorDefecto } from './unir.js';

/**
 * Todo lo necesario para marcar en un evento.
 * `ctx` es el valor de useCongrega(); `ev` el evento elegido; `onError(msg)` avisa fallas.
 */
export function marcadoDe(ctx, ev, onError = () => {}) {
  const { people, asistencia, participations = [], marcar } = ctx;
  const presentes = new Map();
  if (ev) asistencia.forEach((a) => { if (a.eventId === ev.id) presentes.set(a.personKey, a); });
  const persona = (k) => people.find((p) => p.key === k);

  // Tipo por defecto: colaborador si sirve en este evento; visita sus 3 primeras veces; después, regular.
  const tipoDe = (p) => {
    const a = presentes.get(p.key);
    if (a?.tipo) return a.tipo;
    const sirve = participations.some((x) => x.eventId === ev?.id && x.personKey === p.key && !x.estado);
    let anteriores = 0; asistencia.forEach((x) => { if (x.personKey === p.key && x.date && x.date < (ev?.date || '')) anteriores++; });
    return tipoPorDefecto(p, { sirve, anteriores });
  };
  const falla = () => onError('No se pudo guardar. Revisa la conexión.');
  const toggle = (p) => marcar(ev, p.key, !presentes.has(p.key), tipoDe(p)).catch(falla);
  const cambiarTipo = (p, tipo) => marcar(ev, p.key, true, tipo, presentes.get(p.key)?.at).catch(falla);
  const marcarVarios = async (keys) => {
    for (const k of keys) { const p = persona(k); if (p && !presentes.has(k)) await marcar(ev, k, true, tipoDe(p)).catch(falla); }
  };
  /** Familiares activos (sin la persona misma). Los inactivos no aparecen. */
  const familiaDe = (p) => (p.familiaId ? people.filter((m) => m.familiaId === p.familiaId && m.key !== p.key && activo(m)) : []);
  const cuenta = { regular: 0, visita: 0, colaborador: 0 };
  presentes.forEach((a, k) => { const p = persona(k); if (p) cuenta[tipoDe(p)]++; });
  return { presentes, persona, tipoDe, toggle, cambiarTipo, marcarVarios, familiaDe, cuenta };
}

/** Busca por nombre, apodo o familia. */
export const coincide = (p, q, familias) => !q || norm(`${nombreDe(p)} ${p.apodo || ''} ${(p.familiaId && familias.get(p.familiaId)?.name) || ''}`).includes(q);

/**
 * Resumen de la última jornada con asistencia (todos los eventos de ese día):
 * { fecha, eventos: [{ ev, n }], personas, regular, visita, colaborador, primeraVez }
 */
export function resumenJornada(events, asistencia, people, hasta) {
  const porFecha = new Map();
  asistencia.forEach((a) => { if (a.date && a.date <= hasta) porFecha.set(a.date, true); });
  const fecha = [...porFecha.keys()].sort().pop();
  if (!fecha) return null;
  const evs = new Map(); const quienes = new Map(); const primera = new Map();
  asistencia.forEach((a) => {
    if (!a.date) return;
    if (!primera.has(a.personKey) || a.date < primera.get(a.personKey)) primera.set(a.personKey, a.date);
    if (a.date !== fecha) return;
    evs.set(a.eventId, (evs.get(a.eventId) || 0) + 1);
    // Si vino a dos eventos ese día, cuenta una vez con el tipo "más fuerte" (colaborador > visita > regular).
    const peso = { colaborador: 3, visita: 2, regular: 1 };
    const t = a.tipo || 'regular';
    if (!quienes.has(a.personKey) || peso[t] > peso[quienes.get(a.personKey)]) quienes.set(a.personKey, t);
  });
  const r = { fecha, eventos: [], personas: quienes.size, regular: 0, visita: 0, colaborador: 0, primeraVez: 0 };
  quienes.forEach((t, k) => { r[t]++; if (primera.get(k) === fecha && people.some((p) => p.key === k)) r.primeraVez++; });
  r.eventos = [...evs].map(([id, n]) => ({ ev: events.find((e) => e.id === id) || { id, name: 'Evento' }, n })).sort((a, b) => b.n - a.n);
  return r;
}
