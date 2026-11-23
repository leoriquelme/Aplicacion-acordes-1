import { Navigate, Route, Routes } from 'react-router-dom';
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
  const { mode, church } = useStore();
  if (mode !== 'cloud' || !church) {
    return <div className="card">Congrega funciona con una iglesia abierta. Entra a tu iglesia desde <strong>Ajustes</strong> de Adora y vuelve aquí.</div>;
  }
  return (
    <CongregaProvider>
      <div className="cg page">
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
