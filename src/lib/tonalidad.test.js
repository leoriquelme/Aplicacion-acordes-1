import { describe, expect, it } from 'vitest';
import { partesDeTono, pasosHacia } from './tonalidad.js';

describe('elegir tono con una nota', () => {
  it('cuenta los medios tonos desde el original', () => {
    expect(pasosHacia('G', 'A')).toBe(2);
    expect(pasosHacia('G', 'E')).toBe(-3);
    expect(pasosHacia('Am', 'C')).toBe(3);
    expect(pasosHacia('D', 'B', 'b')).toBe(-4);
    expect(pasosHacia('C', 'F', '#')).toBe(6);
    expect(pasosHacia('', 'C')).toBe(0);
  });
  it('separa letra y alteración', () => {
    expect(partesDeTono('Bbm')).toEqual({ letra: 'B', alt: 'b' });
    expect(partesDeTono('F#')).toEqual({ letra: 'F', alt: '#' });
  });
});
