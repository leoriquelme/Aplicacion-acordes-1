// Datos inventados para la iglesia de prueba (para ver cómo se comporta la app con mucha gente).
import { GRUPOS, grupoDe, participationId } from '../lib/participacion.js';
import { cancionesEjemplo } from './ejemplos.js';

export const PRUEBA_ID = 'prueba';

const NOMBRES = [
  'Ana Torres', 'Benjamín Rojas', 'Carla Muñoz', 'Daniel Soto', 'Elena Vargas', 'Felipe Castro', 'Gabriela Núñez',
  'Héctor Pizarro', 'Isabel Fuentes', 'Joaquín Reyes', 'Karen Morales', 'Luis Herrera', 'María Contreras', 'Nicolás Silva', 'Olga Espinoza',
];
const PROG = [['C', 'G', 'Am', 'F'], ['D', 'A', 'Bm', 'G'], ['G', 'D', 'Em', 'C'], ['A', 'E', 'F#m', 'D'], ['E', 'B', 'C#m', 'A']];
const FRASES = [
  'Tu fidelidad es grande', 'en la mañana te alabaré', 'Señor, tu nombre es santo', 'cantaré de tu amor',
  'por siempre te seguiré', 'mi refugio eres tú', 'tu gracia me sostiene', 'en tu presencia hay paz',
];

const rnd = (seed) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const keyOf = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function cancion(i, r) {
  const p = PROG[i % PROG.length];
  const linea = (k) => `[${p[k % 4]}]${FRASES[(i + k) % FRASES.length]}, [${p[(k + 1) % 4]}]oh Señor`;
  return {
    id: `prueba-cancion-${i + 1}`,
    title: `Canción de prueba ${i + 1}`,
    author: i % 3 ? 'Autor de prueba' : '',
    key: p[0],
    bpm: 60 + Math.round(r() * 70),
    compas: ['4/4', '3/4', '6/8'][i % 3],
    content: `[VERSO 1]\n${linea(0)}\n${linea(1)}\n\n[CORO 1]\n${linea(2)}\n${linea(3)}\n\n[VERSO 2]\n${linea(1)}\n${linea(2)}`,
  };
}

/** Arma todo: personas, canciones, eventos y participaciones. */
export function datosPrueba(now = new Date()) {
  const r = rnd(7);
  const todos = GRUPOS.flatMap((g) => g.roles);
  const people = NOMBRES.map((name, i) => ({
    key: keyOf(name), name, role: i < 2 ? 'director' : 'colaborador', firstSeen: now.getTime(), lastSeen: now.getTime() - i * 86400000,
    teams: [todos[Math.floor(r() * todos.length)], todos[Math.floor(r() * todos.length)]].filter((t, k, a) => a.indexOf(t) === k),
    prueba: true,
  }));
  const songs = [...cancionesEjemplo, ...Array.from({ length: 13 }, (_, i) => cancion(i, r))].map((s) => ({ ...s, prueba: true }));
  const events = [];
  const participations = [];
  for (let w = -8; w <= 4; w++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + w * 7 - now.getDay()); // domingos
    const id = `prueba-culto-${w + 9}`;
    const pick = [0, 1, 2, 3].map((k) => songs[(Math.abs(w) * 3 + k * 5) % songs.length]);
    events.push({
      id, name: 'Servicio de Adoración', date: iso(d), time: '11:00', notes: w === 0 ? 'Cena del Señor' : '', prueba: true,
      items: [
        { type: 'text', label: 'Bienvenida', detail: '' },
        { songId: pick[0].id, transpose: 0 }, { songId: pick[1].id, transpose: w % 2 },
        { type: 'text', label: 'Lectura bíblica', detail: 'Salmo 23' },
        { songId: pick[2].id, transpose: 0 },
        { type: 'text', label: 'Predicación', detail: people[w & 1].name },
        { songId: pick[3].id, transpose: 0 },
        { type: 'text', label: 'Bendición', detail: '' },
      ],
    });
    // Voluntarios: 3 a 8 por culto, más en los pasados.
    const n = 3 + Math.floor(r() * (w < 0 ? 6 : 4));
    const ya = new Set();
    for (let k = 0; k < n; k++) {
      const p = people[Math.floor(r() * people.length)];
      if (ya.has(p.key)) continue;
      ya.add(p.key);
      const role = p.teams[0] || 'Coro';
      participations.push({ id: participationId(id, p.key), eventId: id, personKey: p.key, name: p.name, role, group: grupoDe(role), date: iso(d), at: now.getTime(), prueba: true });
    }
  }
  return { people, songs, events, participations };
}
