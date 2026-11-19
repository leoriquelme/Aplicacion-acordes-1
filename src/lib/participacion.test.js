import { describe, expect, it } from 'vitest';
import { colorDe, grupoDe, historial, iniciales, inscritosPorGrupo, participationId } from './participacion.js';

const now = new Date(2026, 10, 19, 12, 0);
const events = [
  { id: 'a', name: 'Culto', date: '2026-11-15', time: '11:00' },
  { id: 'b', name: 'Culto', date: '2026-11-08', time: '11:00' },
  { id: 'c', name: 'Viejo', date: '2026-07-01', time: '11:00' },
  { id: 'd', name: 'Próximo', date: '2026-11-22', time: '11:00' },
];
const p = (eventId, personKey, role) => ({ id: participationId(eventId, personKey), eventId, personKey, name: personKey.toUpperCase(), role, group: grupoDe(role) });

describe('participación', () => {
  it('agrupa los inscritos de un evento', () => {
    const g = inscritosPorGrupo([p('a', 'ana', 'Coro'), p('a', 'luis', 'Bajo'), p('b', 'eva', 'Sonido')], 'a');
    expect(g.map((x) => [x.id, x.personas.map((y) => y.personKey)])).toEqual([
      ['instrumentos', ['luis']], ['voces', ['ana']], ['multimedia', []], ['otros', []],
    ]);
  });
  it('cuenta solo los últimos 3 meses y eventos ya realizados', () => {
    const h = historial([
      p('a', 'ana', 'Coro'), p('b', 'ana', 'Voz principal'), p('c', 'ana', 'Coro'), p('d', 'ana', 'Coro'),
      p('a', 'luis', 'Bajo'), p('borrado', 'luis', 'Bajo'),
    ], events, now);
    expect(h.map((x) => [x.key, x.count, x.lastDate])).toEqual([['ana', 2, '2026-11-15'], ['luis', 1, '2026-11-15']]);
    expect(h[0].roles).toEqual({ Coro: 1, 'Voz principal': 1 });
  });
});

import { eventLines, isSongItem } from './evento.js';
describe('partes del evento', () => {
  it('mezcla canciones y partes de texto', () => {
    const ev = { items: [{ type: 'text', label: 'Oración' }, { songId: 's1' }, { songId: 'borrada' }, { type: 'song', songId: 's1' }] };
    const r = eventLines(ev, [{ id: 's1', title: 'A' }]);
    expect(r.map((x) => (x.song ? x.song.title : x.item.label))).toEqual(['Oración', 'A', 'A']);
    expect(isSongItem({ songId: 'x' })).toBe(true);
  });
});

describe('iniciales', () => {
  it('toma nombre y apellido', () => {
    expect(iniciales('Leo Riquelme')).toBe('LR');
    expect(iniciales('ana maría soto')).toBe('AS');
    expect(iniciales('Dora')).toBe('DO');
    expect(grupoDe('Danza')).toBe('otros');
    expect(colorDe('ana')).toBe(colorDe('ana'));
  });
});

import { alternarNota, notasPorSeccion } from './notas.js';
describe('notas de canción', () => {
  it('agrega, quita y agrupa por sección', () => {
    let l = alternarNota([], 'CORO 1', 'suave');
    l = alternarNota(l, 'VERSO 1', 'fuerte');
    expect(l).toHaveLength(2);
    l = alternarNota(l, 'CORO 1', 'suave');
    expect(l).toEqual([{ section: 'VERSO 1', note: 'fuerte' }]);
    expect(notasPorSeccion([{ section: 'CORO 1', note: 'pausa' }, { section: 'X', note: 'nada' }], l))
      .toEqual({ 'CORO 1': [{ id: 'pausa', mine: false }], 'VERSO 1': [{ id: 'fuerte', mine: true }] });
  });
});

import { VERSICULOS, versiculoDelDia } from '../data/versiculos.js';
describe('versículo del día', () => {
  it('cambia de un día a otro y siempre existe', () => {
    const a = versiculoDelDia(new Date(2026, 10, 19, 8));
    const b = versiculoDelDia(new Date(2026, 10, 19, 23));
    const c = versiculoDelDia(new Date(2026, 10, 20, 1));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    for (let d = 0; d < 400; d++) expect(VERSICULOS).toContain(versiculoDelDia(new Date(2026, 0, 1 + d)));
  });
});

import { cabeOtroFuturo, pasadosVisibles, sePuedeEditar } from './limitesEventos.js';
describe('límites de eventos', () => {
  const ahora = new Date(2026, 10, 19, 12, 0);
  it('máximo 10 próximos', () => {
    const ev = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, date: '2026-12-01' }));
    expect(cabeOtroFuturo(ev, undefined, '2026-11-19')).toBe(false);
    expect(cabeOtroFuturo(ev, 'e3', '2026-11-19')).toBe(true);
    expect(cabeOtroFuturo([...ev.slice(1), { id: 'v', date: '2026-01-01' }], undefined, '2026-11-19')).toBe(true);
  });
  it('pasados: solo los últimos 3 meses', () => {
    const v = pasadosVisibles([{ date: '2026-11-18' }, { date: '2026-08-20' }, { date: '2026-08-18' }, { date: '2026-11-19' }], ahora);
    expect(v.map((e) => e.date)).toEqual(['2026-11-18', '2026-08-20']);
  });
  it('editar un pasado: hasta 72 horas después', () => {
    expect(sePuedeEditar({ date: '2026-11-17', time: '11:00' }, ahora)).toBe(true);
    expect(sePuedeEditar({ date: '2026-11-16', time: '11:00' }, ahora)).toBe(false);
    expect(sePuedeEditar({ date: '2026-12-01' }, ahora)).toBe(true);
  });
});
