import { describe, expect, it } from 'vitest';
import { claveDuplicado, gruposDuplicados, ordenarUnion, personaUnida, tipoPorDefecto } from './unir.js';
import { buscarCoincidencias } from './importarPco.js';

describe('personas repetidas', () => {
  const a = { key: 'pco-1', nombre: 'Juan', apellido: 'Olivares Neira', pcoId: '1', teams: ['Varones'], familiaId: 'f1', uid: '' };
  const b = { key: 'pcoa-juan-olivares', nombre: 'Juan', apellido: 'Olivares', tipo: 'Visita', uid: '' };
  const c = { key: 'uidJ', uid: 'uidJ', role: 'colaborador', name: 'Juan Olivares', teams: ['Multimedia'] };
  it('agrupa por primer nombre y primer apellido, sin tildes', () => {
    expect(claveDuplicado({ name: 'Juán Olivares' })).toBe('juan olivares');
    expect(gruposDuplicados([a, b, c, { key: 'x', name: 'Ana Rojas' }])).toHaveLength(1);
  });
  it('queda quien tiene cuenta; dos cuentas no se unen', () => {
    expect(ordenarUnion(a, c).map((x) => x.key)).toEqual(['uidJ', 'pco-1']);
    expect(ordenarUnion(c, { ...b, uid: 'otra' })).toBeNull();
  });
  it('une datos sin perder nada y recuerda el otro nombre y registro de Planning Center', () => {
    const u = personaUnida(c, a);
    expect(u).toMatchObject({ uid: 'uidJ', name: 'Juan Olivares', familiaId: 'f1', pcoId: '1', otrosNombres: ['Juan Olivares Neira'] });
    expect(u.teams).toEqual(['Multimedia', 'Varones']);
    expect(u.key).toBeUndefined();
    const v = personaUnida(a, { ...b, pcoId: '9' });
    expect(v).toMatchObject({ pcoId: '1', otrosPcoIds: ['9'], tipo: 'Visita', apellido: 'Olivares Neira' });
    // Al importar otra vez el CSV, la fila 9 se reconoce como la misma persona.
    const fila = { key: 'pco-9', persona: { pcoId: '9', name: 'Juan O' }, ficha: {} };
    expect(buscarCoincidencias([fila], [{ key: 'pco-1', ...v }]).get('pco-9').key).toBe('pco-1');
  });
});

describe('tipo de asistencia por defecto', () => {
  it('colaborador si sirve; visita las 3 primeras veces; regular desde la cuarta', () => {
    const nuevo = { tipo: 'Visita' };
    expect(tipoPorDefecto(nuevo, { sirve: true })).toBe('colaborador');
    expect(tipoPorDefecto(nuevo, { anteriores: 0 })).toBe('visita');
    expect(tipoPorDefecto(nuevo, { anteriores: 2 })).toBe('visita');
    expect(tipoPorDefecto(nuevo, { anteriores: 3 })).toBe('regular');
    expect(tipoPorDefecto({ miembro: true }, { anteriores: 0 })).toBe('regular');
  });
});

describe('unir: lo mejor de cada perfil', () => {
  it('completa lo que falta y elige el texto más completo', async () => {
    const { compararPerfiles, valorMejor } = await import('./unir.js');
    expect(valorMejor('Juan', 'Juan Andrés')).toBe('Juan Andrés');
    expect(valorMejor('', '9 1234')).toBe('9 1234');
    expect(valorMejor('2020-01-01', '2021-02-02')).toBe('2020-01-01');
    const r = compararPerfiles({ nombre: 'Juan', apellido: 'Pérez', uid: 'g' }, { nombre: 'Juan', apellido: 'Pérez Soto', tipo: 'Regular' }, { telefono: '' }, { telefono: '9 1111 2222', email: 'j@x.cl' });
    const por = Object.fromEntries(r.map((x) => [x.campo, x]));
    expect(por.nombre.estado).toBe('igual');
    expect(por.apellido).toMatchObject({ estado: 'distinto', elegido: 'Pérez Soto' });
    expect(por.tipo).toMatchObject({ estado: 'soloB', elegido: 'Regular' });
    expect(por.telefono).toMatchObject({ estado: 'soloB', elegido: '9 1111 2222' });
  });
});
