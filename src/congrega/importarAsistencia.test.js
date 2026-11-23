import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fechaExcel, leerXlsx } from './xlsx.js';
import { hojaCheckins, keyNueva, planAsistencia } from './importarAsistencia.js';

// Planilla ficticia con el mismo formato que exporta Planning Center Check-Ins.
const buf = readFileSync(new URL('./fixtures/asistencia-ejemplo.xlsx', import.meta.url));

describe('importar asistencia desde Excel', () => {
  it('lee las hojas, textos, fechas y verdadero/falso', async () => {
    const hojas = await leerXlsx(buf);
    expect(Object.keys(hojas)).toEqual(['Resumen', 'CheckIns']);
    expect(hojas.Resumen[0][0]).toBe('Asistencia & más');
    const c = hojaCheckins(hojas, fechaExcel);
    expect(c).toHaveLength(5);
    expect(c[0]).toEqual({ fecha: '2026-11-22', evento: 'Reunión de Adoración', nombre: 'Ana', apellido: 'Pérez Soto', tipo: 'Regular', clasificacion: 'Adulto', sinPerfil: false });
    expect(c[3].sinPerfil).toBe(true);
  });

  it('une con personas y eventos que ya existen, y no duplica', async () => {
    const c = hojaCheckins(await leerXlsx(buf), fechaExcel);
    const people = [{ key: 'u1', uid: 'u1', name: 'Ana Perez' }, { key: 'pco-2', nombre: 'Tomás', apellido: 'Pérez Soto' }];
    const events = [{ id: 'culto', name: 'Culto dominical', date: '2026-11-22' }];
    const plan = planAsistencia(c, people, events);
    expect(plan.eventos.map((e) => e.id).sort()).toEqual(['culto', 'pcoe-2026-11-18-reunion-de-oracion', 'pcoe-2026-11-22-escuela-dominical']);
    const porNombre = Object.fromEntries(plan.personas.map((p) => [p.nombre, p]));
    expect(porNombre.Ana.match).toEqual({ key: 'u1', motivo: 'nombre parecido' });
    expect(porNombre.Tomás.match).toEqual({ key: 'pco-2', motivo: 'mismo nombre' });
    expect(porNombre.Juan).toMatchObject({ match: null, visita: true });
    expect(keyNueva(porNombre.Juan)).toBe('pcoa-juan-nuevo');
    expect(plan.registros).toHaveLength(4); // Ana marcada dos veces en el culto cuenta una
  });

  it('no adivina si hay dos personas con el mismo nombre', () => {
    const plan = planAsistencia([{ fecha: '2026-01-04', evento: 'Reunión de Adoración', nombre: 'Ana', apellido: 'Pérez' }], [{ key: 'a', name: 'Ana Pérez' }, { key: 'b', name: 'Ana Pérez' }]);
    expect(plan.personas[0]).toMatchObject({ match: null, candidatos: ['a', 'b'] });
  });
});
