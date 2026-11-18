import { describe, expect, it } from 'vitest';
import { importSong, isChordLine, mergeChordLine, parseHeader } from './importar.js';
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
