import { describe, expect, it } from 'vitest';
import { cancionesConYouTube, embedLista, esLinkYouTube, idYouTube, linkListaCompartir, linkVerYouTube } from './youtube.js';

const V = 'dQw4w9WgXcQ';
describe('links de YouTube', () => {
  it('reconoce los distintos formatos', () => {
    for (const l of [`https://www.youtube.com/watch?v=${V}`, `https://youtu.be/${V}?si=abc`, `https://m.youtube.com/watch?v=${V}&t=30s`,
      `https://www.youtube.com/shorts/${V}`, `https://music.youtube.com/watch?v=${V}&list=X`, `https://www.youtube.com/live/${V}`, ` https://youtube.com/embed/${V} `]) {
      expect(idYouTube(l)).toBe(V);
    }
  });
  it('rechaza lo que no es un video', () => {
    expect(idYouTube('https://www.youtube.com/')).toBe(null);
    expect(idYouTube('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe(null);
    expect(idYouTube('hola')).toBe(null);
    expect(esLinkYouTube('')).toBe(true);
    expect(esLinkYouTube('hola')).toBe(false);
    expect(linkVerYouTube(`https://youtu.be/${V}`)).toBe(`https://www.youtube.com/watch?v=${V}`);
  });
  it('arma la lista para ver en la app y para compartir', () => {
    expect(embedLista(['a1234567890', 'b1234567890', 'c1234567890'])).toBe('https://www.youtube-nocookie.com/embed/a1234567890?rel=0&playsinline=1&playlist=b1234567890,c1234567890');
    expect(embedLista(['a1234567890', 'b1234567890'], 1, true)).toBe('https://www.youtube-nocookie.com/embed/b1234567890?rel=0&playsinline=1&autoplay=1');
    expect(linkListaCompartir(['a1234567890', 'b1234567890'])).toBe('https://www.youtube.com/watch_videos?video_ids=a1234567890,b1234567890');
  });
  it('lista las canciones del culto con video, en orden', () => {
    const lines = [{ song: { id: 'x', youtube: `https://youtu.be/${V}` } }, { item: {} }, { song: { id: 'y' } }];
    expect(cancionesConYouTube(lines).map((s) => s.id)).toEqual(['x']);
  });
});
