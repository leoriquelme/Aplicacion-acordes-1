import { songKey } from '../lib/importar.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getCapo, setCapo as saveCapo, useStore } from '../lib/store.jsx';
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
      items = ev.items
        .map((i) => { const song = byId.get(i.songId); return { song, transpose: i.transpose || 0, order: i.order?.length ? i.order : song?.order }; })
        .filter((i) => i.song);
    }
  } else {
    const s = byId.get(id);
    if (s) {
      items = [{ song: s, transpose: Number(params.get('t')) || 0, order: s.order }];
      exitTo = `/canciones/${s.id}`;
    }
  }

  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(() => Math.round(settings.fontSize * (window.innerWidth < 640 ? 1 : 1.5)));
  const [showChords, setShowChords] = useState(settings.showChords);
  const [isFull, setIsFull] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const hideTimer = useRef(null);
  const touch = useRef(null);

  const current = items[index];
  // En la presentación no se cambia el tono: se usa el del evento (o el de la canción).
  const steps = current ? current.transpose : 0;
  // Capo personal (solo cambia las formas de los acordes que veo yo).
  const songId = current?.song.id;
  const [capo, setCapoState] = useState(0);
  useEffect(() => { if (songId) setCapoState(getCapo(songId)); }, [songId]);
  const setCapo = (n) => { setCapoState(n); if (songId) saveCapo(songId, n); };

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

  useEffect(() => {
    const onFs = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Flecha abajo / arriba: pasa a la sección siguiente o anterior de la canción.
  // En la última sección, la flecha abajo pasa a la próxima canción.
  const goSection = useCallback((dir) => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll('.song .block')];
    if (!blocks.length) return;
    const top = root.getBoundingClientRect().top;
    const pos = blocks.map((b) => b.getBoundingClientRect().top - top);
    // Sección actual: la última cuyo inicio ya llegó arriba de la pantalla.
    let cur = 0;
    pos.forEach((p, i) => { if (p <= 24) cur = i; });
    if (root.scrollTop < 8) cur = dir > 0 ? -1 : 0;
    // Abajo del todo: la sección actual es la última que se ve.
    else if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
      pos.forEach((p, i) => { if (p < root.clientHeight - 40) cur = i; });
    }
    const next = cur + dir;
    if (next >= blocks.length) { go(1); return; }
    if (next < 0) { root.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    root.scrollTo({ top: root.scrollTop + pos[next] - 16, behavior: 'smooth' });
  }, [go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); goSection(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); goSection(-1); }
      else if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key.toLowerCase() === 'f') toggleFull();
      else if (e.key === 'Escape' && !document.fullscreenElement) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, goSection, toggleFull, exit]);

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
    <div
      className={`present ${controlsVisible || menuOpen ? '' : 'sin-cursor'}`}
      ref={rootRef}
      onMouseMove={poke}
      onTouchStart={(e) => { poke(); touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        const t = touch.current; touch.current = null;
        if (!t || menuOpen) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}
    >
      <header className="present-head">
        <h1>{current.song.title}</h1>
        {items.length > 1 && <span className="present-count">{index + 1} / {items.length}</span>}
      </header>

      <SongView
        content={current.song.content}
        songKey={songKey(current.song)}
        steps={steps - capo}
        order={current.order}
        settings={{ ...settings, showChords }}
        fontSize={size}
        className="present-song"
      />

      <div className={`present-menu ${controlsVisible || menuOpen ? '' : 'dim'}`}>
        <button className="present-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Opciones" aria-expanded={menuOpen}>
          {menuOpen ? '✕' : '⋯'}
        </button>
        {menuOpen && (
          <div className="present-menu-panel" role="menu">
            {title && <div className="present-menu-title">{title}</div>}
            <div className="present-menu-key">Tono: <strong>{displayKey(songKey(current.song), steps, settings.notation) || '—'}</strong></div>
            {items.length > 1 && (
              <div className="present-menu-row">
                <button className="btn" onClick={() => go(-1)} disabled={index === 0}>◀ Anterior</button>
                <button className="btn" onClick={() => go(1)} disabled={index === items.length - 1}>Siguiente ▶</button>
              </div>
            )}
            <div className="present-menu-row">
              <button className="btn" onClick={() => setSize((s) => Math.max(14, s - 3))} aria-label="Letra más chica">A−</button>
              <span className="present-size">{size}</span>
              <button className="btn" onClick={() => setSize((s) => Math.min(96, s + 3))} aria-label="Letra más grande">A+</button>
            </div>
            <label className="present-menu-row capo">
              Capo
              <select value={capo} onChange={(e) => setCapo(Number(e.target.value))}>
                <option value={0}>Sin capo</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Traste {n}</option>)}
              </select>
            </label>
            <button className="btn" onClick={() => setShowChords((v) => !v)}>{showChords ? 'Ocultar acordes' : 'Mostrar acordes'}</button>
            <button className="btn" onClick={toggleFull}>{isFull ? 'Salir de pantalla completa' : '⛶ Pantalla completa'}</button>
            <button className="btn danger-solid" onClick={exit}>✕ Salir de la presentación</button>
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className={`present-nav ${controlsVisible ? '' : 'dim'}`}>
          <button onClick={() => go(-1)} disabled={index === 0} aria-label="Canción anterior">◀</button>
          <button onClick={() => go(1)} disabled={index === items.length - 1} aria-label="Canción siguiente">▶</button>
        </div>
      )}
    </div>
  );
}
