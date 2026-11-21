import { describe, expect, it } from 'vitest';
import { bytesToText, decodeEntities, extractSong, firstVersionLink, normalizeUrl } from './importarLink.js';
import { analyzeSong } from './importar.js';

const PAGE = `<html><head><meta charset="iso-8859-1"><title>CANCION DE PRUEBA, Autor Ejemplo: Acordes</title></head>
<body><div id=mHead><h1><a href="/x">Canci&oacute;n de prueba</a></h1><h2><a href="/autor">Autor Ejemplo</a></h2></div>
<div id=t_body><PRE>
<A>G</A>                <A>D</A>
Primera l&iacute;nea de la letra
<A>Em</A>          <A>C</A>
segunda l&iacute;nea

coro:
<A>C</A>        <A>G</A>
Esto es el coro
</PRE></div><pre>x</pre></body></html>`;

describe('importar desde link', () => {
  it('saca título, autor y la letra con acordes alineados', () => {
    const s = extractSong(PAGE);
    expect(s.title).toBe('Canción de prueba');
    expect(s.author).toBe('Autor Ejemplo');
    expect(s.text.split('\n')[0]).toBe('G                D');
    expect(s.text).toContain('Primera línea de la letra');
    const a = analyzeSong(s.text);
    expect(a.sections.map((x) => x.base || x.name).join(' ')).toMatch(/CORO/);
  });

  it('usa el <title> si no hay h1', () => {
    const s = extractSong('<title>RENUEVAME, Marcos Witt: Acordes</title><pre>G\nhola</pre>');
    expect(s.title).toBe('Renuevame');
    expect(s.author).toBe('Marcos Witt');
  });

  it('encuentra la primera versión en la lista de versiones', () => {
    const html = '<a href="otra.shtml">x</a><a href="cancion-2.shtml">v2</a><a href="cancion.shtml">v1</a>';
    expect(firstVersionLink(html, 'https://acordes.lacuerda.net/autor/cancion')).toBe('https://acordes.lacuerda.net/autor/cancion-2.shtml');
  });

  it('limpia el link', () => {
    expect(normalizeUrl('Mira esto https://acordes.lacuerda.net/a/b.shtml')).toBe('https://acordes.lacuerda.net/a/b.shtml');
    expect(normalizeUrl('acordes.lacuerda.net/a/b.shtml')).toBe('https://acordes.lacuerda.net/a/b.shtml');
    expect(normalizeUrl('https://m.lacuerda.net/a/b.shtml')).toBe('https://acordes.lacuerda.net/a/b.shtml');
    expect(normalizeUrl('hola')).toBe(null);
  });

  it('entiende páginas en latin-1 y entidades', () => {
    expect(bytesToText(new Uint8Array([0x63, 0x61, 0x6e, 0x63, 0x69, 0xf3, 0x6e]).buffer)).toBe('canción');
    expect(decodeEntities('&iquest;Qui&eacute;n? &ntilde; &#233; &amp;')).toBe('¿Quién? ñ é &');
  });
});
