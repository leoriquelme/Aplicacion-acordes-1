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

import { destinoRecorte, escalaVisor, limitarDesplazamiento } from './foto.js';

describe('encuadrar con zoom', () => {
  it('la foto llena el visor y con zoom 2 se ve el doble', () => {
    expect(escalaVisor(400, 200, 100)).toBe(0.5);
    expect(escalaVisor(400, 200, 100, 2)).toBe(1);
    expect(escalaVisor(400, 200, 100, 1, 'contener')).toBe(0.25);
  });
  it('no deja arrastrar la foto fuera del círculo', () => {
    // 400×200 a escala 0.5 = 200×100 en un visor de 100: se mueve 50 a los lados y 0 arriba/abajo
    expect(limitarDesplazamiento({ x: 80, y: 30 }, 400, 200, 0.5, 100)).toEqual({ x: 50, y: 0 });
  });
  it('el recorte final coincide con lo que se ve', () => {
    // visor 100 → salida 200 (todo ×2); centrada
    expect(destinoRecorte(400, 200, 0.5, { x: 0, y: 0 }, 100, 200)).toEqual({ dx: -100, dy: 0, dw: 400, dh: 200 });
    expect(destinoRecorte(400, 200, 0.5, { x: 50, y: 0 }, 100, 200)).toEqual({ dx: 0, dy: 0, dw: 400, dh: 200 });
  });
});

describe('fotoValida con fotos largas', () => {
  it('acepta un JPEG de 50 000 letras y rechaza letras raras', () => {
    const largo = `data:image/jpeg;base64,${'Ab9+/'.repeat(10000)}`;
    expect(fotoValida(largo)).toBe(true);
    expect(fotoValida(`${largo.slice(0, 100)}<script>`)).toBe(false);
    expect(fotoValida('data:image/jpeg;base64,')).toBe(false);
  });
});
