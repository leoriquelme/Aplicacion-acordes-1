import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import Icon from '../components/Icon.jsx';
import { elegirApp } from './apps.js';
import './congrega.css';

// Como el selector de productos de Planning Center: un solo inicio de sesión y una tarjeta por app.
const APPS = [
  { id: 'adora', ruta: '/', nombre: 'Adora', icon: 'music', texto: 'Canciones, eventos, equipos y letras en vivo.' },
  { id: 'congrega', ruta: '/congrega', nombre: 'Congrega', icon: 'users', texto: 'Personas, familias, asistencia y cumpleaños.', iglesia: true },
];

export default function Apps() {
  const { mode, church } = useStore();
  const navigate = useNavigate();
  const conIglesia = mode === 'cloud' && Boolean(church);
  return (
    <div className="page cg cg-stack">
      <h1 className="cg-titulo">¿Qué quieres usar?</h1>
      <p className="muted">Usas la misma cuenta en todas. Cambia cuando quieras tocando el nombre de arriba.</p>
      <div className="cg-apps">
        {APPS.map((a) => {
          const bloqueada = a.iglesia && !conIglesia;
          return (
            <button key={a.id} type="button" className="card cg-app" disabled={bloqueada} onClick={() => { elegirApp(a.id); navigate(a.ruta); }}>
              <span className="cg-app-icono"><Icon name={a.icon} size="1.6em" /></span>
              <span className="cg-quien"><span className="cg-nombre">{a.nombre}</span><span className="cg-meta">{bloqueada ? 'Primero entra a tu iglesia.' : a.texto}</span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
