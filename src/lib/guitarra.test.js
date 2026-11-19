import { describe, expect, it } from 'vitest';
import { chordsInContent, guitarShape } from './guitarra.js';

describe('acordes de guitarra', () => {
  it('usa formas abiertas conocidas', () => {
    expect(guitarShape('G').frets).toEqual([3, 2, 0, 0, 0, 3]);
    expect(guitarShape('Am').frets).toEqual([-1, 0, 2, 2, 1, 0]);
  });
  it('usa cejilla cuando no hay forma abierta', () => {
    expect(guitarShape('F').frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(guitarShape('Bm').frets).toEqual([-1, 2, 4, 4, 3, 2]);
    expect(guitarShape('F#m').frets).toEqual([2, 4, 4, 2, 2, 2]);
  });
  it('da una alternativa sencilla para acordes difíciles', () => {
    const s = guitarShape('G7sus4');
    expect([s.shown, s.simple]).toEqual(['Gsus4', true]);
    expect(guitarShape('Cadd9').shown).toBe('C');
    expect(guitarShape('D/F#')).toMatchObject({ shown: 'D', bass: 'F#', simple: true });
    expect(guitarShape('Bb').shown).toBe('Bb');
  });
  it('lista los acordes de una canción', () => {
    expect(chordsInContent('[VERSO 1]\n[G]a [D]b [G]c [Em]\n[CORO 1]\n[C]d\n[FINAL]\n[Bb]')).toEqual(['G', 'D', 'Em', 'C', 'Bb']);
  });
});
