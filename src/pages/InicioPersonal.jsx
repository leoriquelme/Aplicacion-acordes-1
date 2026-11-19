import { Link } from 'react-router-dom';
import { useAuth } from '../lib/cloud.jsx';
import Icon from '../components/Icon.jsx';
import VersiculoDelDia from '../components/VersiculoDelDia.jsx';

/** Inicio sin iglesia abierta. */
export default function InicioPersonal() {
  const { profile, user } = useAuth();
  const name = profile?.name || user.displayName || '';
  const tiene = Object.keys(profile?.churches || {}).length > 0;
  return (
    <div className="page">
      <section className="card bloque-iglesia">
        <div className="bloque-icono"><Icon name="user" /></div>
        <div>
          <h1>Hola{name ? `, ${name.split(' ')[0]}` : ''}</h1>
          <p className="muted">
            {tiene ? 'Para ver los eventos y el equipo de tu iglesia, ábrela en la pestaña Mi iglesia.' : 'Para ver los eventos y el equipo de tu iglesia, únete con su código o crea la tuya en la pestaña Mi iglesia.'}
          </p>
          <Link className="btn primary" to="/mi-iglesia"><Icon name="church" /> Ir a Mi iglesia</Link>
        </div>
      </section>
      <VersiculoDelDia />
    </div>
  );
}
