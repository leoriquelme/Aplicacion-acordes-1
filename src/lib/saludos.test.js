import { describe, expect, it } from 'vitest';
import { linkWhatsApp, numeroWhatsApp, proximosAniversarios, saludoCumple } from './saludos.js';

describe('saludos', () => {
  it('normaliza celulares chilenos', () => {
    expect(numeroWhatsApp('+56 9 1111 2222')).toBe('56911112222');
    expect(numeroWhatsApp('9 1111 2222')).toBe('56911112222');
    expect(numeroWhatsApp('11112222')).toBe('56911112222');
    expect(numeroWhatsApp('123')).toBe('');
    expect(linkWhatsApp('', 'Hola')).toBe('https://wa.me/?text=Hola');
  });
  it('aniversarios: la pareja sale junta', () => {
    const hoy = new Date(2026, 10, 26);
    const people = [
      { key: 'a', nombre: 'Juan', familiaId: 'f1', aniversarioMD: '11-28' },
      { key: 'b', name: 'María José', familiaId: 'f1', aniversarioMD: '11-28' },
      { key: 'c', name: 'Pedro', aniversarioMD: '12-20' },
      { key: 'd', name: 'Rosa', aniversarioMD: '11-26', estado: 'inactivo' },
    ];
    expect(proximosAniversarios(people, hoy).map((x) => [x.nombres, x.dias])).toEqual([['Juan y María', 2]]);
  });
  it('saludo de cumpleaños con el primer nombre', () => {
    expect(saludoCumple({ name: 'Ana Pérez' }, 'IGLESIA')).toContain('¡Feliz cumpleaños, Ana!');
  });
});
