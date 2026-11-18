import { describe, expect, it } from 'vitest';
import { arrangeSections, parseLine, parseSong, parseMeta, transposeChord, transposeKey, displayKey, normalize } from './chordpro.js';

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
  it('divide en secciones con nombre', () => {
    const secs = parseSong('{title: X}\n{c: Estrofa}\n[G]uno\n\n{soc}\n[C]coro\n\n[D]sigue\n{eoc}\n[G]fin\n\n{sob}\n[Em]puente\n{eob}');
    expect(secs.map((s) => [s.name, s.type])).toEqual([
      ['Estrofa', 'verse'], ['Coro', 'chorus'], ['Verso 1', 'verse'], ['Puente', 'bridge'],
    ]);
    expect(secs[1].lines).toHaveLength(2);
  });
  it('numera versos y evita nombres repetidos', () => {
    const secs = parseSong('[G]a\n\n[G]b\n\n{c: Coro}\n[C]c\n\n{c: Coro}\n[C]d');
    expect(secs.map((s) => s.name)).toEqual(['Verso 1', 'Verso 2', 'Coro', 'Coro 2']);
    expect(secs[2].type).toBe('chorus');
  });
  it('lee los datos de la canción', () => {
    expect(parseMeta('{title: Hola}\n{artist: Ana}\n{key: G}')).toEqual({ title: 'Hola', author: 'Ana', key: 'G' });
  });
});

describe('arrangeSections', () => {
  const secs = parseSong('[G]uno\n\n{soc}\n[C]coro\n{eoc}\n\n[G]dos');
  it('reordena y repite secciones', () => {
    expect(arrangeSections(secs, ['Coro', 'Verso 1', 'Coro', 'Verso 2', 'Coro']).map((s) => s.name))
      .toEqual(['Coro', 'Verso 1', 'Coro', 'Verso 2', 'Coro']);
  });
  it('usa el orden original si no hay orden válido', () => {
    expect(arrangeSections(secs, undefined)).toBe(secs);
    expect(arrangeSections(secs, ['No existe'])).toBe(secs);
  });
});

it('busca sin tildes', () => {
  expect(normalize('Cuán Grande')).toBe('cuan grande');
});

it('Pre-coro no se marca como coro', () => {
  const secs = parseSong('{c: Pre-coro}\n[G]a\n\n{c: Coro 2}\n[C]b');
  expect(secs.map((s) => s.type)).toEqual(['verse', 'chorus']);
});
