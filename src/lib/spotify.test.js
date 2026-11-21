import { describe, expect, it } from 'vitest';
import { cancionesConSpotify, esLinkSpotify, linkAbrir, parseSpotify, uriSpotify } from './spotify.js';

describe('links de Spotify', () => {
  it('reconoce links de canciones, también con intl-es y ?si=', () => {
    expect(parseSpotify('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toEqual({ type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' });
    expect(parseSpotify(' https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=abc123 ')).toEqual({ type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' });
    expect(parseSpotify('spotify:track:4uLU6hMCjMI75M1A2tKUQC')).toEqual({ type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' });
  });
  it('reconoce playlists y links cortos', () => {
    expect(parseSpotify('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x').type).toBe('playlist');
    expect(parseSpotify('https://spotify.link/AbCdEf').type).toBe('corto');
    expect(linkAbrir('https://spotify.link/AbCdEf')).toBe('https://spotify.link/AbCdEf');
    expect(uriSpotify('https://spotify.link/AbCdEf')).toBe(null);
  });
  it('rechaza lo que no es Spotify', () => {
    expect(parseSpotify('https://youtube.com/watch?v=1')).toBe(null);
    expect(parseSpotify('hola')).toBe(null);
    expect(parseSpotify('https://open.spotify.com/')).toBe(null);
    expect(esLinkSpotify('')).toBe(true);
    expect(esLinkSpotify('hola')).toBe(false);
  });
  it('arma el link limpio y el URI', () => {
    expect(linkAbrir('https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=1')).toBe('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
    expect(uriSpotify('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe('spotify:track:4uLU6hMCjMI75M1A2tKUQC');
  });
  it('lista las canciones del culto con link, en orden', () => {
    const a = { id: 'a', spotify: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' };
    const b = { id: 'b' };
    const c = { id: 'c', spotify: 'spotify:track:1234567890abcdefghij' };
    const lines = [{ song: c }, { item: { label: 'Oración' } }, { song: b }, { song: a }];
    expect(cancionesConSpotify(lines).map((s) => s.id)).toEqual(['c', 'a']);
  });
});
