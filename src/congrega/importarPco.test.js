import { describe, expect, it } from 'vitest';
import { esExportPco, filaPco, parseCsv } from './importarPco.js';

const CSV = [
  'Person ID,First Name,Last Name,Nickname,Middle Name,Birthdate,Anniversary,Gender,Child,Marital Status,Status,Membership,Inactive Reason,Inactive Date,Medical Notes,Home Address Street Line 1,Home Address Street Line 2,Home Address City,Home Address State,Mobile Phone Number,Home Email,Work Email,Household ID,Household Name,Household Primary Contact,Extras PSG :: Rango edad,Extras PSG :: Miembro,Extras PSG :: Bautizado,Extras PSG :: Fecha de conversión,Extras PSG :: Ministerios,Created At',
  '101,Ana,Pérez Soto,,María,1980-03-14,2004-02-21,Female,false,Married,active,Ocacional,,,"Alergia, penicilina\nOtra línea",Av. Siempre Viva 1,;,Maipú;,Metropolitana de Santiago,9 1111 2222;9 3333 4444,ana@ejemplo.cl,,h1,Pérez Soto,TRUE,Adulto,true,true,,"Mutimedia, Varones",2024-01-02 10:00:00 pm',
  '102,Tomás,Pérez Soto,,,2016-05-27,,Male,true,,inactive,,Deceased,2026-01-01,,,,,,,,,h1,Pérez Soto,,Niño,,,,,2024-01-02 10:00:00 pm',
].join('\n');

describe('importar desde Planning Center', () => {
  const filas = parseCsv(CSV);
  it('lee comillas, comas y saltos de línea dentro de un campo', () => {
    expect(filas).toHaveLength(2);
    expect(esExportPco(filas)).toBe(true);
    expect(filas[0]['Medical Notes']).toBe('Alergia, penicilina\nOtra línea');
  });
  it('arma la ficha visible y la privada con ids estables', () => {
    const a = filaPco(filas[0]);
    expect(a.key).toBe('pco-101');
    expect(a.familia).toEqual({ id: 'pcoh-h1', name: 'Pérez Soto' });
    expect(a.persona).toMatchObject({ name: 'Ana Pérez Soto', tipo: 'Ocasional', miembro: true, teams: ['Multimedia', 'Varones'], rolFamilia: 'Contacto principal', birthday: '03-14', uid: '' });
    expect(a.ficha).toMatchObject({ telefono: '9 1111 2222, 9 3333 4444', comuna: 'Maipú', region: 'Región Metropolitana', estadoCivil: 'Casado/a', direccion: 'Av. Siempre Viva 1' });
    expect(a.ficha.notasMedicas).toBeUndefined();
    expect(filaPco(filas[0], { conNotasMedicas: true }).ficha.notasMedicas).toContain('penicilina');
  });
  it('niños e inactivos', () => {
    const t = filaPco(filas[1]);
    expect(t.persona).toMatchObject({ esNino: true, estado: 'inactivo', rolFamilia: 'Hijo/a' });
    expect(t.ficha.motivoInactivo).toBe('Fallecido/a');
  });
});

import { buscarCoincidencias, fusionarDatos } from './importarPco.js';
describe('coincidencias al importar', () => {
  const filas = parseCsv(CSV).map((r) => filaPco(r));
  it('encuentra por nombre (con o sin segundo apellido y tildes), correo o celular', () => {
    const people = [{ key: 'uidAna', uid: 'uidAna', name: 'Ana Perez' }, { key: 'x', name: 'Tomás Pérez Soto' }];
    let m = buscarCoincidencias(filas, people);
    expect(m.get('pco-101')).toEqual({ key: 'uidAna', motivo: 'mismo nombre' });
    expect(m.get('pco-102')).toEqual({ key: 'x', motivo: 'mismo nombre' });
    m = buscarCoincidencias(filas, [{ key: 'k1', name: 'Otra' }], new Map([['k1', { telefono: '+56 9 3333 4444' }]]));
    expect(m.get('pco-101')).toEqual({ key: 'k1', motivo: 'mismo celular' });
    m = buscarCoincidencias(filas, [{ key: 'k2', name: 'Otra' }], new Map([['k2', { email: 'ANA@ejemplo.cl ' }]]));
    expect(m.get('pco-101').motivo).toBe('mismo correo');
  });
  it('no sugiere si el nombre es ambiguo o si la persona ya fue importada antes', () => {
    expect(buscarCoincidencias(filas, [{ key: 'a', name: 'Ana Pérez' }, { key: 'b', name: 'Ana Pérez' }]).has('pco-101')).toBe(false);
    expect(buscarCoincidencias(filas, [{ key: 'pco-101', name: 'Ana Pérez Soto' }]).size).toBe(0);
  });
  it('reconoce a quien ya se fusionó en una importación anterior', () => {
    expect(buscarCoincidencias(filas, [{ key: 'uidAna', uid: 'uidAna', name: 'Anita', pcoId: '101' }]).get('pco-101').motivo).toBe('mismo registro de Planning Center');
  });
  it('fusionar suma equipos, no borra datos y respeta el nombre de quien tiene cuenta', () => {
    const r = fusionarDatos({ uid: 'u', name: 'Anita', teams: ['Adoración'], photo: 'x' }, { name: 'Ana Pérez', teams: ['Multimedia'], apodo: '', tipo: 'Activo' });
    expect(r).toEqual({ uid: 'u', name: 'Anita', teams: ['Adoración', 'Multimedia'], photo: 'x', tipo: 'Activo' });
  });
});
