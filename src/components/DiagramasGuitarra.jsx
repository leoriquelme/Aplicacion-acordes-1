import { useState } from 'react';
import { transposeChord } from '../lib/chordpro.js';
import { chordsInContent, guitarShape } from '../lib/guitarra.js';
import { convertPlainChords } from '../lib/importar.js';

// Dibujo de un acorde: 6 cuerdas verticales, 5 trastes.
function Diagrama({ shape }) {
  const played = shape.frets.filter((f) => f > 0);
  const top = played.length && Math.max(...played) > 4 ? Math.min(...played) : 1;
  const W = 70, H = 84, x0 = 10, y0 = 16, dx = 10, dy = 13;
  const barre = top > 1 || shape.frets.filter((f) => f === top).length >= 3 ? top : null;
  const barreStrings = barre ? shape.frets.map((f, i) => (f === barre ? i : -1)).filter((i) => i >= 0) : [];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="diagrama" role="img" aria-label={`Acorde ${shape.shown}`}>
      {top === 1 && <rect x={x0} y={y0 - 3} width={dx * 5} height={3} fill="currentColor" />}
      {top > 1 && <text x={x0 + dx * 5 + 4} y={y0 + dy * 0.7} fontSize="8" fill="currentColor">{top}</text>}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={`c${i}`} x1={x0 + i * dx} y1={y0} x2={x0 + i * dx} y2={y0 + dy * 5} stroke="currentColor" strokeWidth="0.8" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((j) => (
        <line key={`t${j}`} x1={x0} y1={y0 + j * dy} x2={x0 + dx * 5} y2={y0 + j * dy} stroke="currentColor" strokeWidth="0.8" />
      ))}
      {barreStrings.length >= 2 && (
        <rect
          x={x0 + barreStrings[0] * dx - 3}
          y={y0 + (barre - top) * dy + dy / 2 - 3.5}
          width={(barreStrings[barreStrings.length - 1] - barreStrings[0]) * dx + 6}
          height={7}
          rx={3.5}
          className="dot"
        />
      )}
      {shape.frets.map((f, i) => {
        const x = x0 + i * dx;
        if (f === -1) return <text key={i} x={x} y={y0 - 6} fontSize="8" textAnchor="middle" fill="currentColor">×</text>;
        if (f === 0) return <circle key={i} cx={x} cy={y0 - 8} r={2.6} fill="none" stroke="currentColor" strokeWidth="0.9" />;
        return <circle key={i} cx={x} cy={y0 + (f - top) * dy + dy / 2} r={3.6} className="dot" />;
      })}
    </svg>
  );
}

/**
 * Diagramas de guitarra de todos los acordes de la canción, ya en el tono en que se tocan
 * (tono − capo). Si un acorde es difícil, muestra una versión sencilla y lo indica.
 */
export default function DiagramasGuitarra({ content, steps, opts }) {
  const [open, setOpen] = useState(false);
  const chords = chordsInContent(convertPlainChords(content)).map((c) => (steps ? transposeChord(c, steps, { ...opts, notation: 'americano' }) : c));
  const shapes = [...new Map(chords.map((c) => guitarShape(c)).filter(Boolean).map((s) => [s.name, s])).values()];
  if (shapes.length === 0) return null;
  return (
    <div className="diagramas no-print">
      <button className={`btn small ${open ? 'primary' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        🎸 {open ? 'Ocultar acordes de guitarra' : 'Ver acordes de guitarra'}
      </button>
      {open && (
        <>
          <div className="diagramas-grid">
            {shapes.map((s) => (
              <figure key={s.name} className={s.simple ? 'simple' : ''}>
                <figcaption>
                  <strong>{s.name}</strong>
                  {s.simple && <span className="muted small"> → toca {s.shown}</span>}
                </figcaption>
                <Diagrama shape={s} />
              </figure>
            ))}
          </div>
          {shapes.some((s) => s.simple) && (
            <p className="muted small">Los acordes marcados tienen una versión sencilla que suena parecido. Si hay bajo (ej. D/F#), puedes tocar solo el acorde.</p>
          )}
        </>
      )}
    </div>
  );
}
