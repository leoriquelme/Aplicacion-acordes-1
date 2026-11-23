// Novedades de la app: salen primero en el cuadro de Inicio, durante DIAS_NOVEDAD días desde su fecha.
// Para anunciar un cambio nuevo, agrega una entrada ARRIBA (la más nueva primero) con un id que no se repita.
// fecha = 'AAAA-MM-DD'. to y boton son opcionales (a dónde lleva el botón).

export const NOVEDADES = [
  {
    id: 'n-2026-11-23-inicio', fecha: '2026-11-23', icono: 'home',
    titulo: 'Inicio ordenado',
    texto: 'Ahora en Inicio ves primero los próximos eventos. Más abajo están los cumpleaños, los consejos y el versículo del día.',
  },
  {
    id: 'n-2026-11-23-cumple', fecha: '2026-11-23', icono: 'user', to: '/ajustes/perfil', boton: 'Poner mi fecha',
    titulo: 'Cumpleaños de los hermanos',
    texto: 'Ahora puedes poner tu fecha de nacimiento en tu perfil, y en Inicio aparece quién está de cumpleaños esta semana.',
  },
  {
    id: 'n-2026-11-23-proponer', fecha: '2026-11-23', icono: 'hand', to: '/eventos', boton: 'Ver eventos',
    titulo: 'Te pueden proponer servir',
    texto: 'Los líderes pueden proponerte servir en un evento. Te llega aquí en Inicio y tú aceptas o dices que no puedes.',
  },
  {
    id: 'n-2026-11-23-buscar', fecha: '2026-11-23', icono: 'music', to: '/canciones', boton: 'Probar',
    titulo: 'Buscar por la letra',
    texto: 'El buscador de Canciones ahora también encuentra canciones por una frase de la letra.',
  },
  {
    id: 'n-2026-11-23-oscuro', fecha: '2026-11-23', icono: 'moon', to: '/ajustes', boton: 'Ir a Ajustes',
    titulo: 'Modo oscuro automático',
    texto: 'La app se pone oscura sola cuando tu teléfono está en modo oscuro. En Ajustes puedes elegir Siempre o Nunca.',
  },
  {
    id: 'n-2026-11-23-miembros', fecha: '2026-11-23', icono: 'users', to: '/mi-iglesia/miembros', boton: 'Ver miembros',
    titulo: 'Miembros más fáciles de ver',
    texto: 'La lista de miembros, la participación y el Top repertorio ahora se ven como tarjetas, más cómodas en el celular.',
  },
  {
    id: 'n-2026-11-23-rapida', fecha: '2026-11-23', icono: 'fast',
    titulo: 'La app abre más rápido',
    texto: 'Ahora carga más rápido y, si hay poca señal, muestra la última copia guardada de las canciones.',
  },
  {
    id: 'n-2026-11-23-nombre', fecha: '2026-11-23', icono: 'sparkle',
    titulo: 'Nuevo nombre: Adora',
    texto: 'La app ahora se llama Adora (Beta), con su logo nuevo en la entrada y en el ícono del teléfono.',
  },
];
