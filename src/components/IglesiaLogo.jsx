import { useStore } from '../lib/store.jsx';
import Icon from './Icon.jsx';

/** El logo que subió el Administrador, o el ícono de iglesia si no hay. */
export default function IglesiaLogo({ className = 'bloque-icono', size }) {
  const { church } = useStore();
  if (church?.logo) return <img className={`${className} logo-iglesia`} src={church.logo} alt={church.name} />;
  return <span className={className}><Icon name="church" size={size} /></span>;
}
