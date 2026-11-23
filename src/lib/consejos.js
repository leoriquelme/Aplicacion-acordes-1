// Consejos de uso que se muestran en Inicio, debajo del versículo.
// Se muestra uno a la vez; se esconden los que ya hiciste o los que no te sirven.
// Las novedades (src/data/novedades.js) salen primero mientras son recientes.

import { NOVEDADES } from '../data/novedades.js';

export const DIAS_NOVEDAD = 14;

export const OCULTOS_KEY = 'cancionero-consejos-ocultos';

/**
 * Cada consejo: id, icono, título, texto, a dónde lleva (to) y el texto del botón.
 * mostrar(ctx) decide si te sirve: si ya lo hiciste o no tienes permiso, no sale.
 * ctx = { mode, can, birthDate, photo, tema, instalada, eventosProximos }
 */
export const CONSEJOS = [
  {
    id: 'cumple', icono: 'user', to: '/ajustes/perfil', boton: 'Completar perfil',
    titulo: 'Completa tu perfil',
    texto: 'Agrega tu fecha de nacimiento para que la iglesia sepa cuándo estás de cumpleaños.',
    mostrar: (c) => c.mode === 'cloud' && !c.birthDate,
  },
  {
    id: 'biblioteca', icono: 'globe', to: '/canciones/biblioteca', boton: 'Ver la biblioteca',
    titulo: '¿Sabías que…?',
    texto: 'Alguien de la comunidad puede haber escrito ya la canción que buscas, con letra y acordes. Búscala en la biblioteca compartida.',
    mostrar: (c) => c.mode !== 'local',
  },
  {
    id: 'foto', icono: 'camera', to: '/ajustes/perfil', boton: 'Poner foto',
    titulo: 'Pon tu foto',
    texto: 'Así los hermanos te reconocen en los eventos y en la lista de miembros.',
    mostrar: (c) => c.mode === 'cloud' && !c.photo,
  },
  {
    id: 'invitar', icono: 'users', to: '/mi-iglesia', boton: 'Invitar',
    titulo: 'Invita a los hermanos',
    texto: 'Envía el link de invitación por WhatsApp y entran directo a tu iglesia.',
    mostrar: (c) => c.mode === 'cloud' && c.can?.users,
  },
  {
    id: 'servir', icono: 'hand', to: '/eventos', boton: 'Ver eventos',
    titulo: 'Anótate para servir',
    texto: 'Abre un evento y toca Participar para decir en qué vas a servir.',
    mostrar: (c) => c.mode === 'cloud' && !c.can?.events && c.eventosProximos > 0,
  },
  {
    id: 'proponer', icono: 'hand', to: '/eventos', boton: 'Ver eventos',
    titulo: 'Propón quién sirve',
    texto: 'En cada evento puedes proponerle a un hermano que sirva. Le llega a su Inicio para que acepte.',
    mostrar: (c) => c.mode === 'cloud' && c.can?.events,
  },
  {
    id: 'buscar-letra', icono: 'music', to: '/canciones', boton: 'Buscar canción',
    titulo: 'Busca por la letra',
    texto: '¿No te acuerdas del título? Escribe una frase de la letra en el buscador de Canciones.',
    mostrar: () => true,
  },
  {
    id: 'presentar', icono: 'expand', to: '/canciones', boton: 'Ir a Canciones',
    titulo: 'Presenta en pantalla completa',
    texto: 'Abre una canción y toca Presentar. Puedes pasar las secciones con una pedalera Bluetooth.',
    mostrar: () => true,
  },
  {
    id: 'multimedia', icono: 'play', to: '/canciones', boton: 'Ir a Canciones',
    titulo: 'Spotify y YouTube',
    texto: 'Al editar una canción puedes agregar su link de Spotify o YouTube, para ensayar escuchándola.',
    mostrar: (c) => c.can?.edit,
  },
  {
    id: 'instalar', icono: 'phone', to: '/ajustes', boton: 'Ver cómo',
    titulo: 'Instala la app',
    texto: 'Queda como un ícono en tu teléfono y abre más rápido. Está en Ajustes → Instalar la app.',
    mostrar: (c) => !c.instalada,
  },
  {
    id: 'oscuro', icono: 'moon', to: '/ajustes', boton: 'Ir a Ajustes',
    titulo: 'Modo oscuro',
    texto: 'Para leer con poca luz en el servicio, activa el modo oscuro en Ajustes.',
    mostrar: (c) => c.tema !== 'oscuro',
  },
];

/** Los consejos que te sirven ahora y que no escondiste. */
export function consejosPara(ctx, ocultos = []) {
  return CONSEJOS.filter((c) => !ocultos.includes(c.id) && c.mostrar(ctx));
}

/** Novedades recientes (de los últimos DIAS_NOVEDAD días) que no escondiste, la más nueva primero. */
export function novedadesPara(hoy, ocultos = [], lista = NOVEDADES) {
  const dia = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
  return lista
    .filter((n) => !ocultos.includes(n.id))
    .filter((n) => { const d = dia(hoy) - dia(n.fecha); return d >= 0 && d < DIAS_NOVEDAD; })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((n) => ({ ...n, novedad: true }));
}

/** Número del día (cambia cada día), para que el consejo vaya rotando solo. */
export function numeroDelDia(fecha = new Date()) {
  return Math.floor(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 86400000);
}

export function leerOcultos() {
  try {
    const v = JSON.parse(localStorage.getItem(OCULTOS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function guardarOcultos(lista) {
  try { localStorage.setItem(OCULTOS_KEY, JSON.stringify(lista)); } catch { /* nada */ }
}
