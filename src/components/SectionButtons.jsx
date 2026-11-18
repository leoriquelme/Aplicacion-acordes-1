import { MAX_SECTION_NUMBER, SECTION_NAMES, nextSectionName } from '../lib/chordpro.js';

/**
 * Botones fijos para insertar secciones en el editor.
 * Cada botón pone "[NOMBRE]" donde está el cursor, numerando solo hasta 5.
 */
export default function SectionButtons({ existingNames, onInsert }) {
  return (
    <div className="section-buttons">
      <span className="muted small">Insertar sección:</span>
      {SECTION_NAMES.map((base) => {
        const next = nextSectionName(base, existingNames);
        const cls = base === 'CORO' ? 'sec-coro' : base === 'PUENTE' ? 'sec-puente' : '';
        return (
          <button
            key={base}
            type="button"
            className={`btn small sec-btn ${cls}`}
            disabled={!next}
            title={next ? `Insertar [${next}]` : `Ya hay ${MAX_SECTION_NUMBER} secciones ${base}`}
            onClick={() => next && onInsert(next)}
          >
            {next || base}
          </button>
        );
      })}
    </div>
  );
}
