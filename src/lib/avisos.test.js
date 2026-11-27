import { describe, expect, it } from 'vitest';
import { avisoParaGuardar, avisosVigentes, masDias, textoAviso } from './avisos.js';

describe('avisos', () => {
  it('muestra solo los vigentes, fijados primero', () => {
    const l = [
      { id: 'a', titulo: 'Viejo', hasta: '2026-11-20', at: 5 },
      { id: 'b', titulo: 'Nuevo', hasta: '2026-12-01', at: 3 },
      { id: 'c', titulo: 'Fijo', hasta: '2026-11-26', at: 1, fijado: true },
      { id: 'd', titulo: 'Más nuevo', hasta: '2026-12-01', at: 4 },
    ];
    expect(avisosVigentes(l, '2026-11-26').map((a) => a.id)).toEqual(['c', 'd', 'b']);
  });
  it('limpia lo que se guarda', () => {
    expect(avisoParaGuardar({ titulo: '  Cena   de Navidad ', texto: 'x', hasta: '2026-12-24' }, 'Ana', 9))
      .toEqual({ titulo: 'Cena de Navidad', texto: 'x', hasta: '2026-12-24', fijado: false, por: 'Ana', at: 9 });
    expect(() => avisoParaGuardar({ titulo: '', hasta: '2026-12-24' })).toThrow();
    expect(() => avisoParaGuardar({ titulo: 'a', hasta: '' })).toThrow();
  });
  it('fechas y texto', () => {
    expect(masDias('2026-12-28', 7)).toBe('2027-01-04');
    expect(textoAviso({ titulo: 'Hola', texto: 'Mundo' }, 'IGLESIA')).toBe('📢 IGLESIA: Hola\n\nMundo');
  });
});
