export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLong(iso) {
  if (!iso) return '';
  const s = parseISO(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeDay(iso) {
  const diff = Math.round((parseISO(iso) - parseISO(todayISO())) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff > 1) return `En ${diff} días`;
  return '';
}

export function sortEvents(events, dir = 1) {
  return [...events].sort((a, b) => dir * ((a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))));
}

/** "Hoy", "Ayer", "Mañana" o "dom 22 nov" (para listas de eventos). */
export function fechaCorta(iso) {
  if (!iso) return '';
  const diff = Math.round((parseISO(iso) - parseISO(todayISO())) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === -1) return 'Ayer';
  if (diff === 1) return 'Mañana';
  return parseISO(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', '');
}
