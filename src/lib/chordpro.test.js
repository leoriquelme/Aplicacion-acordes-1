import { describe, expect, it } from 'vitest';
import { parseLine, parseSong, parseMeta, transposeChord, transposeKey, displayKey, normalize } from './chordpro.js';

describe('transposeChord', () => {
  it('sube y baja medio tono', () => {
    expect(transposeChord('G', 1)).toBe('G#');
    expect(transposeChord('G', 1, { useFlats: true })).toBe('Ab');
    expect(transposeChord('C', -1)).toBe('B');
  });
  it('mantiene el tipo de acorde y el bajo', () => {
    expect(transposeChord('Am7', 2)).toBe('Bm7');
    expect(transposeChord('G/B', 2)).toBe('A/C#');
    expect(transposeChord('Dsus4', 12)).toBe('Dsus4');
  });
  it('acepta y muestra notación latina', () => {
    expect(transposeChord('Sol', 2)).toBe('A');
    expect(transposeChord('Lam', 0, { notation: 'latino' })).toBe('Lam');
    expect(transposeChord('G/B', 0, { notation: 'latino' })).toBe('Sol/Si');
  });
  it('deja igual lo que no es acorde', () => {
    expect(transposeChord('N.C.', 3)).toBe('N.C.');
  });
});

describe('transposeKey', () => {
  it('elige bemoles o sostenidos según el tono', () => {
    expect(transposeKey('C', 5)).toBe('F');
    expect(transposeKey('C', 10)).toBe('Bb');
    expect(transposeKey('D', 4)).toBe('F#');
    expect(transposeKey('Am', 1)).toBe('Bbm');
    expect(displayKey('G', 0, 'latino')).toBe('Sol');
  });
});

describe('parseLine', () => {
  it('separa acordes y letra', () => {
    expect(parseLine('[G]Cuán grande es [C]Él')).toEqual([
      { chord: 'G', text: 'Cuán grande es ' },
      { chord: 'C', text: 'Él' },
    ]);
    expect(parseLine('Hola [D]mundo')).toEqual([
      { chord: '', text: 'Hola ' },
      { chord: 'D', text: 'mundo' },
    ]);
  });
});

describe('parseSong', () => {
  it('reconoce estrofas, coros y comentarios', () => {
    const blocks = parseSong('{title: X}\n{c: Estrofa}\n[G]uno\n\n{soc}\n[C]coro\n\n[D]sigue\n{eoc}\n[G]fin');
    expect(blocks.map((b) => b.type)).toEqual(['verse', 'chorus', 'verse']);
    expect(blocks[0].lines[0]).toEqual({ type: 'comment', text: 'Estrofa' });
    expect(blocks[1].lines).toHaveLength(2);
  });
  it('lee los datos de la canción', () => {
    expect(parseMeta('{title: Hola}\n{artist: Ana}\n{key: G}')).toEqual({ title: 'Hola', author: 'Ana', key: 'G' });
  });
});

it('busca sin tildes', () => {
  expect(normalize('Cuán Grande')).toBe('cuan grande');
});
