import { colorDe, iniciales } from '../lib/participacion.js';

/** Círculo con las iniciales de una persona. */
export function Avatar({ name, personKey, size = 'md' }) {
  return (
    <span className={`avatar avatar-${size}`} style={{ background: colorDe(personKey || name) }} title={name} aria-label={name}>
      {iniciales(name)}
    </span>
  );
}

/** Fila de círculos superpuestos hacia el lado. Muestra hasta `max` y luego "+N". */
export default function Avatares({ people, max = 6, size = 'md' }) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={`avatares avatares-${size}`}>
      {shown.map((p) => <Avatar key={p.personKey || p.key || p.name} name={p.name} personKey={p.personKey || p.key} size={size} />)}
      {rest > 0 && <span className={`avatar avatar-${size} avatar-more`}>+{rest}</span>}
    </span>
  );
}
