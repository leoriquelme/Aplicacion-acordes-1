import { describe, expect, it } from 'vitest';
import { eventoNuevo, resumenPorTipo, tipoEvento, tipoSugerido } from './eventos.js';

describe('tipos de evento', () => {
  it('usa el tipo guardado o lo deduce del nombre', () => {
    expect(tipoEvento({ tipo: 'jovenes', name: 'Culto' })).toBe('jovenes');
    expect(tipoEvento({ name: 'Servicio de Adoración' })).toBe('culto');
    expect(tipoEvento({ name: 'Reunión de Oración' })).toBe('oracion');
    expect(tipoEvento({ name: 'Encuentro juvenil' })).toBe('jovenes');
    expect(tipoEvento({ name: 'Paseo de iglesia' })).toBe('otro');
    expect(tipoEvento({})).toBe('culto');
  });
  it('sugiere culto el domingo y oración otro día', () => {
    expect(tipoSugerido('2026-11-29')).toBe('culto');
    expect(tipoSugerido('2026-11-25')).toBe('oracion');
  });
  it('arma el evento nuevo con nombre por defecto', () => {
    expect(eventoNuevo({ tipo: 'oracion', nombre: ' ', fecha: '2026-11-25' })).toEqual({ name: 'Reunión de oración', tipo: 'oracion', date: '2026-11-25', time: '', items: [] });
    expect(eventoNuevo({ tipo: 'otro', nombre: '', fecha: '2026-11-25' }).name).toBe('Evento');
    expect(eventoNuevo({ tipo: 'culto', nombre: 'Santa Cena', fecha: '2026-11-29' }).name).toBe('Santa Cena');
  });
  it('resume promedio por tipo solo con eventos con registro', () => {
    const evs = [{ id: 'a', name: 'Servicio de Adoración' }, { id: 'b', tipo: 'culto' }, { id: 'c', tipo: 'oracion' }, { id: 'd', tipo: 'jovenes' }];
    const conteo = new Map([['a', 40], ['b', 50], ['c', 12]]);
    expect(resumenPorTipo(evs, conteo)).toEqual([
      { k: 'culto', label: 'Culto dominical', eventos: 2, total: 90, max: 50, promedio: 45 },
      { k: 'oracion', label: 'Día de oración', eventos: 1, total: 12, max: 12, promedio: 12 },
    ]);
  });
});
