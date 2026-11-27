// Avisos de la iglesia: el Pastor o el Administrador publica un aviso con fecha de término
// y aparece arriba en Inicio para todos los hermanos.

export const MAX_TITULO = 80;
export const MAX_TEXTO = 1000;
export const DIAS_POR_DEFECTO = 7;

/** Avisos que siguen vigentes hoy: primero los fijados, después los más nuevos. */
export function avisosVigentes(lista, hoy) {
  return lista
    .filter((a) => a.titulo && (!a.hasta || a.hasta >= hoy))
    .sort((a, b) => (b.fijado === true) - (a.fijado === true) || (b.at || 0) - (a.at || 0));
}

/** "AAAA-MM-DD" n días después de `hoy` ("AAAA-MM-DD"). */
export function masDias(hoy, n) {
  const [y, m, d] = hoy.split('-').map(Number);
  const f = new Date(y, m - 1, d + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
}

/** Aviso limpio para guardar (lo mismo que piden las reglas). */
export function avisoParaGuardar({ titulo, texto, hasta, fijado }, por, ahora = Date.now()) {
  const t = String(titulo || '').trim().replace(/\s+/g, ' ').slice(0, MAX_TITULO);
  if (!t) throw new Error('Escribe un título para el aviso.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta || '')) throw new Error('Elige hasta qué día se muestra.');
  return { titulo: t, texto: String(texto || '').trim().slice(0, MAX_TEXTO), hasta, fijado: fijado === true, por: String(por || '').slice(0, 60), at: ahora };
}

/** Texto para mandar por WhatsApp. */
export const textoAviso = (a, iglesia) => `📢 ${iglesia ? `${iglesia}: ` : ''}${a.titulo}${a.texto ? `\n\n${a.texto}` : ''}`;
