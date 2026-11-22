import { useEffect, useRef, useState } from 'react';
import { accionPedal } from '../lib/pedal.js';

const NOMBRE = {
  'seccion+': 'avanza', 'seccion-': 'retrocede', 'cancion+': 'canción siguiente', 'cancion-': 'canción anterior',
};

// Para saber qué tecla manda la pedalera en este equipo: muestra cada tecla que llega.
export default function ProbarPedalera() {
  const [activo, setActivo] = useState(false);
  const [teclas, setTeclas] = useState([]);
  const cajaRef = useRef(null);

  useEffect(() => {
    if (!activo) return undefined;
    cajaRef.current?.focus({ preventScroll: true });
    const anotar = (e) => {
      const a = accionPedal(e);
      if (a) e.preventDefault();
      const linea = `${e.type === 'keydown' ? 'Pisa:' : 'Suelta:'} ${e.key === ' ' ? 'Espacio' : e.key} · ${e.code || '-'} · ${e.keyCode || 0}${e.repeat ? ' · repite' : ''} → ${a ? NOMBRE[a] : 'no hace nada'}`;
      setTeclas((t) => [linea, ...t].slice(0, 8));
    };
    document.addEventListener('keydown', anotar, true);
    document.addEventListener('keyup', anotar, true);
    return () => {
      document.removeEventListener('keydown', anotar, true);
      document.removeEventListener('keyup', anotar, true);
    };
  }, [activo]);

  return (
    <div className="probar-pedalera">
      <p className="muted">Toca el recuadro y pisa los pedales. Aquí aparece qué tecla le llega a la app.</p>
      {!activo ? (
        <button type="button" className="btn primary" onClick={() => setActivo(true)}>Empezar prueba</button>
      ) : (
        <div
          ref={cajaRef}
          tabIndex={-1}
          className="probar-pedalera-caja"
          onClick={() => cajaRef.current?.focus({ preventScroll: true })}
        >
          {teclas.length ? teclas.map((t, i) => <div key={i}>{t}</div>) : <div className="muted">Esperando la pedalera…</div>}
        </div>
      )}
    </div>
  );
}
