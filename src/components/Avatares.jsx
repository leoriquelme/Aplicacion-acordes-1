import { useStore } from '../lib/store.jsx';
import { colorDe, iniciales } from '../lib/participacion.js';

/** Círculo con la foto de la persona (si subió una) o con sus iniciales. */
export function Avatar({ name, personKey, size = 'md', photo }) {
  const { people = [], me } = useStore() || {};
  const foto = photo ?? (personKey && personKey === me?.key ? me?.photo : people.find((p) => p.key === personKey)?.photo);
  if (foto) {
    return <img className={`avatar avatar-${size} avatar-foto`} src={foto} alt={name} title={name} />;
  }
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
