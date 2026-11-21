import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { descargarOracion } from '../lib/recordatorio.js';
import Icon from '../components/Icon.jsx';

// Recordatorio diario para orar (archivo de calendario). Escondido por ahora; poner true para volver a mostrarlo.
const MOSTRAR_RECORDATORIO = false;

// El conteo se reinició el 21-nov (clave nueva = todos parten de 0).
const MIS_KEY = 'cancionero-oraciones-2';
const ULTIMA_KEY = 'cancionero-ultima-oracion';
const ESPERA = 60 * 60 * 1000; // 1 hora entre una oración y la siguiente
const leerNum = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const guardarNum = (k, n) => { try { localStorage.setItem(k, String(n)); } catch { /* sin espacio */ } };

/** Apoyo: un botón para sumar oraciones por el proyecto y (más adelante) donar. */
export default function Apoyo() {
  const { prayers, pray } = useStore();
  const [mias, setMias] = useState(() => leerNum(MIS_KEY));
  const [ultima, setUltima] = useState(() => leerNum(ULTIMA_KEY));
  const [ahora, setAhora] = useState(() => Date.now());
  const [gracias, setGracias] = useState(false);
  const esperando = ahora - ultima < ESPERA;

  // Mientras espera, revisa cada minuto si ya pasó la hora.
  useEffect(() => {
    if (!esperando) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, [esperando]);
  const [hora, setHora] = useState('07:00');
  // Sin iglesia (o sin conexión al contador) se muestra el conteo de este equipo.
  const total = typeof prayers === 'number' ? prayers : mias;

  const cerrar = () => {
    // Al cerrar la ventana de gracias se aplica el conteo.
    setGracias(false);
    const n = mias + 1;
    const t = Date.now();
    setMias(n);
    setUltima(t);
    setAhora(t);
    guardarNum(MIS_KEY, n);
    guardarNum(ULTIMA_KEY, t);
    pray?.();
  };

  return (
    <div className="page apoyo">
      <Link to="/ajustes" className="back">← Ajustes</Link>
      <h1><Icon name="heart" /> Apoyo</h1>

      <section className="card oracion">
        <h2>Oremos por el proyecto</h2>
        <div className="contador" aria-live="polite">
          <strong>{total}</strong>
          <span className="muted">{total === 1 ? 'oración' : 'oraciones'}</span>
        </div>
        <button className="btn primary orar-btn" disabled={esperando || gracias} onClick={() => setGracias(true)}>
          <Icon name="pray" /> {esperando ? 'Gracias por orar' : 'Oré por el proyecto'}
        </button>
        <p className="muted small center">Tú has orado {mias} {mias === 1 ? 'vez' : 'veces'}.</p>
      </section>

      {gracias && (
        createPortal(<div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="gracias-titulo" onClick={cerrar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icono"><Icon name="pray" size="2.6rem" /></div>
            <h2 id="gracias-titulo">¡Gracias por orar por el proyecto!</h2>
            <button className="btn primary big-inline" onClick={cerrar} autoFocus>Amén</button>
          </div>
        </div>, document.body)
      )}

      {MOSTRAR_RECORDATORIO && <section className="card">
        <h2>Recordatorio diario para orar</h2>
        <div className="row gap wrap">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn" disabled={!hora} onClick={() => descargarOracion(hora)}><Icon name="bell" /> Recordarme cada día</button>
        </div>
      </section>}

      <section className="card donar">
        <h2>Donar</h2>
        <button className="btn big-inline" disabled aria-disabled="true"><Icon name="heart" /> Donar</button>
        <p className="muted small">Muy pronto.</p>
      </section>
    </div>
  );
}
