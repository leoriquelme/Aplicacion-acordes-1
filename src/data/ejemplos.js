// Canciones de ejemplo: himnos clásicos de dominio público.

export const cancionesEjemplo = [
  {
    id: 'ejemplo-santo',
    title: '¡Santo! ¡Santo! ¡Santo!',
    author: 'Reginald Heber (trad. Juan B. Cabrera)',
    key: 'D',
    content: `[VERSO]
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]Señor omni[D]potente,
[A]siempre el labio [D]mío lo[E]ores te da[A]rá;
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]te adoro re[D]verente,
[G]Dios en tres per[D]sonas, [A]bendita Trini[D]dad.

[VERSO 2]
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]en numeroso [D]coro,
[A]santos escogi[D]dos te a[E]doran sin ce[A]sar,
[D]de alegría [Bm]llenos, y [G]sus coronas de [D]oro
[G]rinden ante el [D]trono y el [A]cristalino [D]mar.`,
  },
  {
    id: 'ejemplo-castillo',
    title: 'Castillo fuerte es nuestro Dios',
    author: 'Martín Lutero (trad. Juan B. Cabrera)',
    key: 'C',
    content: `[VERSO]
[C]Castillo fuerte es [G]nuestro [C]Dios,
[F]defensa y [C]buen es[G]cudo;
[C]con su poder nos [G]libra[C]rá
[F]en este [C]trance a[G]gudo.
[C]Con furia y con a[G]fán
[Am]acósanos Sa[E]tán;
[F]por armas deja [C]ver
[Dm]astucia y gran po[G]der;
[C]cual él no [F]hay en la [G]tie[C]rra.`,
  },
  {
    id: 'ejemplo-amigo',
    title: '¡Oh, qué amigo nos es Cristo!',
    author: 'Joseph M. Scriven (trad. Leandro Garza Mora)',
    key: 'F',
    content: `[VERSO]
[F]¡Oh, qué amigo nos es [Bb]Cristo!
[F]Él llevó nuestro do[C]lor,
[F]y nos manda que lle[Bb]vemos
[F]todo a Dios en [C]ora[F]ción.

[CORO]
[C]¿Vive el hombre despro[F]visto
[Bb]de paz, gozo y santo a[F]mor?
[F]Esto es porque no lle[Bb]vamos
[F]todo a Dios en [C]ora[F]ción.`,
  },
  {
    id: 'ejemplo-roca',
    title: 'Roca de la eternidad',
    author: 'Augustus Toplady (trad. Tomás M. Westrup)',
    key: 'G',
    content: `[VERSO]
[G]Roca de la eterni[D]dad,
[G]fuiste abierta [C]tú por [G]mí;
[G]sé mi escondedero [D]fiel,
[G]solo encuentro [D]paz en [G]ti,
[C]rico, limpio mana[G]ntial,
[G]en el cual la[D]vado [G]fui.`,
  },
  {
    id: 'ejemplo-venid',
    title: 'Venid, fieles todos',
    author: 'Himno latino Adeste Fideles (trad. Juan B. Cabrera)',
    key: 'G',
    content: `[VERSO]
[G]Venid, fieles [D]todos, [G]a Be[D]lén mar[G]chemos,
[D]de gozo triun[A]fantes, hen[D]chidos de a[A]mor;
[D]y al Rey de los [G]cielos hu[D]mildes ve[G]remos.

[CORO]
[G]Venid, ado[D]remos, [G]venid, ado[D]remos,
[G]venid, ado[C]re[G]mos a [D]Cristo el Se[G]ñor.`,
  },
  {
    id: 'ejemplo-noche',
    title: 'Noche de paz',
    author: 'Joseph Mohr / Franz X. Gruber (trad. Federico Fliedner)',
    key: 'C',
    content: `[VERSO]
[C]Noche de paz, noche de a[C]mor,
[G]todo duerme en derre[C]dor;
[F]entre los astros que es[C]parcen su luz,
[F]bella anunciando al ni[C]ñito Jesús,
[G]brilla la estrella de [C]paz,
[C]brilla la [G]estrella de [C]paz.`,
  },
  {
    id: 'ejemplo-cristo-me-ama',
    title: 'Cristo me ama',
    author: 'Anna B. Warner / William B. Bradbury (trad. tradicional)',
    key: 'D',
    content: `[VERSO]
[D]Cristo me ama, [G]bien lo [D]sé,
[D]su Palabra me hace [A]ver,
[D]que los niños [G]son de [D]Él,
[D]quien es nuestro a[A]migo [D]fiel.

[CORO]
[D]Cristo me ama, [G]Cristo me ama,
[D]Cristo me ama, [A]la Biblia dice [D]así.`,
  },
];

function proximoDomingo() {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function eventosEjemplo() {
  return [
    {
      id: 'ejemplo-culto',
      name: 'Servicio de Adoración',
      date: proximoDomingo(),
      time: '11:00',
      notes: 'Evento de ejemplo. Puedes editarlo o eliminarlo.',
      items: cancionesEjemplo.map((s) => ({ songId: s.id, transpose: 0 })),
    },
  ];
}
