import { useState } from 'react';
import {
  MAX_CUSTOM, MAX_SECTION_NUMBER, SECTION_NAMES, cleanCustomName, nextSectionName, sectionKind, validCustomName,
} from '../lib/chordpro.js';

const CUSTOM = '__personalizada__';

/**
 * Lista desplegable para insertar una sección en el editor.
 * Pone "[NOMBRE]" donde está el cursor y numera sola hasta 5.
 * La última opción permite escribir una sección personalizada (máximo 3 distintas por canción).
 */
export default function SectionButtons({ existingNames, customBases = [], onInsert }) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const customFull = customBases.length >= MAX_CUSTOM;

  const choose = (value) => {
    if (!value) return;
    if (value === CUSTOM) {
      setWriting(true);
      setError('');
      return;
    }
    const next = nextSectionName(value, existingNames);
    if (next) onInsert(next);
  };

  const addCustom = () => {
    const name = cleanCustomName(text);
    if (!validCustomName(name)) {
      setError('Usa un nombre de al menos 3 letras que no sea un acorde ni una sección de la lista.');
      return;
    }
    if (!customBases.includes(name) && customFull) {
      setError(`Ya hay ${MAX_CUSTOM} secciones personalizadas en esta canción.`);
      return;
    }
    const next = nextSectionName(name, existingNames);
    if (!next) {
      setError(`Ya hay ${MAX_SECTION_NUMBER} secciones ${name}.`);
      return;
    }
    onInsert(next);
    setText('');
    setWriting(false);
    setError('');
  };

  return (
    <div className="section-buttons">
      <select
        className="section-select"
        value=""
        onChange={(e) => choose(e.target.value)}
        aria-label="Agregar sección"
      >
        <option value="">＋ Agregar sección…</option>
        {SECTION_NAMES.map((base) => {
          const next = nextSectionName(base, existingNames);
          return (
            <option key={base} value={base} disabled={!next}>
              {next || `${base} (máximo ${MAX_SECTION_NUMBER})`}
            </option>
          );
        })}
        {customBases.map((base) => {
          const next = nextSectionName(base, existingNames);
          return (
            <option key={base} value={base} disabled={!next}>
              {next || base} · personalizada
            </option>
          );
        })}
        <option value={CUSTOM} disabled={customFull}>
          ✎ Personalizada…{customFull ? ` (ya hay ${MAX_CUSTOM})` : ` (quedan ${MAX_CUSTOM - customBases.length})`}
        </option>
      </select>
      {writing && (
        <span className="row gap wrap">
          <input
            className="sec-input"
            autoFocus
            value={text}
            placeholder="Ej. SOLO DE GUITARRA"
            onChange={(e) => setText(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
              if (e.key === 'Escape') setWriting(false);
            }}
          />
          <button type="button" className={`btn small sec-btn k-${sectionKind(text)}`} onClick={addCustom}>Agregar</button>
          <button type="button" className="btn small ghost" onClick={() => { setWriting(false); setError(''); }}>Cancelar</button>
        </span>
      )}
      {error && <span className="error small">{error}</span>}
    </div>
  );
}
