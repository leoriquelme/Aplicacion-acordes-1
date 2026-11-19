import { describe, expect, it } from 'vitest';
import { buildSong, importSong, isChordLine, mergeChordLine, mergeWithPrevious, parseHeader, removeSection, sectionNames, setSectionType, splitSection } from './importar.js';
import { parseSong } from './chordpro.js';

describe('detectar acordes', () => {
  it('reconoce líneas de acordes', () => {
    expect(isChordLine('G      D/F#     Em   C')).toBe(true);
    expect(isChordLine('Am7  |  Dsus4  Bb  F#m7b5  (x2)')).toBe(true);
    expect(isChordLine('Sol   Re   Mim   Do')).toBe(true);
    expect(isChordLine('Cuán grande es Él')).toBe(false);
    expect(isChordLine('A ti sea la gloria')).toBe(false);
  });
  it('pone los acordes en su columna', () => {
    expect(mergeChordLine('G          C', 'Cuán grande es Él')).toBe('[G]Cuán grande[C] es Él');
    expect(mergeChordLine('G       D       G', 'Santo es')).toBe('[G]Santo es[D]        [G]');
  });
  it('reconoce títulos de sección', () => {
    expect(parseHeader('CORO:')).toEqual({ base: 'CORO', rest: '', times: 1 });
    expect(parseHeader('Coro (x2)')).toEqual({ base: 'CORO', rest: '', times: 2 });
    expect(parseHeader('Estrofa 2')).toEqual({ base: 'VERSO', rest: '', times: 1 });
    expect(parseHeader('Intro: G D Em C')).toEqual({ base: 'INTRO', rest: 'G D Em C', times: 1 });
    expect(parseHeader('[Pre-Coro]')).toEqual({ base: 'PRE CORO', rest: '', times: 1 });
    expect(parseHeader('Coro de ángeles canta')).toBe(null);
  });
});

describe('importSong', () => {
  it('convierte una canción con títulos y repeticiones', () => {
    const raw = `Tono: G

Intro: G  D  Em  C

Verso 1
G              D
Primera línea aquí
Em             C
Segunda línea aquí

Coro:
C        G
Este es el coro
D            Em
Que se repite

Verso 2
G              D
Otra estrofa distinta

Coro x2
`;
    const r = importSong(raw);
    expect(r.key).toBe('G');
    const secs = parseSong(r.content);
    expect(secs.map((s) => s.name)).toEqual(['INTRO', 'VERSO', 'CORO', 'VERSO 2']);
    expect(r.order).toEqual(['INTRO', 'VERSO', 'CORO', 'VERSO 2', 'CORO', 'CORO']);
    expect(r.content).toContain('[G]Primera línea a[D]quí');
    expect(r.content).toContain('[INTRO]\n[G] [D] [Em] [C]');
  });
  it('sin títulos, adivina el coro por lo que se repite', () => {
    const raw = `G       D
Estrofa uno

C        G
El coro

G       D
Estrofa dos

C        G
El coro`;
    const r = importSong(raw);
    expect(parseSong(r.content).map((s) => [s.name, s.type])).toEqual([
      ['VERSO', 'verse'], ['CORO', 'chorus'], ['VERSO 2', 'verse'],
    ]);
    expect(r.order).toEqual(['VERSO', 'CORO', 'VERSO 2', 'CORO']);
  });
});

describe('ajustes manuales', () => {
  const base = {
    sections: [
      { base: 'VERSO', lines: ['a', 'b'] },
      { base: 'CORO', lines: ['c'] },
      { base: 'VERSO', lines: ['d', 'e', 'f'] },
    ],
    order: [0, 1, 2, 1],
    key: '',
  };
  it('cambia el tipo y renumera', () => {
    const s = setSectionType(base, 2, 'PUENTE');
    expect(sectionNames(s.sections)).toEqual(['VERSO', 'CORO', 'PUENTE']);
    expect(buildSong(s.sections, s.order).order).toEqual(['VERSO', 'CORO', 'PUENTE', 'CORO']);
  });
  it('une con la anterior', () => {
    const s = mergeWithPrevious(base, 1);
    expect(s.sections.map((x) => x.lines)).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);
    expect(s.order).toEqual([0, 1, 0]);
  });
  it('divide una sección', () => {
    const s = splitSection(base, 2, 1, 'CORO');
    expect(sectionNames(s.sections)).toEqual(['VERSO', 'CORO', 'VERSO 2', 'CORO 2']);
    expect(s.order).toEqual([0, 1, 2, 3, 1]);
  });
  it('quita una sección', () => {
    const s = removeSection(base, 1);
    expect(s.order).toEqual([0, 1]);
    expect(buildSong(s.sections, s.order)).toEqual({ content: '[VERSO]\na\nb\n\n[VERSO 2]\nd\ne\nf', order: undefined });
  });
});

import { convertPlainChords, songKey } from './importar.js';
import { transposeChord as tc } from './chordpro.js';
describe('acordes sin corchetes', () => {
  it('pasa los acordes de arriba a [G] para poder transponer', () => {
    const r = convertPlainChords('[CORO]\nG       C\nCuán grande es Él\nAm D');
    expect(r).toBe('[CORO]\n[G]Cuán gra[C]nde es Él\n[Am] [D]');
  });
  it('adivina el tono si no hay', () => {
    expect(songKey({ content: '[VERSO]\nAm   F\nhola mundo' })).toBe('Am');
    expect(songKey({ key: 'D', content: '[G]x' })).toBe('D');
    expect(tc('F♯m', 1)).toBe('Gm');
  });
});

import { autodetect } from './importar.js';
describe('autodetectar', () => {
  it('convierte acordes y títulos sin tocar lo que ya está bien', () => {
    const r = autodetect('[VERSO]\n[G]ya bien\n\nCoro:\nG     D\nSanto santo\n\nEstrofa\nEm\nfin');
    expect(r.content).toBe('[VERSO]\n[G]ya bien\n\n[CORO]\n[G]Santo [D]santo\n\n[VERSO 2]\n[Em]fin');
    expect([r.chords, r.headers]).toEqual([2, 2]);
  });
});

describe('líneas de acordes con barras y puntuación', () => {
  it('reconoce |D  |F#m  Esus.', () => {
    expect(isChordLine('|D    |F#m   |Esus.')).toBe(true);
    expect(convertPlainChords('|D     |Esus\nCuán alto monte')).toContain('[Esus]');
  });
});
