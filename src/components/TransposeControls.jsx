import { displayKey } from '../lib/chordpro.js';

export default function TransposeControls({ songKey, steps, onChange, notation, compact = false }) {
  const label = displayKey(songKey, steps, notation);
  return (
    <div className={`transpose ${compact ? 'compact' : ''}`} role="group" aria-label="Cambiar tono">
      {!compact && <span className="transpose-title">Tono</span>}
      <button type="button" className="btn round" onClick={() => onChange(steps - 1)} aria-label="Bajar medio tono">−</button>
      <span className="transpose-value" title="Tono actual">
        {label || (steps > 0 ? `+${steps}` : steps)}
      </span>
      <button type="button" className="btn round" onClick={() => onChange(steps + 1)} aria-label="Subir medio tono">+</button>
      {steps !== 0 && (
        <button type="button" className="btn ghost small" onClick={() => onChange(0)}>
          Original
        </button>
      )}
    </div>
  );
}
