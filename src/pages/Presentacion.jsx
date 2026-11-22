import { songKey } from '../lib/importar.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getCapo, setCapo as saveCapo, useStore } from '../lib/store.jsx';
import { arrangeSections, displayKey, parseSong, sectionAbbr, sectionKind, sectionLabel } from '../lib/chordpro.js';
import { convertPlainChords } from '../lib/importar.js';
import SongView from '../components/SongView.jsx';
import { alternarNota, notasPorSeccion } from '../lib/notas.js';
import { ElegirNota } from '../components/NotasCancion.jsx';
import Icon from '../components/Icon.jsx';
import { enVivoActivo, indiceCancion } from '../lib/envivo.js';
import { accionPedal, esCampoDeTexto } from '../lib/pedal.js';
import PedalCaptura, { esTactil, marcarPedalera, usaPedalera } from '../components/PedalCaptura.jsx';

/** Número de la sección que está arriba de la pantalla (la que se está cantando). */
function seccionActual(root) {
  const blocks = [...root.querySelectorAll('.song .block')];
  if (!blocks.length || root.scrollTop < 8) return 0;
  const top = root.getBoundingClientRect().top;
  const pos = blocks.map((b) => b.getBoundingClientRect().top - top);
  let cur = 0;
  pos.forEach((p, i) => { if (p <= 24) cur = i; });
  if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
    pos.forEach((p, i) => { if (p < root.clientHeight - 40) cur = i; });
  }
  return cur;
}

