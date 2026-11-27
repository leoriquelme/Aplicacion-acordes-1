// Agenda de la iglesia y "Agregar a mi calendario" con Google Calendar.
// (El archivo .ics para iPhone y otros está en recordatorio.js.) La hora es la local (la de la iglesia).

export const DURACION_MIN = 120;

const pad = (n) => String(n).padStart(2, '0');
const compacta = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const soloFecha = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** Inicio y fin del evento (sin hora: todo el día). */
export function tramo(ev, minutos = DURACION_MIN) {
  const [y, m, d] = ev.date.split('-').map(Number);
  if (!ev.time) return { todoElDia: true, inicio: new Date(y, m - 1, d), fin: new Date(y, m - 1, d + 1) };
  const [h, mi] = ev.time.split(':').map(Number);
  const inicio = new Date(y, m - 1, d, h, mi || 0);
  return { todoElDia: false, inicio, fin: new Date(inicio.getTime() + minutos * 60000) };
}

/** Link para agregar el evento en Google Calendar. */
export function linkGoogle(ev, { iglesia = '' } = {}) {
  const t = tramo(ev);
  const dates = t.todoElDia ? `${soloFecha(t.inicio)}/${soloFecha(t.fin)}` : `${compacta(t.inicio)}/${compacta(t.fin)}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `${ev.name || 'Evento'}${iglesia ? ` · ${iglesia}` : ''}`, dates });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Eventos de hoy en adelante, agrupados por mes: [{ mes: 'diciembre de 2026', eventos }]. */
export function agendaPorMes(events, hoy, dias = 90) {
  const [y, m, d] = hoy.split('-').map(Number);
  const limite = new Date(y, m - 1, d + dias);
  const fin = `${limite.getFullYear()}-${pad(limite.getMonth() + 1)}-${pad(limite.getDate())}`;
  const lista = events.filter((e) => e.date && e.date >= hoy && e.date <= fin)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const grupos = [];
  for (const e of lista) {
    const k = e.date.slice(0, 7);
    if (!grupos.length || grupos[grupos.length - 1].k !== k) {
      const [yy, mm] = k.split('-').map(Number);
      grupos.push({ k, mes: new Date(yy, mm - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' }), eventos: [] });
    }
    grupos[grupos.length - 1].eventos.push(e);
  }
  return grupos;
}
