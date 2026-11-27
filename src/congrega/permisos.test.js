import { describe, expect, it } from 'vitest';
import { permisosDe, pestanasCongrega, puedeCambiarPerfil } from './permisos.js';

describe('permisos por perfil', () => {
  it('Administrador: todo', () => {
    const p = permisosDe({ role: 'admin', esDueno: true });
    expect(p).toMatchObject({ dueno: true, admin: true, pastor: true, asisAdmin: true, marca: true, soloHoy: false, verPrivado: true });
    expect(pestanasCongrega(p)).toEqual(['inicio', 'asistencia', 'estacion', 'personas', 'ajustes']);
  });
  it('Pastor: fichas privadas y reportes, sin marcar ni ajustes', () => {
    const p = permisosDe({ role: 'colaborador', perfiles: ['pastor'] });
    expect(p).toMatchObject({ admin: false, pastor: true, marca: false, verPrivado: true, verAsistencia: true });
    expect(pestanasCongrega(p)).toEqual(['inicio', 'personas', 'ajustes']);
  });
  it('Director musical: solo nombres en Congrega', () => {
    const p = permisosDe({ role: 'director' });
    expect(p).toMatchObject({ verPersonas: true, verPrivado: false, marca: false });
  });
  it('Encargado de asistencia (equipo de estación): solo estación y su ficha', () => {
    const p = permisosDe({ role: 'miembro', enEquipo: true });
    expect(p).toMatchObject({ marca: true, soloHoy: true, verPersonas: false, verPrivado: false });
    expect(pestanasCongrega(p)).toEqual(['inicio', 'estacion', 'oracion', 'mificha', 'ajustes']);
  });
  it('Administrativo de asistencia: asistencia completa', () => {
    const p = permisosDe({ role: 'colaborador', perfiles: ['asisAdmin'] });
    expect(p).toMatchObject({ asisAdmin: true, marca: true, soloHoy: false, verPrivado: false });
  });
  it('Miembro y Colaborador: Inicio del hermano y su ficha', () => {
    expect(pestanasCongrega(permisosDe({ role: 'miembro' }))).toEqual(['inicio', 'agenda', 'oracion', 'mificha', 'ajustes']);
    expect(pestanasCongrega(permisosDe({ role: 'colaborador' }))).toEqual(['inicio', 'agenda', 'oracion', 'mificha', 'ajustes']);
  });
  it('solo el Súper admin cambia Administradores; al Súper admin nadie', () => {
    const admin = permisosDe({ role: 'admin' }); const dueno = permisosDe({ role: 'admin', esDueno: true });
    expect(puedeCambiarPerfil(admin, { role: 'admin' })).toBe(false);
    expect(puedeCambiarPerfil(dueno, { role: 'admin' })).toBe(true);
    expect(puedeCambiarPerfil(dueno, { role: 'admin', esDueno: true })).toBe(false);
    expect(puedeCambiarPerfil(admin, { role: 'colaborador' })).toBe(true);
    expect(puedeCambiarPerfil(permisosDe({ role: 'director' }), { role: 'colaborador' })).toBe(false);
  });
});
