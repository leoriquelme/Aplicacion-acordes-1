import { describe, expect, it } from 'vitest';
import { armarCumple, cumpleValido, diasParaCumple, formatoCumple, proximosCumples, textoCumple } from './cumpleanos.js';

const hoy = new Date(2026, 10, 23); // 23 de noviembre de 2026

describe('cumpleaños', () => {
  it('valida y arma el día y mes', () => {
    expect(cumpleValido('03-14')).toBe(true);
    expect(cumpleValido('02-29')).toBe(true);
    expect(cumpleValido('02-30')).toBe(false);
    expect(cumpleValido('13-01')).toBe(false);
    expect(cumpleValido('1990-03-14')).toBe(false);
    expect(armarCumple(5, 3)).toBe('03-05');
    expect(armarCumple(31, 4)).toBe('');
    expect(formatoCumple('03-05')).toBe('5 de marzo');
  });

  it('cuenta los días que faltan, pasando de año', () => {
    expect(diasParaCumple('11-23', hoy)).toBe(0);
    expect(diasParaCumple('11-30', hoy)).toBe(7);
    expect(diasParaCumple('11-22', hoy)).toBe(364);
    expect(diasParaCumple('01-01', new Date(2026, 11, 28))).toBe(4);
    expect(diasParaCumple('02-29', new Date(2027, 1, 20))).toBe(8); // 2027 no es bisiesto: el 28
    expect(diasParaCumple('', hoy)).toBe(null);
  });

  it('muestra solo hoy y los próximos 7 días, en orden', () => {
    const people = [
      { name: 'Luis', birthday: '12-01' },
      { name: 'Ana', birthday: '11-26' },
      { name: 'Eva', birthday: '11-23' },
      { name: 'Sin fecha' },
      { name: 'Pasó', birthday: '11-20' },
    ];
    expect(proximosCumples(people, hoy).map(({ persona, dias }) => `${persona.name}:${dias}`)).toEqual(['Eva:0', 'Ana:3']);
  });

  it('arma el texto del aviso', () => {
    expect(textoCumple('Ana', 0)).toBe('¡Hoy está de cumpleaños Ana!');
    expect(textoCumple('Ana', 1)).toBe('Mañana está de cumpleaños Ana');
    expect(textoCumple('Ana', 5)).toBe('Cumpleaños de Ana en 5 días');
  });
});

describe('fecha de nacimiento', () => {
  it('valida y saca solo el día y mes', async () => {
    const { nacimientoValido, cumpleDeNacimiento, formatoNacimiento } = await import('./cumpleanos.js');
    expect(nacimientoValido('1990-03-14', hoy)).toBe(true);
    expect(nacimientoValido('1991-02-29', hoy)).toBe(false);
    expect(nacimientoValido('2030-01-01', hoy)).toBe(false);
    expect(nacimientoValido('14-03-1990', hoy)).toBe(false);
    expect(cumpleDeNacimiento('1990-03-14')).toBe('03-14');
    expect(formatoNacimiento('1990-03-14')).toBe('14 de marzo de 1990');
  });
});
