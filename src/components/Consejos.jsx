import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { useAuth } from '../lib/cloud.jsx';
import { todayISO } from '../lib/dates.js';
import { consejosPara, guardarOcultos, leerOcultos, numeroDelDia } from '../lib/consejos.js';
import Icon from './Icon.jsx';

const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** En Inicio, debajo del versículo: un consejo de uso a la vez. Cambia cada día, se puede pasar al siguiente o esconder. */
export default function Consejos() {
  const { mode, can = {}, me, events = [], settings } = useStore();
  const { profile } = useAuth() || {};
  const [ocultos, setOcultos] = useState(leerOcultos);
  const [salto, setSalto] = useState(0);

  const lista = consejosPara({
    mode, can,
    birthDate: profile?.birthDate || '',
    photo: me?.photo || '',
    tema: settings?.tema,
    instalada: instalada(),
    eventosProximos: events.filter((e) => e.date >= todayISO()).length,
  }, ocultos);
  if (lista.length === 0) return null;
  const consejo = lista[(numeroDelDia() + salto) % lista.length];

  const esconder = () => {
    const nuevos = [...ocultos, consejo.id];
    setOcultos(nuevos);
    guardarOcultos(nuevos);
  };

  return (
    <section className="card bloque-consejo" aria-label="Consejo">
      <div className="consejo-arriba">
        <span className="consejo-etiqueta"><Icon name="bulb" /> Consejo</span>
        <button className="btn ghost small consejo-x" onClick={esconder} aria-label="No mostrar más este consejo" title="No mostrar más este consejo">✕</button>
      </div>
      <div className="consejo-cuerpo">
        <span className="consejo-icono"><Icon name={consejo.icono} /></span>
        <div className="grow">
          <h3>{consejo.titulo}</h3>
          <p>{consejo.texto}</p>
        </div>
      </div>
      <div className="consejo-botones">
        <Link className="btn small primary" to={consejo.to}>{consejo.boton}</Link>
        {lista.length > 1 && <button className="btn small ghost" onClick={() => setSalto((s) => s + 1)}>Otro consejo</button>}
      </div>
    </section>
  );
}
