import { describe, expect, it } from 'vitest';
import { proximas } from './Inicio.jsx';

describe('ventanas de cumpleaños y aniversarios del Inicio', () => {
  const hoy = new Date(2026, 11, 31); // 31 de diciembre
  const l = (fecha) => [{ fecha }];
  it('incluye ayer y hasta N días después, también al cambiar de año', () => {
    expect(proximas(l('1990-12-30'), 7, hoy, 1)[0]).toMatchObject({ diff: -1, anos: 36 });
    expect(proximas(l('1990-12-29'), 7, hoy, 1)).toEqual([]);
    expect(proximas(l('2000-01-07'), 7, hoy, 1)[0]).toMatchObject({ diff: 7, anos: 27 });
    expect(proximas(l('2000-01-08'), 7, hoy, 1)).toEqual([]);
    expect(proximas(l('01-15'), 15, hoy, 1)[0].diff).toBe(15);
  });
  it('ayer funciona el 1 de enero', () => {
    expect(proximas(l('1980-12-31'), 7, new Date(2027, 0, 1), 1)[0]).toMatchObject({ diff: -1, anos: 46 });
  });
});
