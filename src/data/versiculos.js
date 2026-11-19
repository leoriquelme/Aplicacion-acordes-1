// Versículos para el inicio. Texto de la Reina-Valera 1909 (dominio público),
// con la ortografía actual de los acentos ("a" en vez de "á").
// Cambia uno por día y funciona sin internet.
export const VERSICULOS = [
  { cita: 'Juan 3:16', texto: 'Porque de tal manera amó Dios al mundo, que haya dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.' },
  { cita: 'Salmos 23:1', texto: 'Jehová es mi pastor; nada me faltará.' },
  { cita: 'Filipenses 4:13', texto: 'Todo lo puedo en Cristo que me fortalece.' },
  { cita: 'Isaías 40:31', texto: 'Mas los que esperan a Jehová tendrán nuevas fuerzas; levantarán las alas como águilas, correrán, y no se cansarán, caminarán, y no se fatigarán.' },
  { cita: 'Lamentaciones 3:22-23', texto: 'Es por la misericordia de Jehová que no somos consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.' },
  { cita: 'Salmos 100:2', texto: 'Servid a Jehová con alegría: Venid ante su acatamiento con regocijo.' },
  { cita: 'Salmos 95:1', texto: 'Venid, celebremos alegremente a Jehová: Cantemos con júbilo a la roca de nuestra salud.' },
  { cita: 'Salmos 96:1', texto: 'Cantad a Jehová canción nueva; Cantad a Jehová, toda la tierra.' },
  { cita: 'Colosenses 3:16', texto: 'La palabra de Cristo habite en vosotros en abundancia en toda sabiduría, enseñándoos y exhortándoos los unos a los otros con salmos e himnos y canciones espirituales, con gracia cantando en vuestros corazones al Señor.' },
  { cita: 'Efesios 5:19', texto: 'Hablando entre vosotros con salmos, y himnos, y canciones espirituales, cantando y alabando al Señor en vuestros corazones.' },
  { cita: 'Proverbios 3:5-6', texto: 'Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.' },
  { cita: 'Romanos 8:28', texto: 'Y sabemos que a los que a Dios aman, todas las cosas les ayudan a bien, es a saber, a los que conforme al propósito son llamados.' },
  { cita: 'Josué 1:9', texto: 'Mira que te mando que te esfuerces y seas valiente: no temas ni desmayes, porque Jehová tu Dios será contigo en donde quiera que fueres.' },
  { cita: 'Mateo 11:28', texto: 'Venid a mí todos los que estáis trabajados y cargados, que yo os haré descansar.' },
  { cita: 'Salmos 46:1', texto: 'Dios es nuestro amparo y fortaleza, Nuestro pronto auxilio en las tribulaciones.' },
  { cita: 'Salmos 119:105', texto: 'Lámpara es a mis pies tu palabra, Y lumbrera a mi camino.' },
  { cita: 'Juan 14:6', texto: 'Jesús le dice: Yo soy el camino, y la verdad, y la vida: nadie viene al Padre, sino por mí.' },
  { cita: 'Romanos 12:1', texto: 'Así que, hermanos, os ruego por las misericordias de Dios, que presentéis vuestros cuerpos en sacrificio vivo, santo, agradable a Dios, que es vuestro racional culto.' },
  { cita: 'Hebreos 13:8', texto: 'Jesucristo es el mismo ayer, y hoy, y por los siglos.' },
  { cita: '1 Juan 1:9', texto: 'Si confesamos nuestros pecados, él es fiel y justo para que nos perdone nuestros pecados, y nos limpie de toda maldad.' },
  { cita: 'Salmos 34:1', texto: 'Bendeciré a Jehová en todo tiempo; Su alabanza será siempre en mi boca.' },
  { cita: 'Salmos 150:6', texto: 'Todo lo que respira alabe a JAH. Aleluya.' },
  { cita: 'Isaías 41:10', texto: 'No temas, que yo soy contigo; no desmayes, que yo soy tu Dios que te esfuerzo: siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.' },
  { cita: 'Efesios 2:8', texto: 'Porque por gracia sois salvos por la fe; y esto no de vosotros, pues es don de Dios.' },
  { cita: 'Romanos 5:8', texto: 'Mas Dios encarece su caridad para con nosotros, porque siendo aún pecadores, Cristo murió por nosotros.' },
  { cita: 'Filipenses 4:6', texto: 'Por nada estéis afanosos; sino sean notorias vuestras peticiones delante de Dios en toda oración y ruego, con hacimiento de gracias.' },
  { cita: '1 Tesalonicenses 5:16-18', texto: 'Estad siempre gozosos. Orad sin cesar. Dad gracias en todo; porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.' },
  { cita: 'Salmos 27:1', texto: 'Jehová es mi luz y mi salvación: ¿de quién temeré? Jehová es la fortaleza de mi vida: ¿de quién he de atemorizarme?' },
  { cita: 'Mateo 6:33', texto: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.' },
  { cita: '2 Corintios 5:17', texto: 'De modo que si alguno está en Cristo, nueva criatura es: las cosas viejas pasaron; he aquí todas son hechas nuevas.' },
  { cita: 'Salmos 133:1', texto: '¡Mirad cuán bueno y cuán delicioso es Habitar los hermanos igualmente en uno!' },
  { cita: 'Juan 4:24', texto: 'Dios es Espíritu; y los que le adoran, en espíritu y en verdad es necesario que adoren.' },
];

/** Versículo del día: cambia a medianoche (hora del teléfono). */
export function versiculoDelDia(fecha = new Date()) {
  const inicio = new Date(fecha.getFullYear(), 0, 1);
  const dia = Math.floor((new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) - inicio) / 86400000);
  const n = (fecha.getFullYear() * 366 + dia) % VERSICULOS.length;
  return VERSICULOS[n];
}
