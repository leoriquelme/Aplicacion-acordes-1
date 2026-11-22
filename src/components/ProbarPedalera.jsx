import { useEffect, useRef, useState } from 'react';
import { accionPedal } from '../lib/pedal.js';
import PedalCaptura, { esTactil, marcarPedalera } from './PedalCaptura.jsx';

const NOMBRE = {
  'seccion+': 'avanza', 'seccion-': 'retrocede', 'cancion+': 'canción siguiente', 'cancion-': 'canción anterior',
};

// Para saber qué tecla manda la pedalera en este equipo: muestra cada tecla que llega.
export default function ProbarPedalera() {
  const [activo, setActivo] = useState(false);
  const [teclas, setTeclas] = useState([]);
  const cajaRef = useRef(null);
  const pedalRef = useRef(null);
  const [usarCampo] = useState(esTactil);
  const [lista, setLista] = useState(false);
  // En iPhone/iPad el foco tiene que quedar en el campo invisible, y solo se puede al tocar.
  const enfocar = () => (usarCampo ? pedalRef.current : cajaRef.current)?.focus({ preventScroll: true });

  useEffect(() => {
    if (!activo) return undefined;
    enfocar();
    const anotar = (e) => {
      const a = accionPedal(e);
      if (a) { e.preventDefault(); marcarPedalera(); }
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
      {usarCampo && <PedalCaptura ref={pedalRef} onFoco={setLista} />}
      <p className="muted">Toca el recuadro y pisa los pedales. Aquí aparece qué tecla le llega a la app.</p>
      {!activo ? (
        <button type="button" className="btn primary" onClick={() => { setActivo(true); pedalRef.current?.focus({ preventScroll: true }); }}>Empezar prueba</button>
      ) : (
        <div
          ref={cajaRef}
          tabIndex={-1}
          className="probar-pedalera-caja"
          onClick={enfocar}
        >
          {usarCampo && <div className={lista ? 'ok' : 'muted'}>{lista ? 'Lista: pisa la pedalera.' : 'Toca aquí para empezar.'}</div>}
          {teclas.length ? teclas.map((t, i) => <div key={i}>{t}</div>) : <div className="muted">Esperando la pedalera…</div>}
        </div>
      )}
    </div>
  );
}
