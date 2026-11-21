import { describe, expect, it } from 'vitest';
import { datosEnVivo, enVivoActivo, indiceCancion } from './envivo.js';

describe('en vivo', () => {
  it('solo está activo si está encendido y es reciente', () => {
    const ahora = 1_000_000_000;
    expect(enVivoActivo(null, ahora)).toBe(false);
    expect(enVivoActivo({ active: true, eventId: 'e', at: ahora - 60_000 }, ahora)).toBe(true);
    expect(enVivoActivo({ active: false, eventId: 'e', at: ahora }, ahora)).toBe(false);
    expect(enVivoActivo({ active: true, eventId: 'e', at: ahora - 4 * 3600_000 }, ahora)).toBe(false);
  });
  it('busca la canción por id y si no por número', () => {
    const items = [{ song: { id: 'a' } }, { song: { id: 'b' } }, { song: { id: 'c' } }];
    expect(indiceCancion(items, { songId: 'c', song: 0 })).toBe(2);
    expect(indiceCancion(items, { songId: 'x', song: 1 })).toBe(1);
    expect(indiceCancion(items, { songId: 'x', song: 9 })).toBe(2);
  });
  it('arma datos limpios', () => {
    const d = datosEnVivo({ eventId: 'e1', songId: 's', song: 1.7, section: -2, by: 'u', byName: 'Leo' });
    expect(d).toMatchObject({ eventId: 'e1', songId: 's', song: 1, section: 0, by: 'u', byName: 'Leo', active: true });
    expect(typeof d.at).toBe('number');
  });
});
