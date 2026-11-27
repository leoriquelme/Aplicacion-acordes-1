import { describe, expect, it } from 'vitest';
import { datosPublicos, lineasPublicas, mismaMusica, proximoCulto, repertorio, ultimoCulto } from './musica.js';

const songs = [
  { id: 'a', title: 'Alaba', spotify: 'https://open.spotify.com/track/1234567890abcdef', content: '[C]Letra secreta' },
  { id: 'b', title: 'Bendito', youtube: 'https://youtu.be/dQw4w9WgXcQ', author: 'X' },
  { id: 'c', title: 'Cristo' },
];
const ev = (id, date, ids, extra = {}) => ({ id, date, time: '11:00', name: 'Servicio de Adoración', items: ids.map((songId) => ({ songId })), ...extra });
const now = new Date(2026, 10, 26, 12, 0); // jueves 26 nov 2026

describe('repertorio', () => {
  it('cuenta los eventos pasados de los últimos 90 días, de más a menos', () => {
    const events = [ev('1', '2026-11-22', ['a', 'b']), ev('2', '2026-11-15', ['a', 'a']), ev('3', '2026-06-01', ['c']), ev('4', '2026-11-29', ['c'])];
    const r = repertorio(songs, events, { now });
    expect(r.map((u) => [u.song.id, u.count])).toEqual([['a', 2], ['b', 1]]);
    expect(r[0].lastUsed).toBe('2026-11-22');
  });
  it('ignora canciones borradas', () => {
    expect(repertorio(songs, [ev('1', '2026-11-22', ['zz'])], { now })).toEqual([]);
  });
});

describe('proximoCulto / ultimoCulto', () => {
  const events = [ev('p', '2026-11-22', ['a']), ev('o', '2026-11-27', ['b'], { name: 'Reunión de oración' }), ev('d', '2026-11-29', ['a', 'c']), ev('v', '2026-12-06', [])];
  it('prefiere el culto dominical de la semana', () => {
    expect(proximoCulto(events, songs, now).event.id).toBe('d');
  });
  it('sin culto, el próximo con canciones', () => {
    expect(proximoCulto(events.filter((e) => e.id !== 'd'), songs, now).event.id).toBe('o');
  });
  it('el evento de hoy cuenta hasta el final del día', () => {
    expect(proximoCulto([ev('h', '2026-11-26', ['a'], { time: '09:00' })], songs, now).event.id).toBe('h');
  });
  it('null si no hay nada', () => expect(proximoCulto([], songs, now)).toBe(null));
  it('último realizado', () => expect(ultimoCulto(events, songs, now).event.id).toBe('p'));
});

describe('datosPublicos', () => {
  it('no publica letras, solo títulos y links', () => {
    const culto = proximoCulto([ev('d', '2026-11-29', ['a', 'b'])], songs, now);
    const d = datosPublicos({ churchName: 'IGLESIA', culto, repertorio: repertorio(songs, [ev('1', '2026-11-22', ['b'])], { now }) });
    expect(d.culto.canciones).toEqual([{ t: 'Alaba', sp: songs[0].spotify }, { t: 'Bendito', a: 'X', yt: songs[1].youtube }]);
    expect(JSON.stringify(d)).not.toContain('Letra secreta');
    expect(d.repertorio).toHaveLength(1);
    expect(lineasPublicas(d.culto.canciones)[1].song.youtube).toBe(songs[1].youtube);
  });
  it('mismaMusica ignora la fecha', () => {
    expect(mismaMusica({ a: 1, at: 1 }, { a: 1, at: 2 })).toBe(true);
    expect(mismaMusica({ a: 1 }, { a: 2 })).toBe(false);
    expect(mismaMusica({ x: { b: 1, a: [{ d: 1, c: 2 }] } }, { x: { a: [{ c: 2, d: 1 }], b: 1 }, at: 3 })).toBe(true);
  });
});
