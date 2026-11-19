// Recordatorios gratis: un archivo de calendario (.ics) que el celular agrega a su calendario
// con avisos antes del culto. Funciona en iPhone y Android sin servidor.

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (t = '') => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

function descargar(nombre, texto) {
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Texto .ics de un evento con avisos 1 día y 1 hora antes. */
export function eventoICS(event, now = new Date()) {
  const [y, m, d] = event.date.split('-').map(Number);
  const [h, min] = (event.time || '10:00').split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min || 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cancionero//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id || 'evento'}@cancionero`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(event.name)}`,
    event.notes ? `DESCRIPTION:${esc(event.notes)}` : null,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(event.name)} mañana`, 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(event.name)} en 1 hora`, 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

/** Recordatorio diario para orar a una hora (ej. "07:00"). */
export function oracionICS(hora, now = new Date()) {
  const [h, min] = hora.split(':').map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min || 0);
  if (start < now) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cancionero//ES',
    'BEGIN:VEVENT',
    `UID:oracion-${hora.replace(':', '')}@cancionero`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Tiempo de oración 🙏',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Tiempo de oración', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function descargarRecordatorio(event) {
  descargar(`${event.name.replace(/[^\wáéíóúñ -]/gi, '').trim() || 'evento'}.ics`, eventoICS(event));
}

export function descargarOracion(hora) {
  descargar('oracion-diaria.ics', oracionICS(hora));
}