export default function Presentacion() {
  const { tipo, id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { songs, events, settings, myNotes = {}, setMyNotes, saveSong, can, mode, live, publishLive, stopLive, myUid } = useStore();
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
  // En iPhone, Safari no deja poner una página en pantalla completa: ahí no se muestra el botón.
  const puedePantallaCompleta = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [noteFor, setNoteFor] = useState(null);
  const hideTimer = useRef(null);
  const touch = useRef(null);

  // ---------- En vivo ----------
  // Director: "Pasar en vivo a todos" → cada cambio de canción o sección se avisa a los demás.
  // Los demás: "Seguir" → la pantalla avanza sola, igual que la del director.
  const esEvento = tipo === 'evento';
  const liveOn = enVivoActivo(live);
  const liveAqui = liveOn && live.eventId === id;
  const puedoPasar = mode === 'cloud' && esEvento && can?.edit && Boolean(publishLive);
  const [broadcasting, setBroadcasting] = useState(() => puedoPasar && (params.get('envivo') === '1' || (liveAqui && live.by === myUid)));
  const [following, setFollowing] = useState(() => esEvento && params.get('seguir') === '1');
  const [aviso, setAviso] = useState('');
  const [section, setSection] = useState(0);
  const otroPasando = liveAqui && live.by !== myUid;

  const current = items[index];
  // En la presentación no se cambia el tono: se usa el del evento (o el de la canción).
  const steps = current ? current.transpose : 0;
  // Capo personal (solo cambia las formas de los acordes que veo yo).
  const songId = current?.song.id;
  const [capo, setCapoState] = useState(0);
  useEffect(() => { if (songId) setCapoState(getCapo(songId)); }, [songId]);
  const setCapo = (n) => { setCapoState(n); if (songId) saveCapo(songId, n); };

  // Sección a la que se está yendo (mientras la pantalla todavía se desliza),
  // para que dos pisadas rápidas de la pedalera avancen dos secciones.
  const destino = useRef(null);

  const go = useCallback((dir) => {
    destino.current = null;
    setSection(0);
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

  // Pedal / flecha abajo: baja hasta la sección siguiente (o una pantalla, si la letra
  // está en columnas). Abajo del todo, pasa a la próxima canción.
  // Pedal / flecha arriba: lo mismo hacia atrás; arriba del todo, vuelve a la canción anterior.
  const indexRef = useRef(0);
  indexRef.current = index;
  const goSection = useCallback((dir) => {
    const root = rootRef.current;
    if (!root) return;
    const ahora = Date.now();
    const d = destino.current;
    // Si la pantalla todavía se está deslizando, se cuenta desde donde va a quedar.
    const vt = d && ahora < d.hasta ? d.top : root.scrollTop;
    const maxTop = Math.max(root.scrollHeight - root.clientHeight, 0);
    const rootTop = root.getBoundingClientRect().top;
    const inicios = [...root.querySelectorAll('.song .block')]
      .map((b) => Math.max(b.getBoundingClientRect().top - rootTop + root.scrollTop - 16, 0));
    let nuevo = null;
    if (dir > 0) {
      const sig = inicios.find((t) => t > vt + 8);
      if (sig !== undefined) nuevo = Math.min(sig, maxTop);
      else if (vt < maxTop - 4) nuevo = Math.min(vt + root.clientHeight * 0.85, maxTop);
      if (nuevo === null || nuevo <= vt + 4) {
        if (indexRef.current < items.length - 1) go(1);
        return;
      }
    } else {
      const ant = [...inicios].reverse().find((t) => t < vt - 8);
      if (ant !== undefined) nuevo = ant;
      else if (vt > 4) nuevo = 0;
      else {
        if (indexRef.current > 0) go(-1);
        return;
      }
    }
    destino.current = { top: nuevo, hasta: ahora + 700 };
    root.scrollTo({ top: nuevo, behavior: 'smooth' });
  }, [go, items.length]);

  // Pedalera en iPhone/iPad: un campo invisible tiene que tener el foco (ver PedalCaptura).
  const pedalRef = useRef(null);
  const [usarCampo] = useState(esTactil);
  const [pedalLista, setPedalLista] = useState(false);
  const [avisoPedal] = useState(usaPedalera);
  const activarPedal = useCallback(() => {
    if (!usarCampo) return;
    if (document.querySelector('.modal-notas')) return;
    const a = document.activeElement;
    if (esCampoDeTexto(a) && a !== pedalRef.current) return;
    pedalRef.current?.focus({ preventScroll: true });
  }, [usarCampo]);

  // Teclado y pedalera Bluetooth (ver lib/pedal.js para las teclas de cada modo).
  const ultimaRepeticion = useRef(0);
  const ultimaBajada = useRef(null);
  // Señal chica en pantalla cada vez que llega un pedal (para saber que la pedalera se escucha).
  const [pisada, setPisada] = useState(null);
  const pisadaTimer = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('.modal-notas')) return; // con la ventana de notas abierta, las teclas no mueven la presentación
      if (esCampoDeTexto(e.target) && e.target !== pedalRef.current) return;
      if (followingRef.current && !['f', 'F', 'Escape'].includes(e.key)) return; // siguiendo al director: avanza solo
      const accion = accionPedal(e);
      if (accion && e.type === 'keyup') {
        // Algunos equipos (iPhone/iPad) a veces solo avisan cuando se suelta la tecla:
        // si no llegó el "apretar" de esa tecla, se usa el "soltar".
        const d = ultimaBajada.current;
        e.preventDefault();
        if (d && d.key === e.key && Date.now() - d.t < 1500) return;
      } else if (accion) {
        ultimaBajada.current = { key: e.key, t: Date.now() };
      }
      if (accion) {
        // Que ningún botón con foco "se apriete" con Espacio/Enter, y que el navegador no deslice la página por su cuenta.
        e.preventDefault();
        e.stopPropagation();
        const activo = document.activeElement;
        if (activo && activo !== rootRef.current && activo !== pedalRef.current && activo !== document.body) {
          activo.blur?.();
          (usarCampo ? pedalRef.current : rootRef.current)?.focus({ preventScroll: true });
        }
        marcarPedalera();
        // Pedal mantenido apretado ("Continue Sending"): avanza de a poco, no todo de golpe.
        if (e.repeat) {
          const ahora = Date.now();
          if (ahora - ultimaRepeticion.current < 450) return;
          ultimaRepeticion.current = ahora;
        }
        setPisada(accion.endsWith('+') ? '▼' : '▲');
        clearTimeout(pisadaTimer.current);
        pisadaTimer.current = setTimeout(() => setPisada(null), 600);
        if (accion === 'seccion+') goSection(1);
        else if (accion === 'seccion-') goSection(-1);
        else if (accion === 'cancion+') go(1);
        else if (accion === 'cancion-') go(-1);
        return;
      }
      if (e.type !== 'keydown') return;
      if (e.key.toLowerCase() === 'f') toggleFull();
      else if (e.key === 'Escape' && !document.fullscreenElement) exit();
    };
    // En la fase de captura, para que la tecla llegue aquí antes que a cualquier otro elemento.
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKey, true);
    };
  }, [go, goSection, toggleFull, exit, usarCampo]);

  // La pantalla de presentación toma el foco al abrirse (así Safari en iPhone/iPad
  // le entrega las teclas de la pedalera en vez de al botón que se tocó antes).
  useEffect(() => {
    const activo = document.activeElement;
    if (activo && activo !== document.body) activo.blur?.();
    (usarCampo ? pedalRef.current : rootRef.current)?.focus({ preventScroll: true });
  }, [current ? 1 : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const followingRef = useRef(following);
  followingRef.current = following;

  // Director: mira en qué sección va (con flechas o bajando con el dedo).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let t;
    const onScroll = () => { clearTimeout(t); t = setTimeout(() => setSection(seccionActual(root)), 120); };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); root.removeEventListener('scroll', onScroll); };
  }, [current ? 1 : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Director: avisa a todos la canción y la sección (un solo envío por cambio).
  const currentSongId = items[index]?.song.id;
  useEffect(() => {
    if (!broadcasting || !currentSongId) return undefined;
    const t = setTimeout(() => publishLive({ eventId: id, songId: currentSongId, song: index, section }), 250);
    return () => clearTimeout(t);
  }, [broadcasting, id, index, section, currentSongId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Director: al salir de la presentación, termina el modo en vivo.
  const stopRef = useRef(stopLive);
  stopRef.current = stopLive;
  const broadcastingRef = useRef(broadcasting);
  broadcastingRef.current = broadcasting;
  useEffect(() => () => { if (broadcastingRef.current) stopRef.current?.(); }, []);

  // Si otro director toma el control, yo dejo de pasar y paso a seguirlo.
  // (solo después de que mi propio aviso ya llegó, para no confundirme con uno viejo)
  const miAvisoLlego = useRef(false);
  useEffect(() => {
    if (!broadcasting) { miAvisoLlego.current = false; return; }
    if (liveAqui && live.by === myUid) { miAvisoLlego.current = true; return; }
    if (miAvisoLlego.current && liveAqui && live.by !== myUid) {
      setBroadcasting(false);
      setFollowing(true);
      setAviso(`${live.byName || 'Otro director'} tomó el control`);
    }
  }, [broadcasting, liveAqui, live?.by]); // eslint-disable-line react-hooks/exhaustive-deps

  // Siguiendo: ir a la canción del director (y a su evento, si cambió).
  useEffect(() => {
    if (!following || live === undefined) return;
    if (!liveOn) {
      setFollowing(false);
      setAviso('El director terminó de pasar la letra');
      return;
    }
    if (live.eventId !== id) { navigate(`/presentar/evento/${live.eventId}?seguir=1`, { replace: true }); return; }
    setIndex(indiceCancion(items, live));
  }, [following, live, liveOn, id, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Siguiendo: bajar hasta la sección del director.
  const liveSection = following && liveAqui ? live.section : null;
  useEffect(() => {
    if (liveSection === null) return undefined;
    const r = requestAnimationFrame(() => {
      const root = rootRef.current;
      const blocks = root ? [...root.querySelectorAll('.song .block')] : [];
      if (!root || !blocks.length) return;
      if (liveSection <= 0) { root.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const b = blocks[Math.min(liveSection, blocks.length - 1)];
      root.scrollTo({ top: root.scrollTop + b.getBoundingClientRect().top - root.getBoundingClientRect().top - 16, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(r);
  }, [liveSection, index]);

  // Marca la sección que se está cantando (para el director y para quien sigue).
  const marcada = broadcasting ? section : liveSection;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const blocks = [...root.querySelectorAll('.song .block')];
    blocks.forEach((b, i) => b.classList.toggle('en-vivo-actual', marcada !== null && i === marcada));
    return () => blocks.forEach((b) => b.classList.remove('en-vivo-actual'));
  }, [marcada, index, items.length]);

  // Que la pantalla no se apague mientras se presenta (también al pasar o seguir la letra en vivo).
  useEffect(() => {
    if (!navigator.wakeLock) return undefined;
    let lock = null;
    let done = false;
    const pedir = () => navigator.wakeLock.request('screen').then((l) => { if (done) l.release(); else lock = l; }).catch(() => {});
    pedir();
    const onVis = () => { if (document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { done = true; lock?.release().catch(() => {}); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Los avisos cortos se van solos.
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const empezarEnVivo = () => {
    setFollowing(false);
    setBroadcasting(true);
    setSection(rootRef.current ? seccionActual(rootRef.current) : 0);
    setMenuOpen(false);
  };
  const terminarEnVivo = () => {
    setBroadcasting(false);
    stopLive?.();
    setMenuOpen(false);
  };

  // ---------- Avance automático: la letra baja sola, a la velocidad elegida ----------
  const [auto, setAuto] = useState(false);
  const [velocidad, setVelocidad] = useState(3); // 1 (lento) a 8 (rápido)
  useEffect(() => {
    if (!auto) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    let raf;
    let antes = performance.now();
    let resto = 0;
    const paso = (ahora) => {
      const dt = Math.min(100, ahora - antes);
      antes = ahora;
      resto += (velocidad * 6 * dt) / 1000; // px por segundo
      const px = Math.floor(resto);
      if (px > 0) { root.scrollTop += px; resto -= px; }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) { setAuto(false); return; }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [auto, velocidad, index]);
  useEffect(() => { if (following) setAuto(false); }, [following]);

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
      tabIndex={-1}
      onMouseMove={poke}
      onTouchStart={(e) => { poke(); touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onClick={activarPedal}
      onTouchEnd={(e) => {
        activarPedal();
        const t = touch.current; touch.current = null;
        if (!t || menuOpen || following) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}
    >
      {pisada && <div className="present-pisada" aria-hidden="true">{pisada}</div>}
      {usarCampo && <PedalCaptura ref={pedalRef} onFoco={setPedalLista} />}
      {usarCampo && avisoPedal && !pedalLista && !following && (
        <div className="present-aviso-pedal">Toca la pantalla para usar la pedalera</div>
      )}
      <header className="present-head">
        <h1>{current.song.title}</h1>
        {items.length > 1 && <span className="present-count">{index + 1} / {items.length}</span>}
        {puedoPasar && !broadcasting && (
          <button type="button" className="btn small en-vivo-btn present-envivo" onClick={empezarEnVivo}>
            <Icon name="live" /> {otroPasando ? 'Tomar control' : 'En vivo'}
          </button>
        )}
      </header>

      <div className="present-arriba">
      {(broadcasting || following || otroPasando || aviso) && (
        <div className={`en-vivo-pill ${broadcasting || following ? 'on' : ''}`} role="status">
          {broadcasting ? (
            <><span className="en-vivo-dot" /> En vivo: todos ven lo que tú ves
              <button className="btn small" onClick={terminarEnVivo}>Terminar</button></>
          ) : following ? (
            <><span className="en-vivo-dot" /> Siguiendo a {live?.byName || 'el director'}
              <button className="btn small" onClick={() => setFollowing(false)}>Dejar de seguir</button></>
          ) : otroPasando ? (
            <><span className="en-vivo-dot" /> {live.byName || 'El director'} está pasando la letra
              <button className="btn small primary" onClick={() => setFollowing(true)}>Seguir</button></>
          ) : (
            <>{aviso}</>
          )}
        </div>
      )}
      <Secuencia
        content={current.song.content}
        order={current.order}
        actual={broadcasting ? section : (liveSection ?? section)}
        onPick={following ? undefined : (i) => {
          const root = rootRef.current;
          const b = root ? [...root.querySelectorAll('.song .block')][i] : null;
          if (b) root.scrollTo({ top: root.scrollTop + b.getBoundingClientRect().top - root.getBoundingClientRect().top - 70, behavior: 'smooth' });
        }}
      />
      </div>

      <SongView
        content={current.song.content}
        songKey={songKey(current.song)}
        steps={steps - capo}
        order={current.order}
        settings={{ ...settings, showChords }}
        fontSize={size}
        notes={notasPorSeccion(current.song.notes, myNotes[current.song.id])}
        onAddNote={editNotes ? setNoteFor : undefined}
        onRemoveNote={editNotes ? (section, n) => (n.mine
          ? setMyNotes(current.song.id, alternarNota(myNotes[current.song.id], section, n.id))
          : saveSong({ ...current.song, notes: alternarNota(current.song.notes, section, n.id) })) : undefined}
        canEditDirector={can?.edit}
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
            {puedoPasar && (broadcasting ? (
              <button className="btn danger-solid" onClick={terminarEnVivo}><span className="en-vivo-dot" /> Terminar en vivo</button>
            ) : (
              <button className="btn en-vivo-btn" onClick={empezarEnVivo}>
                <span className="en-vivo-dot" /> {otroPasando ? 'Tomar el control en vivo' : 'Pasar en vivo a todos'}
              </button>
            ))}
            {items.length > 1 && !following && (
              <div className="present-menu-row">
                <button className="btn" onClick={() => go(-1)} disabled={index === 0}><Icon name="chevronLeft" /> Anterior</button>
                <button className="btn" onClick={() => go(1)} disabled={index === items.length - 1}>Siguiente <Icon name="chevronRight" /></button>
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
            {setMyNotes && (
              <button className={`btn ${editNotes ? 'primary' : ''}`} onClick={() => { setEditNotes((v) => !v); setMenuOpen(false); }}>
                <Icon name="note" /> {editNotes ? 'Terminar notas' : 'Agregar notas'}
              </button>
            )}
            <button className="btn" onClick={() => setShowChords((v) => !v)}>{showChords ? 'Ocultar acordes' : 'Mostrar acordes'}</button>
            {puedePantallaCompleta && <button className="btn" onClick={toggleFull}>{isFull ? 'Salir de pantalla completa' : <><Icon name="expand" /> Pantalla completa</>}</button>}
            <button className="btn danger-solid" onClick={exit}>✕ Salir de la presentación</button>
          </div>
        )}
      </div>
      {editNotes && (
        <button className="btn primary present-notas-listo" onClick={() => setEditNotes(false)}>✓ Listo con las notas</button>
      )}
      {noteFor && current && (
        <ElegirNota
          section={noteFor}
          canDirector={can?.edit}
          director={current.song.notes || []}
          mias={myNotes[current.song.id] || []}
          onDirector={(list) => saveSong({ ...current.song, notes: list })}
          onMia={(list) => setMyNotes(current.song.id, list)}
          onClose={() => setNoteFor(null)}
          container={rootRef.current}
        />
      )}
      {!following && (
        <div className={`auto-avance ${controlsVisible || auto ? '' : 'dim'}`}>
          <button type="button" className={`auto-play ${auto ? 'on' : ''}`} onClick={() => setAuto((v) => !v)}
            aria-label={auto ? 'Pausar avance automático' : 'Avance automático'} title={auto ? 'Pausar' : 'Avance automático'}>
            <Icon name={auto ? 'pause' : 'play'} />
          </button>
          {auto && (
            <div className="auto-vel" role="group" aria-label="Velocidad">
              <button type="button" onClick={() => setVelocidad((v) => Math.max(1, v - 1))} aria-label="Más lento">−</button>
              <span>{velocidad}</span>
              <button type="button" onClick={() => setVelocidad((v) => Math.min(8, v + 1))} aria-label="Más rápido">+</button>
            </div>
          )}
        </div>
      )}
      {items.length > 1 && !following && (
        <div className={`present-nav ${controlsVisible ? '' : 'dim'}`}>
          <button onClick={() => go(-1)} disabled={index === 0} aria-label="Canción anterior"><Icon name="chevronLeft" /></button>
          <button onClick={() => go(1)} disabled={index === items.length - 1} aria-label="Canción siguiente"><Icon name="chevronRight" /></button>
        </div>
      )}
    </div>
  );
}

/** Fila de partes de la canción (V1, C, P…); la que se está cantando va marcada. */
function Secuencia({ content, order, actual, onPick }) {
  const bloques = arrangeSections(parseSong(convertPlainChords(content || '')), order);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current?.children[actual];
    el?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [actual]);
  if (bloques.length < 2) return null;
  return (
    <nav className="secuencia" aria-label="Partes de la canción" ref={ref}>
      {bloques.map((b, i) => {
        const nombre = b.marker ? b.name : sectionLabel(b.name);
        const num = String(nombre).match(/(\d+)$/)?.[1] || '';
        return (
          <button key={i} type="button" className={`sec-pill k-${sectionKind(nombre)} ${i === actual ? 'actual' : ''}`}
            onClick={() => onPick?.(i)} disabled={!onPick} aria-current={i === actual ? 'true' : undefined} title={nombre}>
            {sectionAbbr(nombre)}{num}{b.times > 1 ? <small> ×{b.times}</small> : null}
          </button>
        );
      })}
    </nav>
  );
}
