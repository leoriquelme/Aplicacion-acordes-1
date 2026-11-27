import { describe, expect, it } from 'vitest';
import { edadEn, rangoPorEdad, sugerencias, teExtranamos } from './sugerencias.js';

const hoy = '2026-11-24';
const events = [{ id: 'e1', date: '2026-11-08' }, { id: 'e2', date: '2026-11-15' }, { id: 'e3', date: '2026-11-22' }, { id: 'e0', date: '2026-10-01' }];
const asis = (pares) => new Map(pares.map(([e, k]) => [`${e}__${k}`, { eventId: e, personKey: k }]));

describe('sugerencias del Inicio', () => {
  it('edad y rango', () => {
    expect(edadEn('2011-11-25', hoy)).toBe(14);
    expect(edadEn('2011-11-24', hoy)).toBe(15);
    expect(rangoPorEdad(15)).toBe('Adolescente');
    expect(rangoPorEdad(40)).toBe('Adulto');
  });
  it('visita que viene seguido → Regular; regular que no viene → Ocasional; niño con 15 → reclasificar', () => {
    const people = [
      { key: 'v', nombre: 'Vale', tipo: 'Visita' },
      { key: 'r', nombre: 'Rosa', tipo: 'Regular' },
      { key: 'x', nombre: 'Ximena', tipo: 'Regular', estado: 'inactivo' },
      { key: 'n', nombre: 'Nico', rangoEdad: 'Niño', tipo: 'Regular' },
      { key: 'm', nombre: 'Mati', rangoEdad: 'Niño' },
    ];
    const a = asis([['e1', 'v'], ['e2', 'v'], ['e3', 'v'], ['e1', 'n'], ['e0', 'r'], ['e1', 'e'], ['e2', 'e'], ['e3', 'e']]);
    const fichas = new Map([['n', { fechaNacimiento: '2011-11-20' }], ['m', { fechaNacimiento: '2016-01-01' }]]);
    const s = sugerencias({ people, fichas, asistencia: a, events, hoy });
    expect(s.map((x) => x.id).sort()).toEqual(['edad:n:Adolescente', 'ocasional:r', 'regular:v']);
    expect(s.find((x) => x.key === 'n').cambio).toEqual({ rangoEdad: 'Adolescente', esNino: false });
  });
  it('sin 3 eventos recientes con registro no sugiere cambios de asistencia', () => {
    const s = sugerencias({ people: [{ key: 'r', tipo: 'Regular' }], asistencia: asis([['e3', 'z']]), events, hoy });
    expect(s).toEqual([]);
  });
});

describe('teExtranamos', () => {
  const events = ['11-01', '11-08', '11-15', '11-22', '11-29', '10-25', '10-18'].map((d) => ({ id: `c${d}`, date: `2026-${d}` }));
  const a = (key, ...ds) => ds.map((d) => ({ eventId: `c${d}`, personKey: key }));
  const asistencia = new Map([
    ...a('ana', '10-18', '10-25', '11-01'), // venía, faltó 4 seguidos
    ...a('beto', '11-29'), // vino al último
    ...a('caro', '10-18'), // venía poco
    ...a('dani', '10-25', '11-01', '11-08'), // faltó 3 seguidos
    ...a('otro', '11-15', '11-22', '11-29'),
  ].map((x, i) => [i, x]));
  const people = ['ana', 'beto', 'caro', 'dani', 'eva'].map((key) => ({ key, name: key }));
  it('quien venía seguido y faltó 3 o más cultos', () => {
    const r = teExtranamos({ people, asistencia, events, hoy: '2026-11-30' });
    expect(r.map((x) => [x.p.key, x.faltas, x.ultima])).toEqual([['dani', 3, '2026-11-08'], ['ana', 4, '2026-11-01']]);
  });
  it('con pocos cultos registrados no dice nada', () => {
    expect(teExtranamos({ people, asistencia, events: events.slice(0, 3), hoy: '2026-11-30' })).toEqual([]);
  });
});
