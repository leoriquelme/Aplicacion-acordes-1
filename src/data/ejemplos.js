// Canciones de ejemplo: himnos clásicos de dominio público.

export const cancionesEjemplo = [
  {
    id: 'ejemplo-santo',
    title: '¡Santo! ¡Santo! ¡Santo!',
    author: 'Reginald Heber (trad. Juan B. Cabrera)',
    key: 'D',
    content: `{c: Verso 1}
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]Señor omni[D]potente,
[A]siempre el labio [D]mío lo[E]ores te da[A]rá;
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]te adoro re[D]verente,
[G]Dios en tres per[D]sonas, [A]bendita Trini[D]dad.

{c: Verso 2}
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
    content: `{sov: Verso 1}
[C]Castillo fuerte es [G]nuestro [C]Dios,
[F]defensa y [C]buen es[G]cudo;
[C]con su poder nos [G]libra[C]rá
[F]en este [C]trance a[G]gudo.

[C]Con furia y con a[G]fán
[Am]acósanos Sa[E]tán;
[F]por armas deja [C]ver
[Dm]astucia y gran po[G]der;
[C]cual él no [F]hay en la [G]tie[C]rra.
{eov}`,
  },
  {
    id: 'ejemplo-amigo',
    title: '¡Oh, qué amigo nos es Cristo!',
    author: 'Joseph M. Scriven / Charles C. Converse',
    key: 'F',
    content: `[F]¡Oh, qué amigo nos es [Bb]Cristo!
[F]Él llevó nuestro do[C]lor,
[F]y nos manda que lle[Bb]vemos
[F]todo a Dios en [C]ora[F]ción.

{soc}
[C]¿Vive el hombre despro[F]visto
[Bb]de paz, gozo y santo a[F]mor?
[F]Esto es porque no lle[Bb]vamos
[F]todo a Dios en [C]ora[F]ción.
{eoc}`,
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
      name: 'Culto dominical',
      date: proximoDomingo(),
      time: '11:00',
      notes: 'Evento de ejemplo. Puedes editarlo o eliminarlo.',
      items: cancionesEjemplo.map((s) => ({ songId: s.id, transpose: 0 })),
    },
  ];
}
