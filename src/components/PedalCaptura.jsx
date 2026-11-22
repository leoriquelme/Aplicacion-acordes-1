// En iPhone/iPad, Safari solo entrega las teclas de un teclado Bluetooth (la pedalera)
// cuando hay un campo de texto con foco. Este campo invisible recibe ese foco
// (sin abrir el teclado de la pantalla: inputMode="none") para que la pedalera funcione.
export default function PedalCaptura({ ref, onFoco }) {
  return (
    <input
      ref={ref}
      data-pedal="1"
      className="pedal-captura"
      type="text"
      inputMode="none"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-hidden="true"
      tabIndex={-1}
      onInput={(e) => { e.currentTarget.value = ''; }}
      onFocus={() => onFoco?.(true)}
      onBlur={() => onFoco?.(false)}
    />
  );
}

/** true en celulares y tablets (pantalla táctil): ahí se usa el campo invisible. */
export function esTactil() {
  try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; }
}

const MARCA = 'cancionero-pedalera';
/** Recuerda en este equipo que se usó una pedalera (para mostrar el aviso "toca la pantalla"). */
export function marcarPedalera() { try { localStorage.setItem(MARCA, '1'); } catch { /* sin almacenamiento */ } }
export function usaPedalera() { try { return localStorage.getItem(MARCA) === '1'; } catch { return false; } }
