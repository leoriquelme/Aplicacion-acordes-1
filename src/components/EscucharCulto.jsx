import { useEffect, useRef, useState } from 'react';
import { cancionesConSpotify, linkAbrir, uriSpotify } from '../lib/spotify.js';
import SpotifyLogo from './SpotifyLogo.jsx';
import Icon from './Icon.jsx';
import YouTubeLogo from './YouTubeLogo.jsx';
import { cancionesConYouTube, embedLista, idYouTube, linkListaCompartir, linkVerYouTube } from '../lib/youtube.js';
import { formatLong } from '../lib/dates.js';

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

/** Botones de multimedia del evento: Spotify (canciones en orden y playlist) y YouTube (videos en orden y lista para compartir). */
export default function EscucharCulto({ event, lines }) {
  const canciones = cancionesConSpotify(lines);
  const reproducibles = canciones.filter((s) => uriSpotify(s.spotify));
  const playlist = linkAbrir(event.spotify);
  const videos = cancionesConYouTube(lines);
  const [abierto, setAbierto] = useState(null); // 'spotify' | 'youtube' | null
  if (!playlist && canciones.length === 0 && videos.length === 0) return null;
  const alternar = (que) => setAbierto((a) => (a === que ? null : que));
  return (
    <>
      <div className="event-tools spotify-tools">
        {reproducibles.length > 0 && (
          <button className={`btn small spotify-btn-grande ${abierto === 'spotify' ? 'activo' : ''}`} onClick={() => alternar('spotify')} aria-expanded={abierto === 'spotify'}>
            <SpotifyLogo /> {abierto === 'spotify' ? 'Cerrar Spotify' : `Escuchar en Spotify (${reproducibles.length})`}
          </button>
        )}
        {playlist && (
          <a className="btn small spotify-btn-grande" href={playlist} target="_blank" rel="noopener noreferrer">
            <SpotifyLogo /> Abrir playlist en Spotify
          </a>
        )}
        {videos.length > 0 && (
          <button className={`btn small youtube-btn-grande ${abierto === 'youtube' ? 'activo' : ''}`} onClick={() => alternar('youtube')} aria-expanded={abierto === 'youtube'}>
            <YouTubeLogo /> {abierto === 'youtube' ? 'Cerrar videos' : `Ver videos (${videos.length})`}
          </button>
        )}
        {videos.length > 0 && <CompartirVideos event={event} videos={videos} />}
      </div>
      {abierto === 'spotify' && <Reproductor canciones={canciones} />}
      {abierto === 'youtube' && <Videos videos={videos} />}
    </>
  );
}

/** Comparte (p. ej. por WhatsApp) un link que abre en YouTube todos los videos del culto, en orden. */
function CompartirVideos({ event, videos }) {
  const [copiado, setCopiado] = useState(false);
  const url = linkListaCompartir(videos.map((s) => idYouTube(s.youtube)));
  const texto = `${event.name} · ${formatLong(event.date)}: videos de las canciones, en orden`;
  const compartir = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event.name, text: texto, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, '_blank', 'noopener');
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { window.prompt('Copia este link:', url); }
  };
  return (
    <>
      <button className="btn small youtube-btn-grande" onClick={compartir} title="Manda por WhatsApp un link con todos los videos del culto">
        <Icon name="upload" /> Compartir videos
      </button>
      <button className="btn small" onClick={copiar} title="Copiar el link de la lista de videos">{copiado ? '✓ Copiado' : 'Copiar link'}</button>
    </>
  );
}

function Videos({ videos }) {
  const ids = videos.map((s) => idYouTube(s.youtube));
  const [desde, setDesde] = useState({ i: 0, auto: false });
  return (
    <section className="card spotify-player youtube-player">
      <div className="youtube-marco">
        <iframe
          key={`${desde.i}-${desde.auto}`}
          src={embedLista(ids, desde.i, desde.auto)}
          title="Videos del culto"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <ol className="spotify-lista youtube-lista">
        {videos.map((s, i) => (
          <li key={s.id} className={i === desde.i ? 'actual' : ''}>
            <button className="spotify-item" onClick={() => setDesde({ i, auto: true })} aria-current={i === desde.i}>
              <span className="spotify-num">{i === desde.i ? <Icon name="play" size={14} /> : i + 1}</span>
              <span className="grow">{s.title}</span>
            </button>
            <a className="spotify-abrir" href={linkVerYouTube(s.youtube)} target="_blank" rel="noopener noreferrer" title="Abrir en YouTube">Abrir ↗</a>
          </li>
        ))}
      </ol>
      <p className="muted small">Los videos pasan solos, en el orden del culto. Toca una canción para empezar desde ahí.</p>
    </section>
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
