import { describe, expect, it } from 'vitest';
import { cuantosOran, ordenarPeticiones, peticionNueva, vigente } from './oracion.js';

const DIA = 86400000;
const ahora = 100 * DIA;

describe('oración', () => {
  it('por defecto la ven solo los pastores', () => {
    expect(peticionNueva({ texto: ' Salud de mi mamá ' }, { uid: 'u', nombre: 'Juan' }, 5))
      .toEqual({ texto: 'Salud de mi mamá', para: 'pastores', estado: 'activa', autorUid: 'u', autor: 'Juan', at: 5, orando: {} });
    expect(peticionNueva({ texto: 'x', para: 'iglesia' }, { uid: 'u' }).para).toBe('iglesia');
    expect(() => peticionNueva({ texto: '  ' }, { uid: 'u' })).toThrow();
  });
  it('vigencia: 30 días activa, 14 más si fue respondida', () => {
    expect(vigente({ at: ahora - 29 * DIA }, ahora)).toBe(true);
    expect(vigente({ at: ahora - 31 * DIA }, ahora)).toBe(false);
    expect(vigente({ at: ahora - 40 * DIA, estado: 'respondida' }, ahora)).toBe(true);
  });
  it('junta sin repetir, activas primero', () => {
    const a = { id: 'a', at: ahora - DIA }; const b = { id: 'b', at: ahora, estado: 'respondida' }; const c = { id: 'c', at: ahora - 2 * DIA };
    expect(ordenarPeticiones([[a, b], [a, c]], ahora).map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
  it('cuenta quiénes oran', () => expect(cuantosOran({ orando: { x: true, y: true, z: false } })).toBe(2));
});
