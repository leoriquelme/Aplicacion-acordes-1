import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { CongregaProvider } from './datos.jsx';
import Inicio from './Inicio.jsx';
import Asistencia from './Asistencia.jsx';
import Personas from './Personas.jsx';
import Ficha from './Ficha.jsx';
import Ajustes from './Ajustes.jsx';
import './congrega.css';

/** Congrega: personas y asistencia de la iglesia abierta, con los mismos datos de Adora. */
export default function Congrega() {
  const { mode, church, role } = useStore();
  if (mode !== 'cloud' || !church) {
    return <div className="card">Congrega funciona con una iglesia abierta. Entra a tu iglesia desde <strong>Ajustes</strong> de Adora y vuelve aquí.</div>;
  }
  const tabs = [['', 'Inicio'], ['asistencia', 'Asistencia'], ['personas', 'Personas']];
  if (role === 'admin') tabs.push(['ajustes', 'Ajustes']);
  return (
    <CongregaProvider>
      <div className="cg page">
        <nav className="cg-subtabs" aria-label="Congrega">
          {tabs.map(([to, label]) => <NavLink key={to} to={`/congrega/${to}`} end={!to} className={({ isActive }) => (isActive ? 'activo' : '')}>{label}</NavLink>)}
        </nav>
        <Routes>
          <Route index element={<Inicio />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="personas" element={<Personas />} />
          <Route path="personas/:key" element={<Ficha />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/congrega" replace />} />
        </Routes>
      </div>
    </CongregaProvider>
  );
}
