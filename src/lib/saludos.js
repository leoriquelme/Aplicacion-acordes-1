// Saludar a los hermanos por WhatsApp (cumpleaños, aniversarios, "te extrañamos").
import { diasParaCumple } from './cumpleanos.js';

/** Celular para wa.me: solo números, con código de Chile si viene sin él (9 1234 5678 → 56912345678). */
export function numeroWhatsApp(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('9')) d = `56${d}`;
  if (d.length === 8) d = `569${d}`;
  return d.length >= 10 && d.length <= 15 ? d : '';
}

/** Link de WhatsApp con el mensaje listo. Sin número, WhatsApp pregunta a quién mandarlo. */
export function linkWhatsApp(tel, texto) {
  const n = numeroWhatsApp(tel);
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

const primerNombre = (p) => String(p?.nombre || p?.name || '').trim().split(/\s+/)[0] || '';

export const saludoCumple = (p, iglesia) => `¡Feliz cumpleaños, ${primerNombre(p)}! 🎂 Que el Señor te bendiga en este nuevo año de vida.${iglesia ? ` Con cariño, tus hermanos de ${iglesia}.` : ''}`;
export const saludoAniversario = (nombres) => `¡Feliz aniversario de matrimonio, ${nombres}! 💍 Damos gracias a Dios por su familia.`;
export const saludoExtranamos = (p, iglesia) => `Hola ${primerNombre(p)}, ¿cómo estás? Te hemos echado de menos en ${iglesia || 'la iglesia'}. Estamos orando por ti; si necesitas algo, cuéntanos. 🙏`;

/**
 * Aniversarios de matrimonio (people.aniversarioMD "MM-DD") desde hoy hasta `dias` días.
 * La pareja (misma familia y misma fecha) sale junta: [{ personas, nombres, dias }].
 */
export function proximosAniversarios(people = [], hoy = new Date(), dias = 7) {
  const grupos = new Map();
  for (const p of people) {
    if (p.estado === 'inactivo') continue;
    const n = diasParaCumple(p.aniversarioMD, hoy);
    if (n == null || n > dias) continue;
    const k = `${p.familiaId || p.key}|${p.aniversarioMD}`;
    if (!grupos.has(k)) grupos.set(k, { personas: [], dias: n });
    grupos.get(k).personas.push(p);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, nombres: g.personas.map(primerNombre).filter(Boolean).join(' y ') }))
    .sort((a, b) => a.dias - b.dias || a.nombres.localeCompare(b.nombres));
}
