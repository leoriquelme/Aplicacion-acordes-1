import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { displayKey } from '../lib/chordpro.js';
import SongView from '../components/SongView.jsx';

export default function Presentacion() {
  const { tipo, id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { songs, events, settings } = useStore();
  const rootRef = useRef(null);

  // Arma la lista de canciones a presentar: un evento completo o una sola canción.
  const byId = new Map(songs.map((s) => [s.id, s]));
  let items = [];
  let title = '';
  let exitTo = '/';
  if (tipo === 'evento') {
    const ev = events.find((e) => e.id === id);
    if (ev) {
      title = ev.name;
      exitTo = `/eventos/${ev.id}`;
      items = ev.items.map((i) => ({ song: byId.get(i.songId), transpose: i.transpose || 0 })).filter((i) => i.song);
    }
  } else {
    const s = byId.get(id);
    if (s) {
      items = [{ song: s, transpose: Number(params.get('t')) || 0 }];
      exitTo = `/canciones/${s.id}`;
    }
  }

  const [index, setIndex] = useState(0);
  const [extra, setExtra] = useState({}); // cambios de tono hechos durante la presentación
  const [size, setSize] = useState(Math.round(settings.fontSize * 1.5));
  const [showChords, setShowChords] = useState(settings.showChords);
  const [isFull, setIsFull] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  const current = items[index];
  const steps = current ? current.transpose + (extra[index] || 0) : 0;

  const go = useCallback((dir) => {
    setIndex((i) => Math.min(Math.max(i + dir, 0), Math.max(items.length - 1, 0)));
    rootRef.current?.scrollTo({ top: 0 });
  }, [items.length]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    navigate(exitTo);
  }, [navigate, exitTo]);

  const transpose = useCallback((d) => setExtra((x) => ({ ...x, [index]: (x[index] || 0) + d })), [index]);

  useEffect(() => {
    const onFs = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === '+' || e.key === '=') transpose(1);
      else if (e.key === '-') transpose(-1);
      else if (e.key.toLowerCase() === 'f') toggleFull();
      else if (e.key === 'Escape' && !document.fullscreenElement) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, transpose, toggleFull, exit]);

  // Oculta los controles después de unos segundos sin mover el mouse.
  const poke = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);
  useEffect(() => {
    poke();
    return () => clearTimeout(hideTimer.current);
  }, [poke]);

  if (!current) {
    return (
      <div className="present">
        <div className="present-empty">
          <p>No hay canciones para presentar.</p>
          <button className="btn" onClick={() => navigate(exitTo)}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="present" ref={rootRef} onMouseMove={poke} onTouchStart={poke}>
      <header className="present-head">
        <h1>{current.song.title}</h1>
        {items.length > 1 && <span className="present-count">{index + 1} / {items.length}</span>}
      </header>

      <SongView
        content={current.song.content}
        songKey={current.song.key}
        steps={steps}
        settings={{ ...settings, showChords }}
        fontSize={size}
        className="present-song"
      />

      <div className={`present-controls ${controlsVisible ? '' : 'hidden'}`}>
        <button className="btn" onClick={exit} title="Salir (Esc)">✕ Salir</button>
        {items.length > 1 && (
          <>
            <button className="btn" onClick={() => go(-1)} disabled={index === 0} title="Anterior (←)">◀</button>
            <button className="btn" onClick={() => go(1)} disabled={index === items.length - 1} title="Siguiente (→)">▶</button>
          </>
        )}
        <span className="sep" />
        <button className="btn" onClick={() => transpose(-1)} title="Bajar tono (−)">−</button>
        <span className="present-key">{displayKey(current.song.key, steps, settings.notation) || steps}</span>
        <button className="btn" onClick={() => transpose(1)} title="Subir tono (+)">+</button>
        <span className="sep" />
        <button className="btn" onClick={() => setSize((s) => Math.max(16, s - 4))} title="Letra más chica">A−</button>
        <button className="btn" onClick={() => setSize((s) => Math.min(96, s + 4))} title="Letra más grande">A+</button>
        <button className="btn" onClick={() => setShowChords((v) => !v)}>{showChords ? 'Ocultar acordes' : 'Mostrar acordes'}</button>
        <button className="btn primary" onClick={toggleFull} title="Pantalla completa (F)">
          {isFull ? 'Salir de pantalla completa' : '⛶ Pantalla completa'}
        </button>
        {title && <span className="present-title muted">{title}</span>}
      </div>
    </div>
  );
}
