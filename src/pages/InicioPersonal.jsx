import { useAuth } from '../lib/cloud.jsx';
import Icon from '../components/Icon.jsx';
import VersiculoDelDia from '../components/VersiculoDelDia.jsx';
import Consejos from '../components/Consejos.jsx';

/** Inicio sin iglesia abierta. */
export default function InicioPersonal() {
  const { profile, user } = useAuth();
  const name = profile?.name || user.displayName || '';
  return (
    <div className="page">
      <section className="card bloque-iglesia">
        <div className="bloque-icono"><Icon name="user" /></div>
        <h1>Hola{name ? `, ${name.split(' ')[0]}` : ''}</h1>
      </section>
      <VersiculoDelDia />
      <Consejos />
    </div>
  );
}
