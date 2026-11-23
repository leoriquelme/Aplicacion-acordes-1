import { describe, expect, it } from 'vitest';
import { consejosPara, novedadesPara, numeroDelDia } from './consejos.js';

const base = { mode: 'cloud', can: { edit: false, events: false, users: false }, birthDate: '', photo: '', tema: 'auto', instalada: false, eventosProximos: 1 };
const ids = (ctx, ocultos) => consejosPara(ctx, ocultos).map((c) => c.id);

describe('consejos', () => {
  it('pide la fecha de nacimiento solo si falta', () => {
    expect(ids(base)).toContain('cumple');
    expect(ids({ ...base, birthDate: '1990-03-14' })).not.toContain('cumple');
  });
  it('esconde lo que ya hiciste', () => {
    const r = ids({ ...base, photo: 'x', instalada: true, tema: 'oscuro' });
    expect(r).not.toContain('foto');
    expect(r).not.toContain('instalar');
    expect(r).not.toContain('oscuro');
  });
  it('invitar y proponer solo para quien puede', () => {
    expect(ids(base)).not.toContain('invitar');
    expect(ids(base)).not.toContain('proponer');
    expect(ids(base)).toContain('servir');
    const admin = ids({ ...base, can: { edit: true, events: true, users: true } });
    expect(admin).toContain('invitar');
    expect(admin).toContain('proponer');
    expect(admin).not.toContain('servir');
  });
  it('respeta los consejos escondidos', () => {
    expect(ids(base, ['biblioteca'])).not.toContain('biblioteca');
  });
  it('sin iglesia no sale nada de la iglesia', () => {
    const r = ids({ ...base, mode: 'personal' });
    expect(r).not.toContain('cumple');
    expect(r).toContain('biblioteca');
  });
  it('el número del día cambia de un día a otro', () => {
    expect(numeroDelDia(new Date(2026, 10, 24)) - numeroDelDia(new Date(2026, 10, 23))).toBe(1);
  });
  it('las novedades salen solo las 2 semanas siguientes y se pueden esconder', () => {
    const lista = [{ id: 'a', fecha: '2026-11-23' }, { id: 'b', fecha: '2026-11-25' }];
    expect(novedadesPara('2026-11-22', [], lista)).toEqual([]);
    expect(novedadesPara('2026-11-25', [], lista).map((n) => n.id)).toEqual(['b', 'a']);
    expect(novedadesPara('2026-12-07', [], lista).map((n) => n.id)).toEqual(['b']);
    expect(novedadesPara('2026-11-25', ['b'], lista).map((n) => n.id)).toEqual(['a']);
  });
});
