import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { cancionesEjemplo } from '../data/ejemplos.js';

/** Botón para agregar a la iglesia los himnos de ejemplo de dominio público. */
export default function AgregarEjemplos({ className = 'btn' }) {
  const { addExamples, restoreExamples, can } = useStore();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!can.edit || (!addExamples && !restoreExamples)) return null;
  return (
    <span className="row gap wrap">
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            if (addExamples) {
              const n = await addExamples();
              setMsg(n ? `✓ Se agregaron ${n} himnos.` : 'La iglesia ya tiene todos los himnos de ejemplo.');
            } else {
              restoreExamples();
              setMsg('✓ Himnos de ejemplo agregados.');
            }
          } catch (e) {
            setMsg(`No se pudo: ${e.message}`);
          }
          setBusy(false);
        }}
        title={cancionesEjemplo.map((s) => s.title).join(', ')}
      >
        📖 Agregar himnos de ejemplo ({cancionesEjemplo.length})
      </button>
      {msg && <span className={`small ${msg.startsWith('✓') ? 'ok' : 'muted'}`}>{msg}</span>}
    </span>
  );
}
