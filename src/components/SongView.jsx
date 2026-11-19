import { arrangeSections, chordOptions, parseSong, transposeChord } from '../lib/chordpro.js';

// Separa el texto en palabras para que las líneas largas se puedan cortar
// sin separar un acorde de su sílaba.
function splitWords(segments) {
  const out = [];
  for (const seg of segments) {
    const found = seg.text.match(/\S*\s*/g)?.filter(Boolean) || [];
    const words = found.length ? found : [''];
    words.forEach((w, i) => out.push({ chord: i === 0 ? seg.chord : '', text: w }));
  }
  return out;
}

function Line({ segments, showChords, opts, steps }) {
  const hasChords = showChords && segments.some((s) => s.chord);
  if (!hasChords) {
    return <div className="line">{segments.map((s) => s.text).join('')}</div>;
  }
  return (
    <div className={`line with-chords ${segments.every((s) => !s.text.trim()) ? 'chords-only' : ''}`}>
      {splitWords(segments).map((s, i) => (
        <span className="seg" key={i}>
          <span className="chord">{s.chord ? transposeChord(s.chord, steps, opts) : ' '}</span>
          <span className="lyric">{s.text || ' '}</span>
        </span>
      ))}
    </div>
  );
}

export default function SongView({ content, songKey, steps = 0, order, settings, fontSize, className = '' }) {
  const blocks = arrangeSections(parseSong(content), order);
  const opts = chordOptions(songKey, steps, settings.notation);
  const showChords = settings.showChords;

  if (blocks.length === 0) {
    return <p className="muted">Esta canción todavía no tiene letra.</p>;
  }

  return (
    <div className={`song ${className}`} style={{ fontSize: fontSize ?? settings.fontSize }}>
      {blocks.map((b, i) => (
        <section className={`block ${b.type} k-${b.kind} ${b.marker ? 'marker' : ''}`} key={i} id={`seccion-${i}`}>
          <div className="block-label">
            <span className="sec-chip">{b.name}</span>
            {b.times > 1 && <span className="times">×{b.times}</span>}
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
