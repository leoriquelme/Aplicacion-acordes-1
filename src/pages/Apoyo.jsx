import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { descargarOracion } from '../lib/recordatorio.js';
import Icon from '../components/Icon.jsx';

const MIS_KEY = 'cancionero-oraciones';
const leer = () => { try { return Number(localStorage.getItem(MIS_KEY)) || 0; } catch { return 0; } };
const guardar = (n) => { try { localStorage.setItem(MIS_KEY, String(n)); } catch { /* sin espacio */ } };

/** Apoyo: un botón para sumar oraciones por el proyecto y (más adelante) donar. */
export default function Apoyo() {
  const { prayers, pray } = useStore();
  const [mias, setMias] = useState(leer);
  const [gracias, setGracias] = useState(false);
  const [hora, setHora] = useState('07:00');
  // Sin iglesia (o sin conexión al contador) se muestra el conteo de este equipo.
  const total = typeof prayers === 'number' ? prayers : mias;

  const cerrar = () => {
    // Al cerrar la ventana de gracias se aplica el conteo.
    setGracias(false);
    const n = mias + 1;
    setMias(n);
    guardar(n);
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
        <button className="btn primary orar-btn" onClick={() => setGracias(true)}><Icon name="pray" /> Oré por el proyecto</button>
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

      <section className="card">
        <h2>Recordatorio diario para orar</h2>
        <p className="muted small">Se agrega a tu calendario y te avisa todos los días a esa hora.</p>
        <div className="row gap wrap">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn" disabled={!hora} onClick={() => descargarOracion(hora)}><Icon name="bell" /> Recordarme cada día</button>
        </div>
      </section>

      <section className="card donar">
        <h2>Donar</h2>
        <p className="muted small">Tu apoyo ayudará a mantener el Cancionero gratis para todas las iglesias.</p>
        <button className="btn big-inline" disabled aria-disabled="true"><Icon name="heart" /> Donar</button>
        <p className="muted small">Todavía no disponible. Muy pronto.</p>
      </section>
    </div>
  );
}
