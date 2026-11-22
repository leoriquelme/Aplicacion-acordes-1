// Pedalera Bluetooth (o teclado): traduce cada tecla a una acción de la presentación.
// Las pedaleras (por ejemplo M-VAVE) se conectan como un teclado y, según el modo,
// mandan flechas ↑↓, flechas ←→, Re Pág / Av Pág, o Espacio / Enter.
// Se revisa e.key, e.code y e.keyCode porque cada navegador (sobre todo Safari en
// iPhone/iPad) nombra distinto algunas teclas.

const NOMBRES = {
  // Sección siguiente / anterior
  ArrowDown: 'seccion+', Down: 'seccion+', UIKeyInputDownArrow: 'seccion+',
  ArrowUp: 'seccion-', Up: 'seccion-', UIKeyInputUpArrow: 'seccion-',
  PageDown: 'seccion+', UIKeyInputPageDown: 'seccion+',
  PageUp: 'seccion-', UIKeyInputPageUp: 'seccion-',
  ' ': 'seccion+', Spacebar: 'seccion+', Space: 'seccion+',
  Enter: 'seccion+', NumpadEnter: 'seccion+',
  // Canción siguiente / anterior
  ArrowRight: 'cancion+', Right: 'cancion+', UIKeyInputRightArrow: 'cancion+',
  ArrowLeft: 'cancion-', Left: 'cancion-', UIKeyInputLeftArrow: 'cancion-',
};

const CODIGOS = {
  40: 'seccion+', 38: 'seccion-', 34: 'seccion+', 33: 'seccion-', 32: 'seccion+', 13: 'seccion+',
  39: 'cancion+', 37: 'cancion-',
};

/**
 * Devuelve 'seccion+', 'seccion-', 'cancion+', 'cancion-' o null.
 * Con Shift, Espacio y Enter retroceden (como en un lector de PDF).
 */
export function accionPedal(e) {
  if (!e || e.ctrlKey || e.metaKey || e.altKey) return null;
  let a = NOMBRES[e.key] || NOMBRES[e.code] || CODIGOS[e.keyCode || e.which] || null;
  if (a === 'seccion+' && e.shiftKey && (e.key === ' ' || e.key === 'Enter' || e.code === 'Space')) a = 'seccion-';
  return a;
}

/** true si la tecla se escribió en un campo de texto (ahí la pedalera no mueve nada). */
export function esCampoDeTexto(el) {
  if (!el || !el.tagName) return false;
  const t = el.tagName.toLowerCase();
  return t === 'input' || t === 'textarea' || t === 'select' || Boolean(el.isContentEditable);
}
