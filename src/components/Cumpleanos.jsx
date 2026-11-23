import { useStore } from '../lib/store.jsx';
import { formatoCumple, proximosCumples, textoCumple } from '../lib/cumpleanos.js';
import { Avatar } from './Avatares.jsx';

/** En Inicio: cumpleaños de los hermanos de la iglesia, desde 7 días antes y el mismo día. */
export default function Cumpleanos() {
  const { mode, people = [], me } = useStore();
  if (mode !== 'cloud') return null;
  const lista = proximosCumples(people);
  if (lista.length === 0) return null;
  return (
    <section className="card bloque-cumples" aria-label="Cumpleaños">
      <h2>🎂 Cumpleaños</h2>
      <ul>
        {lista.map(({ persona, dias }) => {
          const yo = me && persona.key === me.key;
          return (
            <li key={persona.key} className={dias === 0 ? 'hoy' : ''}>
              <Avatar name={persona.name || '?'} personKey={persona.key} size="sm" photo={persona.photo || ''} />
              <span className="grow">
                <strong>{yo && dias === 0 ? `¡Feliz cumpleaños, ${persona.name}! 🎉` : textoCumple(yo ? `${persona.name} (tú)` : persona.name, dias)}</strong>
                <span className="muted small">{dias === 0 ? (yo ? 'Que el Señor te bendiga en este nuevo año de vida' : 'Escríbele un saludo') : formatoCumple(persona.birthday)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
