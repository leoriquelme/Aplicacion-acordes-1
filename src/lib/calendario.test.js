import { describe, expect, it } from 'vitest';
import { agendaPorMes, linkGoogle } from './calendario.js';
import { eventoICS } from './recordatorio.js';

const ev = { id: 'culto-dominical-2026-11-29', name: 'Servicio de Adoración', date: '2026-11-29', time: '11:45' };

describe('calendario', () => {
  it('el .ics trae hora local y avisos', () => {
    const t = eventoICS(ev, new Date(2026, 10, 26, 10, 0));
    expect(t).toContain('DTSTART:20261129T114500');
    expect(t).toContain('TRIGGER:-PT1H');
  });
  it('link de Google sin hora: todo el día', () => {
    expect(linkGoogle({ id: 'x', name: 'Retiro', date: '2026-12-31' })).toContain('dates=20261231%2F20270101');
  });
  it('link de Google', () => {
    expect(linkGoogle(ev)).toContain('dates=20261129T114500%2F20261129T134500');
  });
  it('agrupa por mes desde hoy', () => {
    const g = agendaPorMes([ev, { id: 'a', date: '2026-12-06' }, { id: 'v', date: '2026-11-01' }, { id: 'b', date: '2026-12-02', time: '19:30' }], '2026-11-26');
    expect(g.map((x) => [x.k, x.eventos.map((e) => e.id)])).toEqual([['2026-11', ['culto-dominical-2026-11-29']], ['2026-12', ['b', 'a']]]);
  });
});
