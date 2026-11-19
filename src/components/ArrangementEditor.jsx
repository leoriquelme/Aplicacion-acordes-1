import { useState } from 'react';
import {
  MARKER, MAX_CUSTOM, cleanCustomName, flattenGroups, groupOrder, isMarker, markerName, parseSong, sectionKind,
  validCustomName,
} from '../lib/chordpro.js';

// Secciones que se pueden agregar al orden aunque no tengan letra (solo una marca).
const MARKERS = ['INTRO', 'INTERLUDIO', 'INSTRUMENTAL', 'FINAL'];
const CUSTOM = '__personalizada__';

/**
 * Orden de las secciones en una columna vertical:
 * arrastrar para mover, − / + para repetir (×2, ×3…), ✕ para quitar
 * y una lista desplegable para agregar secciones o marcas sin letra.
 * `order` es una lista de nombres; vacío o undefined = orden original.
 */
export default function ArrangementEditor({ content, order, onChange, fallbackOrder, resetLabel = 'Orden original', readOnly = false }) {
  const sections = parseSong(content);
  const names = new Set(sections.map((s) => s.name));
  const base = (order?.length ? order : fallbackOrder?.length ? fallbackOrder : sections.map((s) => s.name))
    .filter((n) => names.has(n) || isMarker(n));
  const groups = groupOrder(base);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  if (sections.length === 0) return <p className="muted small">La canción no tiene secciones.</p>;

  const commit = (g) => onChange(flattenGroups(g));
  const setTimes = (i, times) => commit(groups.map((g, k) => (k === i ? { ...g, times } : g)));
  const move = (from, to) => {
    if (from === null || to === null || from === to || from + 1 === to) return;
    const list = [...groups];
    const [item] = list.splice(from, 1);
    list.splice(to > from ? to - 1 : to, 0, item);
    commit(list);
  };
  const add = (name) => commit([...groups, { name, times: 1 }]);

  const customMarkers = [...new Set(base.filter(isMarker).map(markerName).filter((n) => sectionKind(n) === 'custom'))];
  const customFull = customMarkers.length >= MAX_CUSTOM;

  const choose = (value) => {
    if (!value) return;
    if (value === CUSTOM) { setWriting(true); setError(''); return; }
    add(value);
  };
  const addCustom = () => {
    const name = cleanCustomName(text);
    if (!validCustomName(name)) { setError('Usa al menos 3 letras, que no sea un acorde ni un tipo de la lista.'); return; }
    if (!customMarkers.includes(name) && customFull) { setError(`Máximo ${MAX_CUSTOM} personalizadas.`); return; }
    add(MARKER + name);
    setText(''); setWriting(false); setError('');
  };

  const isCustom = Boolean(order?.length);

  return (
    <div className="arrangement">
      <ol className="order-list" onDragLeave={() => setDragOver(null)}>
        {groups.map((g, i) => {
          const label = markerName(g.name);
          const kind = sectionKind(label);
          return (
            <li
              key={i}
              className={`order-item k-${kind} ${dragFrom === i ? 'dragging' : ''} ${dragOver === i ? 'drop-before' : ''}`}
              draggable={!readOnly}
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setDragOver(e.clientY > r.top + r.height / 2 ? i + 1 : i);
              }}
              onDrop={(e) => { e.preventDefault(); move(dragFrom, dragOver ?? i); setDragFrom(null); setDragOver(null); }}
              title={readOnly ? label : 'Arrastra para mover'}
            >
              {!readOnly && <span className="grip" aria-hidden="true">⠿</span>}
              <span className="order-num">{i + 1}</span>
              <span className="order-name">
                {label}
                {isMarker(g.name) && <span className="muted small"> · sin letra</span>}
              </span>
              {g.times > 1 && <span className="times">×{g.times}</span>}
              {!readOnly && (
                <span className="order-actions">
                  <button type="button" className="mini" aria-label={`Una vez menos ${label}`} title="Repetir una vez menos" disabled={g.times === 1} onClick={() => setTimes(i, g.times - 1)}>−</button>
                  <button type="button" className="mini" aria-label={`Repetir ${label}`} title="Repetir (×2, ×3…)" disabled={g.times >= 4} onClick={() => setTimes(i, g.times + 1)}>+</button>
                  <button type="button" className="mini x" aria-label={`Quitar ${label}`} title="Quitar" disabled={groups.length === 1} onClick={() => commit(groups.filter((_, k) => k !== i))}>✕</button>
                </span>
              )}
            </li>
          );
        })}
        {!readOnly && (
          <li
            className={`order-end ${dragOver === groups.length ? 'drop-before' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(groups.length); }}
            onDrop={(e) => { e.preventDefault(); move(dragFrom, groups.length); setDragFrom(null); setDragOver(null); }}
          />
        )}
      </ol>
      {!readOnly && (
        <>
          <select className="section-select" value="" onChange={(e) => choose(e.target.value)} aria-label="Agregar sección al orden">
            <option value="">＋ Agregar sección…</option>
            <optgroup label="De la letra">
              {sections.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </optgroup>
            <optgroup label="Sin letra (solo una marca)">
              {MARKERS.map((m) => <option key={m} value={MARKER + m}>{m}</option>)}
              {customMarkers.map((m) => <option key={m} value={MARKER + m}>{m}</option>)}
              <option value={CUSTOM} disabled={customFull}>
                ✎ Personalizada…{customFull ? ` (ya hay ${MAX_CUSTOM})` : ` (quedan ${MAX_CUSTOM - customMarkers.length})`}
              </option>
            </optgroup>
          </select>
          {writing && (
            <div className="row gap wrap">
              <input
                className="sec-input grow"
                autoFocus
                value={text}
                placeholder="Ej. SOLO DE GUITARRA"
                onChange={(e) => setText(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
                  if (e.key === 'Escape') setWriting(false);
                }}
              />
              <button type="button" className="btn small primary" onClick={addCustom}>Agregar</button>
              <button type="button" className="btn small ghost" onClick={() => { setWriting(false); setError(''); }}>✕</button>
            </div>
          )}
          {error && <p className="error small">{error}</p>}
          {isCustom && (
            <button type="button" className="btn ghost small" onClick={() => onChange(undefined)}>
              ↺ {resetLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
