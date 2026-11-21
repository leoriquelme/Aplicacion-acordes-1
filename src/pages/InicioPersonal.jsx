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
            {tiene ? 'Abre tu iglesia en Mi iglesia.' : 'Únete o crea tu iglesia en Mi iglesia.'}
          </p>
        </div>
      </section>
      <VersiculoDelDia />
    </div>
  );
}
