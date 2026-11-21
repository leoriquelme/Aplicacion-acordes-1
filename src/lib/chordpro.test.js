import { describe, expect, it } from 'vitest';
import { sectionLabel, syncOrder, arrangeSections, customBases, groupOrder, flattenGroups, sectionKind, validCustomName, cleanCustomName, nextSectionName, sectionHeader, parseLine, parseSong, parseMeta, transposeChord, transposeKey, displayKey, normalize } from './chordpro.js';

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
    const names = (l) => l.map((s) => s.name);
    expect(names(arrangeSections(secs, undefined))).toEqual(names(secs));
    expect(names(arrangeSections(secs, ['No existe']))).toEqual(names(secs));
  });
  it('junta las repeticiones seguidas en ×2', () => {
    const r = arrangeSections(secs, ['Verso 1', 'Coro', 'Coro', 'Verso 2']);
    expect(r.map((s) => [s.name, s.times])).toEqual([['Verso 1', 1], ['Coro', 2], ['Verso 2', 1]]);
  });
  it('acepta marcas sin letra', () => {
    const r = arrangeSections(secs, ['~INSTRUMENTAL', 'Coro']);
    expect(r.map((s) => [s.name, s.kind, s.lines.length])).toEqual([['INSTRUMENTAL', 'instrumental', 0], ['Coro', 'chorus', 1]]);
  });
});

describe('secciones nuevas y personalizadas', () => {
  it('reconoce los tipos y colores', () => {
    const secs = parseSong('[INTRO]\n[G]\n\n[INTERLUDIO]\n[C]\n\n[ALABANZA LIBRE]\nla la\n\n[CORO 2]\nhola');
    expect(secs.map((s) => [s.name, s.kind])).toEqual([
      ['INTRO', 'intro'], ['INTERLUDIO', 'interlude'], ['ALABANZA LIBRE', 'custom'], ['CORO 2', 'chorus'],
    ]);
  });
  it('no confunde acordes con secciones', () => {
    const secs = parseSong('[VERSO]\n[Am]\n[SOL]\n[G]hola');
    expect(secs).toHaveLength(1);
    expect(sectionKind('Verso 1')).toBe('verse');
  });
  it('cuenta las personalizadas', () => {
    expect(customBases('[VERSO]\na\n\n[GLORIA]\nb\n\n[GLORIA 2]\nc\n\n[ALELUYA]\nd')).toEqual(['GLORIA', 'ALELUYA']);
    expect(cleanCustomName(' solo  de guitarra! ')).toBe('SOLO DE GUITARRA');
    expect(validCustomName('SOL')).toBe(false);
    expect(validCustomName('CORO')).toBe(false);
    expect(validCustomName('GLORIA')).toBe(true);
  });
  it('agrega al orden las secciones nuevas de la letra', () => {
    const a = '[VERSO]\na\n\n[CORO]\nb';
    const b = '[VERSO]\na\n\n[CORO]\nb\n\n[PUENTE]\nc';
    expect(syncOrder(['CORO', '~SOLO', 'VERSO'], a, b)).toEqual(['CORO', '~SOLO', 'VERSO', 'PUENTE']);
    expect(syncOrder(['CORO', 'VERSO'], b, '[VERSO]\na')).toEqual(['VERSO']);
    expect(syncOrder(undefined, a, b)).toBe(undefined);
  });
  it('agrupa y desagrupa el orden', () => {
    const g = groupOrder(['A', 'A', 'B', 'A']);
    expect(g).toEqual([{ name: 'A', times: 2 }, { name: 'B', times: 1 }, { name: 'A', times: 1 }]);
    expect(flattenGroups(g)).toEqual(['A', 'A', 'B', 'A']);
  });
});

it('busca sin tildes', () => {
  expect(normalize('Cuán Grande')).toBe('cuan grande');
});

it('Pre-coro no se marca como coro', () => {
  const secs = parseSong('{c: Pre-coro}\n[G]a\n\n{c: Coro 2}\n[C]b');
  expect(secs.map((s) => s.type)).toEqual(['verse', 'chorus']);
});

describe('secciones con [NOMBRE]', () => {
  it('reconoce títulos de sección y no los confunde con acordes', () => {
    expect(sectionHeader('[CORO]')).toBe('CORO');
    expect(sectionHeader('[verso 2]')).toBe('VERSO 2');
    expect(sectionHeader('[Pre-coro]')).toBe('PRE CORO');
    expect(sectionHeader('[C]')).toBe(null);
    expect(sectionHeader('[G]Cuán grande')).toBe(null);
    expect(sectionHeader('[VERSO 6]')).toBe(null);
  });
  it('divide la canción y termina la sección con una línea vacía', () => {
    const secs = parseSong('[INTRO]\n[G] [D]\n\n[VERSO]\n[G]uno\n[C]dos\n\n[PRE CORO]\n[Am]pre\n\n[CORO]\n[C]coro\n\n[VERSO 2]\n[G]tres');
    expect(secs.map((s) => [s.name, s.type, s.lines.length])).toEqual([
      ['INTRO', 'verse', 1], ['VERSO', 'verse', 2], ['PRE CORO', 'verse', 1], ['CORO', 'chorus', 1], ['VERSO 2', 'verse', 1],
    ]);
  });
  it('numera la siguiente sección hasta 5', () => {
    expect(nextSectionName('VERSO', [])).toBe('VERSO 1');
    expect(nextSectionName('VERSO', ['VERSO', 'CORO'])).toBe('VERSO 2');
    expect(nextSectionName('VERSO', ['VERSO', 'VERSO 2', 'VERSO 3'])).toBe('VERSO 4');
    expect(nextSectionName('CORO', ['CORO', 'CORO 2', 'CORO 3', 'CORO 4', 'CORO 5'])).toBe(null);
    expect(nextSectionName('CORO', ['CORO 1'])).toBe('CORO 2');
  });
});

it('muestra la primera sección con número', () => {
  expect(sectionLabel('CORO')).toBe('CORO 1');
  expect(sectionLabel('CORO 2')).toBe('CORO 2');
  expect(sectionLabel('Verso 1')).toBe('Verso 1');
});

import { detectKey, normalizeKey } from './chordpro.js';
describe('detectKey', () => {
  it('adivina tonos mayores y menores', () => {
    expect(detectKey('[G]a [D]b [Em]c [C]d [G]e')).toBe('G');
    expect(detectKey('[C]a [G]b [Am]c [F]d')).toBe('C');
    expect(detectKey('[Em]a [C]b [G]c [B7]d [Em]e')).toBe('Em');
    expect(detectKey('[Bb]a [F]b [Gm]c [Eb]d [Bb]e')).toBe('Bb');
    expect(detectKey('[VERSO 1]\n[D]a [A]b [Bm]c [G]d')).toBe('D');
    expect(detectKey('sin acordes')).toBe('');
  });
  it('normaliza nombres de tono', () => {
    expect(normalizeKey('Sol')).toBe('G');
    expect(normalizeKey('Mim')).toBe('Em');
    expect(normalizeKey('A#')).toBe('Bb');
    expect(normalizeKey('F#m')).toBe('F#m');
    expect(normalizeKey('raro')).toBe('');
  });
});
