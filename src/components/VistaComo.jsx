import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { VISTAS } from '../congrega/permisos.js';
import { Fila, FilaAbre, Grupo } from './Comunicacion.jsx';
import Icon from './Icon.jsx';

/**
 * "Ver la app como…" (solo el Súper admin): elegir un perfil para ver la app como la ven los demás.
 * Solo cambia lo que se muestra en este equipo, hasta cerrar la pestaña o tocar "Volver a mi perfil".
 */
export function VistaComoAjustes() {
  const { mode, esDuenoReal, vistaComo, setVistaComo } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (mode !== 'cloud' || !esDuenoReal) return null;
  const elegir = (id) => { setVistaComo(id); navigate(pathname.startsWith('/congrega') ? '/congrega' : '/'); };
  return (
    <Grupo titulo="Súper admin">
    <FilaAbre label={<><Icon name="user" /> Ver la app como…</>}>
      <p className="small">Mira la app como la ve otro perfil, sin cambiar tu cuenta. Solo cambia en este equipo.</p>
      <div className="vista-opciones">
        {VISTAS.map((v) => (
          <button key={v.id} type="button" className={`btn small${vistaComo?.id === v.id ? ' primary' : ''}`} onClick={() => elegir(v.id)}>{v.label}</button>
        ))}
      </div>
      {vistaComo && <Fila label="Volver a mi perfil (Súper admin)" onClick={() => setVistaComo('')} />}
    </FilaAbre>
    </Grupo>
  );
}

/** Barra arriba mientras se ve la app como otro perfil. */
export function BarraVistaComo() {
  const { vistaComo, setVistaComo } = useStore();
  if (!vistaComo) return null;
  return (
    <div className="en-vivo-barra vista-barra" role="status">
      <Icon name="user" />
      <span className="grow">Estás viendo la app como <strong>{vistaComo.label}</strong></span>
      <select aria-label="Cambiar perfil" value={vistaComo.id} onChange={(e) => setVistaComo(e.target.value)}>
        {VISTAS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <button type="button" className="btn small primary" onClick={() => setVistaComo('')}>Volver a mi perfil</button>
    </div>
  );
}
