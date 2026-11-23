import { describe, expect, it } from 'vitest';
import { lineaQueCoincide, lineasDeLetra } from './buscar.js';

const cancion = '[VERSO 1]\n[C]Tu fideli[G]dad es grande\n\n[CORO]\n[Am]Señor, tu [F]nombre es santo\n{c: Final}';

describe('buscar en la letra', () => {
  it('quita acordes y nombres de secciones', () => {
    expect(lineasDeLetra(cancion)).toEqual(['Tu fidelidad es grande', 'Señor, tu nombre es santo']);
  });
  it('encuentra una frase aunque tenga acordes en medio, sin tildes', () => {
    expect(lineaQueCoincide(cancion, 'fidelidad es')).toBe('Tu fidelidad es grande');
    expect(lineaQueCoincide(cancion, 'senor tu')).toBe('Señor, tu nombre es santo');
  });
  it('no encuentra nombres de secciones ni acordes', () => {
    expect(lineaQueCoincide(cancion, 'coro')).toBe('');
    expect(lineaQueCoincide(cancion, 'Am')).toBe('');
    expect(lineaQueCoincide(cancion, '')).toBe('');
  });
});
