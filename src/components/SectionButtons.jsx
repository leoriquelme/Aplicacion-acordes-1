import { useState } from 'react';

export const BASE_SECTIONS = ['Verso', 'Coro', 'Puente'];

/** Siguiente nombre libre: "Verso" → "Verso 3" si ya existen Verso 1 y 2. */
export function nextSectionName(label, existingNames) {
  if (label === 'Verso') {
    let n = 1;
    while (existingNames.includes(`Verso ${n}`)) n++;
    return `Verso ${n}`;
  }
  if (!existingNames.includes(label)) return label;
  let n = 2;
  while (existingNames.includes(`${label} ${n}`)) n++;
  return `${label} ${n}`;
}

/**
 * Barra de botones para insertar secciones en el editor.
 * Los botones propios se guardan en los ajustes (settings.sectionButtons).
 */
export default function SectionButtons({ custom, onInsert, onAddCustom, onRemoveCustom }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const add = () => {
    const n = name.trim();
    if (n && !BASE_SECTIONS.includes(n) && !custom.includes(n)) onAddCustom(n);
    if (n) onInsert(n);
    setName('');
    setAdding(false);
  };

  return (
    <div className="section-buttons">
      <span className="muted small">Insertar sección:</span>
      {BASE_SECTIONS.map((l) => (
        <button key={l} type="button" className={`btn small sec-btn sec-${l.toLowerCase()}`} onClick={() => onInsert(l)}>
          + {l}
        </button>
      ))}
      {custom.map((l) => (
        <span key={l} className="sec-custom">
          <button type="button" className="btn small sec-btn" onClick={() => onInsert(l)}>+ {l}</button>
          <button type="button" className="sec-x" title={`Borrar el botón "${l}"`} aria-label={`Borrar el botón ${l}`} onClick={() => onRemoveCustom(l)}>✕</button>
        </span>
      ))}
      {adding ? (
        <span className="row gap">
          <input
            autoFocus
            className="sec-input"
            value={name}
            placeholder="Ej. Intro, Pre-coro, Final"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(); }
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <button type="button" className="btn small primary" onClick={add}>Agregar</button>
          <button type="button" className="btn small ghost" onClick={() => setAdding(false)}>Cancelar</button>
        </span>
      ) : (
        <button type="button" className="btn small ghost" onClick={() => setAdding(true)}>+ Nuevo botón…</button>
      )}
    </div>
  );
}
