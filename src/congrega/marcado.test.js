import { describe, expect, it } from 'vitest';
import { marcadoDe, resumenJornada } from './marcado.js';

const people = [
  { key: 'a', nombre: 'Ana', familiaId: 'f' }, { key: 'b', nombre: 'Beto', familiaId: 'f' },
  { key: 'c', nombre: 'Coni', familiaId: 'f', estado: 'inactivo' }, { key: 'v', nombre: 'Vale', tipo: 'Visita' },
];
const asis = (eventId, personKey, date, tipo) => [`${eventId}__${personKey}`, { eventId, personKey, date, tipo }];

describe('marcar asistencia', () => {
  it('la familia muestra solo a los activos y sin la persona', () => {
    const m = marcadoDe({ people, asistencia: new Map(), marcar: async () => {} }, { id: 'e', date: '2026-11-22' });
    expect(m.familiaDe(people[0]).map((p) => p.key)).toEqual(['b']);
    expect(m.tipoDe(people[3])).toBe('visita');
  });
  it('resume la última jornada sin contar dos veces a quien vino a dos eventos', () => {
    const asistencia = new Map([
      asis('e1', 'a', '2026-11-15', 'regular'),
      asis('e2', 'a', '2026-11-22', 'regular'), asis('e3', 'a', '2026-11-22', 'colaborador'),
      asis('e2', 'b', '2026-11-22'), asis('e2', 'v', '2026-11-22', 'visita'),
      asis('e9', 'b', '2026-12-01'),
    ]);
    const r = resumenJornada([{ id: 'e2', name: 'Culto' }, { id: 'e3', name: 'Escuela' }], asistencia, people, '2026-11-30');
    expect(r).toMatchObject({ fecha: '2026-11-22', personas: 3, colaborador: 1, regular: 1, visita: 1, primeraVez: 2 });
    expect(r.eventos.map((x) => x.n)).toEqual([3, 1]);
  });
});

describe('cumpleaños y aniversarios en la estación', () => {
  it('avisa hoy, mañana, en la semana y lo que pasó hace poco', async () => {
    const { celebraciones, diasHasta } = await import('./marcado.js');
    const hoy = '2026-11-29'; // domingo
    expect(diasHasta('11-30', hoy)).toBe(1);
    expect(diasHasta('01-02', '2026-12-30')).toBe(3);
    expect(celebraciones({ birthday: '11-29' }, hoy)[0].texto).toBe('¡Hoy está de cumpleaños!');
    expect(celebraciones({ birthday: '11-30' }, hoy)[0].texto).toBe('Está de cumpleaños mañana');
    expect(celebraciones({ birthday: '12-03' }, hoy)[0].texto).toBe('Está de cumpleaños el jueves');
    expect(celebraciones({ aniversarioMD: '11-26' }, hoy)[0].texto).toBe('Estuvo de aniversario el jueves pasado');
    expect(celebraciones({ birthday: '12-25' }, hoy)).toEqual([]);
    expect(celebraciones({}, hoy)).toEqual([]);
  });
});
