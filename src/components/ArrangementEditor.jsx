import { useState } from 'react';
import { parseSong } from '../lib/chordpro.js';

/**
 * Permite elegir el orden de las secciones de una canción:
 * arrastrar para mover, ✕ para quitar y los botones de abajo para agregar (repetir).
 * `order` es una lista de nombres de sección; vacío o undefined = orden original.
 */
export default function ArrangementEditor({ content, order, onChange, fallbackOrder, resetLabel = 'Orden original' }) {
  const sections = parseSong(content);
  const names = new Set(sections.map((s) => s.name));
  const base = (order?.length ? order : fallbackOrder?.length ? fallbackOrder : sections.map((s) => s.name))
    .filter((n) => names.has(n));
  const typeOf = new Map(sections.map((s) => [s.name, s.type]));
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  if (sections.length === 0) return <p className="muted">La canción no tiene secciones.</p>;

  const commit = (list) => onChange(list);

  const move = (from, to) => {
    if (from === null || from === to) return;
    const list = [...base];
    const [item] = list.splice(from, 1);
    list.splice(to > from ? to - 1 : to, 0, item);
    commit(list);
  };

  const isCustom = Boolean(order?.length);

  return (
    <div className="arrangement">
      <ol className="chips" onDragLeave={() => setDragOver(null)}>
        {base.map((name, i) => (
          <li
            key={i}
            className={`chip ${typeOf.get(name)} ${dragFrom === i ? 'dragging' : ''} ${dragOver === i ? 'drop-before' : ''}`}
            draggable
            onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            onDragOver={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              setDragOver(e.clientX > rect.left + rect.width / 2 ? i + 1 : i);
            }}
            onDrop={(e) => { e.preventDefault(); move(dragFrom, dragOver ?? i); setDragFrom(null); setDragOver(null); }}
            title="Arrastra para mover"
          >
            <span className="grip" aria-hidden="true">⠿</span>
            <span>{name}</span>
            <button
              type="button"
              className="chip-x"
              aria-label={`Quitar ${name}`}
              onClick={() => commit(base.filter((_, k) => k !== i))}
              disabled={base.length === 1}
            >
              ✕
            </button>
          </li>
        ))}
        <li
          className={`chip-end ${dragOver === base.length ? 'drop-before' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(base.length); }}
          onDrop={(e) => { e.preventDefault(); move(dragFrom, base.length); setDragFrom(null); setDragOver(null); }}
        />
      </ol>
      <div className="row gap wrap small">
        <span className="muted">Agregar o repetir:</span>
        {sections.map((s) => (
          <button key={s.name} type="button" className={`btn small add-chip ${s.type}`} onClick={() => commit([...base, s.name])}>
            + {s.name}
          </button>
        ))}
        {isCustom && (
          <button type="button" className="btn ghost small" onClick={() => onChange(undefined)}>
            ↺ {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}
