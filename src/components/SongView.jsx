import { arrangeSections, chordOptions, guessKey, parseSong, sectionAbbr, sectionLabel, transposeChord } from '../lib/chordpro.js';
import { convertPlainChords } from '../lib/importar.js';
import { notaPorId } from '../lib/notas.js';
import Icon from './Icon.jsx';

// Separa el texto en palabras para que las líneas largas se puedan cortar
// sin separar un acorde de su sílaba ni partir una palabra en dos.
function splitWords(segments) {
  const pieces = [];
  for (const seg of segments) {
    const found = seg.text.match(/\S*\s*/g)?.filter(Boolean) || [];
    const words = found.length ? found : [''];
    words.forEach((w, i) => pieces.push({ chord: i === 0 ? seg.chord : '', text: w }));
  }
  // Junta los trozos de una misma palabra (ej. "fallé e" + [Esus]"scalar").
  const words = [];
  let cur = null;
  for (const p of pieces) {
    if (!cur) { cur = []; words.push(cur); }
    cur.push(p);
    if (/\s$/.test(p.text) || p.text === '') cur = null;
  }
  return words;
}

function Line({ segments, showChords, opts, steps }) {
  const hasChords = showChords && segments.some((s) => s.chord);
  if (!hasChords) {
    return <div className="line">{segments.map((s) => s.text).join('')}</div>;
  }
  return (
    <div className={`line with-chords ${segments.every((s) => !s.text.trim()) ? 'chords-only' : ''}`}>
      {splitWords(segments).map((word, i) => (
        <span className="word" key={i}>
          {word.map((s, j) => (
            <span className="seg" key={j}>
              <span className="chord">{s.chord ? transposeChord(s.chord, steps, opts) : ' '}</span>
              <span className="lyric">{s.text || ' '}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

// Notas preestablecidas de una sección (del director o propias).
function NotasSeccion({ list = [], onRemove, canEditDirector }) {
  if (!list.length) return null;
  return (
    <span className="notas-seccion">
      {list.map((n, k) => {
        const nota = notaPorId(n.id);
        const cls = `nota-chip ${n.mine ? 'mia' : 'director'}`;
        const body = <><Icon name={nota.icon} /> {nota.label}</>;
        return onRemove && (n.mine || canEditDirector) ? (
          <button key={k} className={cls} onClick={() => onRemove(n)} title="Quitar esta nota">{body} ✕</button>
        ) : (
          <span key={k} className={cls} title={n.mine ? 'Nota tuya (solo tú la ves)' : 'Nota del director'}>{body}</span>
        );
      })}
    </span>
  );
}

export default function SongView({ content, songKey, steps = 0, order, settings, fontSize, className = '', notes, onAddNote, onRemoveNote, canEditDirector = false }) {
  const text = convertPlainChords(content);
  const blocks = arrangeSections(parseSong(text), order);
  const opts = chordOptions(songKey || guessKey(text), steps, settings.notation);
  const showChords = settings.showChords;

  if (blocks.length === 0) {
    return <p className="muted">Esta canción todavía no tiene letra.</p>;
  }

  return (
    <div className={`song ${className}`} style={{ fontSize: fontSize ?? settings.fontSize }}>
      {blocks.map((b, i) => (
        <section className={`block ${b.type} k-${b.kind} ${b.marker ? 'marker' : ''}`} key={i} id={`seccion-${i}`}>
          <div className="block-label">
            <span className="sec-chip"><Abrev nombre={b.marker ? b.name : sectionLabel(b.name)} />{b.marker ? b.name : sectionLabel(b.name)}</span>
            {b.times > 1 && <span className="times">×{b.times}</span>}
            <NotasSeccion list={notes?.[b.name]} onRemove={onRemoveNote && ((n) => onRemoveNote(b.name, n))} canEditDirector={canEditDirector} />
            {onAddNote && (
              <button className="nota-add" onClick={() => onAddNote(b.name)} aria-label={`Agregar nota a ${b.name}`}>+ Nota</button>
            )}
          </div>
          {b.lines.map((l, j) =>
            l.type === 'comment' ? (
              <div className="comment" key={j}>{l.text}</div>
            ) : (
              <Line key={j} segments={l.segments} showChords={showChords} opts={opts} steps={steps} />
            )
          )}
        </section>
      ))}
    </div>
  );
}

/** Letra corta de la parte (ej. "V1", "C"), para la etiqueta de color. */
function Abrev({ nombre }) {
  const num = String(nombre).match(/(\d+)$/)?.[1] || '';
  return <span className="sec-abrev" aria-hidden="true">{sectionAbbr(nombre)}{num}</span>;
}
