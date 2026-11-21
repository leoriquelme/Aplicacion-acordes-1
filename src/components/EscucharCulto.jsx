import { useEffect, useRef, useState } from 'react';
import { cancionesConSpotify, linkAbrir, uriSpotify } from '../lib/spotify.js';
import SpotifyLogo from './SpotifyLogo.jsx';
import Icon from './Icon.jsx';

// Reproductor de Spotify dentro de la app: toca las canciones del culto una tras otra.
// Usa el reproductor público de Spotify (sin cuenta de desarrollador ni servidor).

let apiPromesa = null;
function cargarApi() {
  if (apiPromesa) return apiPromesa;
  apiPromesa = new Promise((resolve, reject) => {
    const anterior = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => { resolve(api); if (anterior) anterior(api); };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = () => { apiPromesa = null; reject(new Error('sin conexión')); };
    document.body.appendChild(s);
    setTimeout(() => reject(new Error('tardó demasiado')), 15000);
  });
  return apiPromesa;
}

/** Botones de Spotify del evento: abrir la playlist (si se pegó) y escuchar las canciones en orden. */
export default function EscucharCulto({ event, lines }) {
  const canciones = cancionesConSpotify(lines);
  const reproducibles = canciones.filter((s) => uriSpotify(s.spotify));
  const playlist = linkAbrir(event.spotify);
  const [abierto, setAbierto] = useState(false);
  if (!playlist && canciones.length === 0) return null;
  return (
    <>
      <div className="event-tools spotify-tools">
        {reproducibles.length > 0 && (
          <button className={`btn small spotify-btn-grande ${abierto ? 'activo' : ''}`} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
            <SpotifyLogo /> {abierto ? 'Cerrar reproductor' : `Escuchar las canciones (${reproducibles.length})`}
          </button>
        )}
        {playlist && (
          <a className="btn small spotify-btn-grande" href={playlist} target="_blank" rel="noopener noreferrer">
            <SpotifyLogo /> Abrir playlist en Spotify
          </a>
        )}
      </div>
      {abierto && <Reproductor canciones={canciones} />}
    </>
  );
}

function Reproductor({ canciones }) {
  const lugar = useRef(null);
  const control = useRef(null);
  const estado = useRef({ casiFin: false, avanzado: -1, quiereTocar: false });
  const [actual, setActual] = useState(() => canciones.findIndex((s) => uriSpotify(s.spotify)));
  const [falla, setFalla] = useState('');
  const actualRef = useRef(actual);
  actualRef.current = actual;

  const siguienteDesde = (i) => {
    for (let k = i + 1; k < canciones.length; k++) if (uriSpotify(canciones[k].spotify)) return k;
    return -1;
  };

  const tocar = (i) => {
    if (i < 0) return;
    setActual(i);
    const c = control.current;
    if (!c) return;
    estado.current = { casiFin: false, avanzado: -1, quiereTocar: true };
    c.loadUri(uriSpotify(canciones[i].spotify));
  };
  const tocarRef = useRef(tocar);
  tocarRef.current = tocar;

  useEffect(() => {
    let vivo = true;
    const primera = canciones[actualRef.current];
    if (!primera) return undefined;
    cargarApi().then((api) => {
      if (!vivo || !lugar.current) return;
      const hueco = document.createElement('div');
      lugar.current.replaceChildren(hueco);
      api.createController(hueco, { uri: uriSpotify(primera.spotify), width: '100%', height: 152 }, (c) => {
        if (!vivo) { c.destroy?.(); return; }
        control.current = c;
        c.addListener('ready', () => {
          if (estado.current.quiereTocar) { estado.current.quiereTocar = false; c.play(); }
        });
        // Cuando una canción termina, pasa sola a la siguiente.
        const alTerminar = () => {
          const i = actualRef.current;
          if (estado.current.avanzado === i) return;
          estado.current.avanzado = i;
          const sig = siguienteDesde(i);
          if (sig >= 0) tocarRef.current(sig);
        };
        c.addListener('playback_update', (e) => {
          const d = e?.data || {};
          if (!d.duration) return;
          if (!d.isPaused && d.duration - d.position < 1500) estado.current.casiFin = true;
          if (d.isPaused && estado.current.casiFin) { estado.current.casiFin = false; alTerminar(); }
        });
      });
    }).catch(() => vivo && setFalla('No se pudo cargar el reproductor de Spotify. Revisa tu conexión o abre cada canción en Spotify.'));
    return () => {
      vivo = false;
      try { control.current?.destroy?.(); } catch { /* nada */ }
      control.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="card spotify-player">
      {falla ? <p className="error small">{falla}</p> : <div ref={lugar} className="spotify-embed"><p className="muted small">Cargando Spotify…</p></div>}
      <ol className="spotify-lista">
        {canciones.map((s, i) => {
          const sePuede = !!uriSpotify(s.spotify);
          return (
            <li key={s.id} className={i === actual ? 'actual' : ''}>
              <button className="spotify-item" disabled={!sePuede || !!falla} onClick={() => tocarRef.current(i)} aria-current={i === actual}>
                <span className="spotify-num">{i === actual ? <Icon name="play" size={14} /> : i + 1}</span>
                <span className="grow">{s.title}</span>
              </button>
              <a className="spotify-abrir" href={linkAbrir(s.spotify)} target="_blank" rel="noopener noreferrer" title="Abrir en la app de Spotify">Abrir ↗</a>
            </li>
          );
        })}
      </ol>
      <p className="muted small">
        Las canciones pasan solas, en el orden del culto. Si no has iniciado sesión en Spotify en este navegador, solo se escucha un trozo de cada una:
        toca “Iniciar sesión” en el reproductor o usa “Abrir ↗”.
      </p>
    </section>
  );
}
