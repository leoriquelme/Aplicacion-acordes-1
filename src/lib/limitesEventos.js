// Límites de eventos por iglesia (pedido de Leonardo, 19-nov-2026).
import { parseISO, todayISO } from './dates.js';

export const MAX_FUTUROS = 10;      // eventos próximos como máximo
export const MESES_PASADOS = 3;     // los pasados se ven hasta 3 meses atrás
export const HORAS_EDITAR = 72;     // un evento pasado se edita hasta 3 días después

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const esFuturo = (e, hoy = todayISO()) => Boolean(e.date) && e.date >= hoy;

/** Fecha límite (ISO) para mostrar eventos pasados: hoy menos 3 meses. */
export function limitePasados(ahora = new Date()) {
  return iso(new Date(ahora.getFullYear(), ahora.getMonth() - MESES_PASADOS, ahora.getDate()));
}

/** Eventos pasados que todavía se muestran (últimos 3 meses). */
export const pasadosVisibles = (events, ahora = new Date()) => {
  const hoy = iso(ahora), desde = limitePasados(ahora);
  return events.filter((e) => e.date < hoy && e.date >= desde);
};

/** ¿Se puede editar? Los próximos sí; los pasados solo hasta 72 h después de su fecha y hora. */
export function sePuedeEditar(e, ahora = new Date()) {
  if (!e?.date) return true;
  if (esFuturo(e, iso(ahora))) return true;
  const [h, m] = (e.time || '23:59').split(':').map(Number);
  const inicio = parseISO(e.date);
  inicio.setHours(h || 0, m || 0);
  return ahora - inicio < HORAS_EDITAR * 3600000;
}

/** ¿Se puede agregar otro evento próximo? (excluye el que se está editando) */
export const cabeOtroFuturo = (events, exceptId, hoy = todayISO()) =>
  events.filter((e) => e.id !== exceptId && esFuturo(e, hoy)).length < MAX_FUTUROS;
