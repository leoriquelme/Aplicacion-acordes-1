import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { abrirImagen, escalaVisor, exportarRecorte, limitarDesplazamiento } from '../lib/foto.js';

const V = 260; // tamaño del visor en pantalla (px)

/**
 * Botón que abre la cámara o la galería. Después muestra un visor para encuadrar la imagen
 * (arrastrar con el dedo, pellizcar o usar la barra para hacer zoom) y entrega onFoto(texto).
 * `modo`: 'cubrir' (foto de perfil, círculo) o 'contener' (logo, cuadrado redondeado).
 */
export default function ElegirFoto({ onFoto, modo = 'cubrir', className = 'btn', label, children }) {
  const ref = useRef(null);
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const elegir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      setImg(await abrirImagen(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const guardar = async (crear) => {
    setBusy(true);
    setError('');
    try {
      await onFoto(crear());
      setImg(null);
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    }
    setBusy(false);
  };

  return (
    <>
      <button type="button" className={className} disabled={busy} aria-label={label} title={label} onClick={() => ref.current?.click()}>
        {busy ? '…' : children}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={elegir} />
      {error && !img && <span className="error small">{error}</span>}
      {img && createPortal(
        <Encuadrar img={img} modo={modo} busy={busy} error={error} onListo={guardar} onCancelar={() => { setImg(null); setError(''); }} />,
        document.body,
      )}
    </>
  );
}

/** Visor para encuadrar: arrastrar mueve, pellizcar o la barra hacen zoom. */
function Encuadrar({ img, modo, busy, error, onListo, onCancelar }) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const punteros = useRef(new Map());
  const gesto = useRef(null);
  const s = escalaVisor(w, h, V, zoom, modo);
  const minZoom = modo === 'cubrir' ? 1 : 0.5;

  // Al cambiar el zoom, la imagen se mantiene dentro del círculo.
  useEffect(() => { setPos((p) => limitarDesplazamiento(p, w, h, s, V, modo)); }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarZoom = (z) => setZoom(Math.min(4, Math.max(minZoom, z)));

  const abajo = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesto.current = null;
  };
  const mover = (e) => {
    const ps = punteros.current;
    if (!ps.has(e.pointerId)) return;
    const antes = ps.get(e.pointerId);
    ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ps.size === 1) {
      const dx = e.clientX - antes.x;
      const dy = e.clientY - antes.y;
      setPos((p) => limitarDesplazamiento({ x: p.x + dx, y: p.y + dy }, w, h, s, V, modo));
    } else if (ps.size === 2) {
      const [a, b] = [...ps.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesto.current) cambiarZoom(gesto.current.zoom * (d / gesto.current.d));
      else gesto.current = { d, zoom };
    }
  };
  const arriba = (e) => {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) gesto.current = null;
  };

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Encuadrar imagen">
      <div className="modal encuadrar">
        <h2>Encuadrar</h2>
        <div
          className={`visor ${modo === 'cubrir' ? 'circulo' : 'cuadro'}`}
          style={{ width: V, height: V }}
          onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
          onWheel={(e) => cambiarZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          <img
            src={img.src} alt="" draggable={false}
            style={{ width: w * s, height: h * s, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
          />
        </div>
        <label className="zoom-barra">
          <span aria-hidden="true">−</span>
          <input type="range" min={minZoom} max="4" step="0.01" value={zoom} onChange={(e) => cambiarZoom(Number(e.target.value))} aria-label="Zoom" />
          <span aria-hidden="true">+</span>
        </label>
        <p className="muted small">Arrastra para mover · pellizca para acercar</p>
        {error && <p className="error small">{error}</p>}
        <div className="row gap encuadrar-botones">
          <button className="btn ghost" onClick={onCancelar} disabled={busy}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={() => onListo(() => exportarRecorte(img, s, pos, V, modo === 'cubrir' ? 192 : 256))}>
            {busy ? 'Guardando…' : 'Listo'}
          </button>
        </div>
      </div>
    </div>
  );
}
