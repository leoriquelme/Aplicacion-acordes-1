import { useStore } from '../lib/store.jsx';
import { formatoCumple, proximosCumples, textoCumple } from '../lib/cumpleanos.js';
import { linkWhatsApp, proximosAniversarios, saludoAniversario, saludoCumple } from '../lib/saludos.js';
import { useDirectorio } from '../lib/directorio.jsx';
import { Avatar } from './Avatares.jsx';

/**
 * En Inicio: cumpleaños (desde 7 días antes y el mismo día) y aniversarios de matrimonio de los hermanos,
 * con un botón para saludar por WhatsApp (directo a su celular si está en el directorio).
 */
export default function Cumpleanos() {
  const { mode, people = [], me, churchId, church } = useStore();
  const dir = useDirectorio(mode === 'cloud' ? churchId : null);
  if (mode !== 'cloud') return null;
  const lista = proximosCumples(people);
  const anivs = proximosAniversarios(people);
  if (lista.length === 0 && anivs.length === 0) return null;
  const cuando = (dias) => (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`);
  return (
    <section className="card bloque-cumples" aria-label="Cumpleaños y aniversarios">
      <h2>🎂 {anivs.length && !lista.length ? 'Aniversarios' : anivs.length ? 'Cumpleaños y aniversarios' : 'Cumpleaños'}</h2>
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
              {!yo && dias <= 1 && (
                <a className="btn small" href={linkWhatsApp(dir.get(persona.key)?.telefono, saludoCumple(persona, church?.name))} target="_blank" rel="noreferrer">Saludar</a>
              )}
            </li>
          );
        })}
        {anivs.map((a) => {
          const p = a.personas[0];
          const mio = me && a.personas.some((x) => x.key === me.key);
          const tel = a.personas.map((x) => dir.get(x.key)?.telefono).find(Boolean);
          return (
            <li key={`aniv-${p.key}`} className={a.dias === 0 ? 'hoy' : ''}>
              <Avatar name={p.name || '?'} personKey={p.key} size="sm" photo={p.photo || ''} />
              <span className="grow">
                <strong>💍 {cuando(a.dias)}: aniversario de {a.nombres}{mio ? ' (ustedes)' : ''}</strong>
                <span className="muted small">{formatoCumple(p.aniversarioMD)}</span>
              </span>
              {!mio && a.dias <= 1 && <a className="btn small" href={linkWhatsApp(tel, saludoAniversario(a.nombres))} target="_blank" rel="noreferrer">Saludar</a>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
