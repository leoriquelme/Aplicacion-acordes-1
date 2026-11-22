import { describe, expect, it } from 'vitest';
import { accionPedal, esCampoDeTexto } from './pedal.js';

describe('accionPedal', () => {
  it('modo flechas arriba/abajo', () => {
    expect(accionPedal({ key: 'ArrowDown' })).toBe('seccion+');
    expect(accionPedal({ key: 'ArrowUp' })).toBe('seccion-');
  });
  it('modo Re Pág / Av Pág', () => {
    expect(accionPedal({ key: 'PageDown' })).toBe('seccion+');
    expect(accionPedal({ key: 'PageUp' })).toBe('seccion-');
  });
  it('modo Espacio / Enter', () => {
    expect(accionPedal({ key: ' ', code: 'Space' })).toBe('seccion+');
    expect(accionPedal({ key: 'Enter' })).toBe('seccion+');
    expect(accionPedal({ key: ' ', code: 'Space', shiftKey: true })).toBe('seccion-');
  });
  it('modo flechas izquierda/derecha cambia de canción', () => {
    expect(accionPedal({ key: 'ArrowRight' })).toBe('cancion+');
    expect(accionPedal({ key: 'ArrowLeft' })).toBe('cancion-');
  });
  it('nombres de Safari en iPhone y teclas sin nombre', () => {
    expect(accionPedal({ key: 'UIKeyInputDownArrow' })).toBe('seccion+');
    expect(accionPedal({ key: 'UIKeyInputUpArrow' })).toBe('seccion-');
    expect(accionPedal({ key: 'Unidentified', keyCode: 40 })).toBe('seccion+');
    expect(accionPedal({ key: 'Unidentified', keyCode: 33 })).toBe('seccion-');
  });
  it('ignora atajos con Ctrl/Cmd y otras teclas', () => {
    expect(accionPedal({ key: 'ArrowDown', metaKey: true })).toBe(null);
    expect(accionPedal({ key: 'a' })).toBe(null);
  });
});

describe('esCampoDeTexto', () => {
  it('reconoce campos', () => {
    expect(esCampoDeTexto({ tagName: 'INPUT' })).toBe(true);
    expect(esCampoDeTexto({ tagName: 'BUTTON' })).toBe(false);
    expect(esCampoDeTexto(null)).toBe(false);
  });
});
