import { createPortal } from 'react-dom';
import { useState } from 'react';
import { NOTAS, alternarNota } from '../lib/notas.js';
import { sectionLabel } from '../lib/chordpro.js';
import Icon from './Icon.jsx';

/**
 * Ventana para elegir una nota preestablecida para una sección.
 * El director puede dejarla "para todos"; cualquiera puede dejarla "solo para mí".
 */
export function ElegirNota({ section, canDirector, director = [], mias = [], onDirector, onMia, onClose, container }) {
  const [tipo, setTipo] = useState(canDirector ? 'director' : 'mia');
  const list = tipo === 'director' ? director : mias;
  const elegir = (id) => {
    const next = alternarNota(list, section, id);
    (tipo === 'director' ? onDirector : onMia)(next);
  };
  return createPortal(
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Agregar nota" onClick={onClose}>
      <div className="modal modal-roles modal-notas" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabeza">
          <h2>Nota para {sectionLabel(section)}</h2>
          <button className="btn ghost small" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {canDirector && (
          <div className="seg-toggle" role="tablist">
            <button role="tab" aria-selected={tipo === 'director'} className={tipo === 'director' ? 'on' : ''} onClick={() => setTipo('director')}>Para todos (director)</button>
            <button role="tab" aria-selected={tipo === 'mia'} className={tipo === 'mia' ? 'on' : ''} onClick={() => setTipo('mia')}>Solo para mí</button>
          </div>
        )}
        <p className="muted small">
          {tipo === 'director' ? 'La ven todos.' : 'Solo tú la ves.'}
        </p>
        <div className="notas-opciones">
          {NOTAS.map((n) => {
            const on = list.some((x) => x.section === section && x.note === n.id);
            return (
              <button key={n.id} className={`nota-opcion ${on ? 'on' : ''}`} onClick={() => elegir(n.id)} aria-pressed={on}>
                <Icon name={n.icon} /> {n.label}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.8rem' }}>
          <button className="btn primary" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>,
    container || document.body,
  );
}
