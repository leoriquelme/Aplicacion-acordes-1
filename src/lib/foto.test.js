import { describe, expect, it } from 'vitest';
import { encuadre, fotoValida, MAX_FOTO } from './foto.js';

describe('encuadre', () => {
  it('cubrir recorta al centro una foto horizontal', () => {
    expect(encuadre(400, 200, 100, 'cubrir')).toEqual({ dx: -50, dy: 0, dw: 200, dh: 100 });
  });
  it('contener deja entrar completo un logo horizontal', () => {
    expect(encuadre(400, 200, 100, 'contener')).toEqual({ dx: 0, dy: 25, dw: 100, dh: 50 });
  });
});

describe('fotoValida', () => {
  it('acepta un JPEG pequeño', () => {
    expect(fotoValida('data:image/jpeg;base64,AAAA')).toBe(true);
  });
  it('rechaza otros tipos y textos muy largos', () => {
    expect(fotoValida('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(fotoValida('https://ejemplo.com/foto.jpg')).toBe(false);
    expect(fotoValida(`data:image/jpeg;base64,${'A'.repeat(MAX_FOTO)}`)).toBe(false);
  });
});
