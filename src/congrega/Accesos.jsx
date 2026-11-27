// Accesos rápidos a Oración y Agenda desde los Inicio de Congrega.
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useCongrega } from './datos.jsx';
import { usePeticiones } from './Oracion.jsx';

export function AccesoOracion() {
  const { pastor, myUid } = useCongrega();
  const lista = usePeticiones().filter((p) => p.estado !== 'respondida');
  const iglesia = lista.filter((p) => p.para === 'iglesia').length;
  const privadas = lista.filter((p) => p.para !== 'iglesia' && p.autorUid !== myUid).length;
  const detalle = pastor && privadas
    ? `${privadas} ${privadas === 1 ? 'petición' : 'peticiones'} solo para los pastores${iglesia ? ` · ${iglesia} de la iglesia` : ''}`
    : iglesia ? `${iglesia} ${iglesia === 1 ? 'petición' : 'peticiones'} de la iglesia este mes` : 'Pide oración o ora por los hermanos';
  return (
    <Link to="/congrega/oracion" className="card bloque-musica">
      <span className="bloque-musica-icono" aria-hidden="true"><Icon name="pray" size="1.6rem" /></span>
      <span className="grow"><strong>Oración</strong><span className="muted small">{detalle}</span></span>
      <span className="fila-flecha" aria-hidden="true">›</span>
    </Link>
  );
}

export function AccesoAgenda() {
  return (
    <Link to="/congrega/agenda" className="card bloque-musica">
      <span className="bloque-musica-icono" aria-hidden="true"><Icon name="calendar" size="1.6rem" /></span>
      <span className="grow"><strong>Agenda</strong><span className="muted small">Lo que viene y agregar a tu calendario</span></span>
      <span className="fila-flecha" aria-hidden="true">›</span>
    </Link>
  );
}

export function AccesoDirectorio() {
  return (
    <Link to="/congrega/directorio" className="card bloque-musica">
      <span className="bloque-musica-icono" aria-hidden="true"><Icon name="users" size="1.6rem" /></span>
      <span className="grow"><strong>Directorio de hermanos</strong><span className="muted small">El contacto de quienes lo quisieron compartir</span></span>
      <span className="fila-flecha" aria-hidden="true">›</span>
    </Link>
  );
}
