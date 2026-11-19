import { MAX_SECTION_NUMBER, SECTION_NAMES, sectionKind } from '../lib/chordpro.js';
import { mergeWithPrevious, removeSection, sectionNames, setSectionType, splitSection } from '../lib/importar.js';

const plain = (line) => line.replace(/\[([^\]]*)\]/g, '');

/**
 * Lista de las secciones detectadas para corregirlas a mano:
 * cambiar el tipo, cortar una sección en dos, unirla con la anterior o quitarla.
 */
export default function SectionAdjuster({ state, onChange }) {
  const names = sectionNames(state.sections);
  const count = (base, except) => state.sections.filter((x, k) => k !== except && x.base === base).length;

  return (
    <div className="adjuster">
      <p className="muted small">
        Corrige las secciones si hace falta: cambia el tipo en el menú, pulsa <strong>✂</strong> entre dos líneas
        para cortar una sección en dos, o une una sección con la de arriba.
      </p>
      {state.sections.map((sec, i) => (
        <div key={i} className={`adj-section k-${sectionKind(sec.base)}`}>
          <div className="adj-head">
            <select
              value={sec.base}
              onChange={(e) => onChange(setSectionType(state, i, e.target.value))}
              aria-label={`Tipo de la sección ${i + 1}`}
            >
              {SECTION_NAMES.map((b) => (
                <option key={b} value={b} disabled={b !== sec.base && count(b, i) >= MAX_SECTION_NUMBER}>{b}</option>
              ))}
            </select>
            <strong className="adj-name">[{names[i]}]</strong>
            <span className="grow" />
            {i > 0 && (
              <button type="button" className="btn small ghost" onClick={() => onChange(mergeWithPrevious(state, i))} title="Juntar con la sección de arriba">
                ⤒ Unir con la anterior
              </button>
            )}
            <button type="button" className="btn small ghost danger" onClick={() => onChange(removeSection(state, i))} title="Quitar esta sección">
              ✕ Quitar
            </button>
          </div>
          <ol className="adj-lines">
            {sec.lines.map((l, k) => (
              <li key={k}>
                {k > 0 && (
                  <button
                    type="button"
                    className="adj-cut"
                    title="Empezar una sección nueva desde esta línea"
                    onClick={() => onChange(splitSection(state, i, k, nextBase(sec.base, state.sections)))}
                  >
                    ✂
                  </button>
                )}
                <span className="adj-text">{plain(l).trim() || <em className="muted">(solo acordes)</em>}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      {state.sections.length === 0 && <p className="muted">No quedan secciones.</p>}
    </div>
  );
}

// Al cortar, la parte nueva empieza con el mismo tipo si cabe; si no, VERSO.
function nextBase(base, sections) {
  return sections.filter((x) => x.base === base).length < MAX_SECTION_NUMBER ? base : 'VERSO';
}
