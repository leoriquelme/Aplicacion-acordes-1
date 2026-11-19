import { describe, expect, it } from 'vitest';
import { grupoDe, historial, inscritosPorGrupo, participationId } from './participacion.js';

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
      ['instrumentos', ['luis']], ['voces', ['ana']], ['multimedia', []],
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
