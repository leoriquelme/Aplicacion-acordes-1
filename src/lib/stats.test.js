import { describe, expect, it } from 'vitest';
import { leastUsed, mostUsed, songUsage } from './stats.js';

const songs = [
  { id: 'a', title: 'A' },
  { id: 'b', title: 'B' },
  { id: 'c', title: 'C' },
];
const now = new Date(2026, 10, 18, 12, 0); // 18 nov 2026, 12:00

describe('songUsage', () => {
  const events = [
    { date: '2026-11-15', time: '11:00', items: [{ songId: 'a' }, { songId: 'b' }, { songId: 'a' }] },
    { date: '2026-10-01', time: '11:00', items: [{ songId: 'a' }] },
    { date: '2025-06-01', time: '11:00', items: [{ songId: 'b' }] }, // hace más de un año
    { date: '2026-11-18', time: '19:00', items: [{ songId: 'c' }] }, // hoy, pero aún no ocurre
    { date: '2026-11-18', time: '10:00', items: [{ songId: 'b' }] }, // hoy, ya ocurrió
  ];
  const usage = Object.fromEntries(songUsage(songs, events, now).map((u) => [u.song.id, u]));

  it('cuenta una vez por evento y solo eventos ya realizados del último año', () => {
    expect(usage.a.count).toBe(2);
    expect(usage.b.count).toBe(2);
    expect(usage.c.count).toBe(0);
  });
  it('guarda la última fecha de uso', () => {
    expect(usage.a.lastUsed).toBe('2026-11-15');
    expect(usage.b.lastUsed).toBe('2026-11-18');
    expect(usage.c.lastUsed).toBe(null);
  });
  it('ordena más y menos usadas', () => {
    const list = Object.values(usage);
    expect(mostUsed(list).map((u) => u.song.id)).toEqual(['b', 'a', 'c']);
    expect(leastUsed(list).map((u) => u.song.id)).toEqual(['c', 'a', 'b']);
  });
});
