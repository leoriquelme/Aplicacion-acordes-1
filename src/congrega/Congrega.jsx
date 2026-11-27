import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { CongregaProvider, useCongrega } from './datos.jsx';
import Inicio from './Inicio.jsx';
import Asistencia, { RevisarAsistencia } from './Asistencia.jsx';
import Personas from './Personas.jsx';
import Ficha from './Ficha.jsx';
import Ajustes from './Ajustes.jsx';
import Estacion from './Estacion.jsx';
import EstacionInicio from './EstacionInicio.jsx';
import MiFicha from './MiFicha.jsx';
import InicioHermano from './InicioHermano.jsx';
import Agenda from './Agenda.jsx';
import Oracion from './Oracion.jsx';
import Familia from './Familia.jsx';
import { AvisosEstacion } from './estacion.jsx';
import './congrega.css';

/** Congrega: personas y asistencia de la iglesia abierta, con los mismos datos de Adora. */
export default function Congrega() {
  const { mode, church } = useStore();
  if (mode !== 'cloud' || !church) {
    return <div className="card">Congrega funciona con una iglesia abierta. Entra a tu iglesia desde <strong>Ajustes</strong> de Adora y vuelve aquí.</div>;
  }
  return (
    <CongregaProvider>
      <Paginas />
    </CongregaProvider>
  );
}

function Paginas() {
  const c = useCongrega();
  const { pathname } = useLocation();
  const si = (ok, el) => (ok ? el : <Navigate to="/congrega" replace />);
  if (pathname.startsWith('/congrega/estacion/marcar')) {
    return <div className="cg"><Routes><Route path="estacion/marcar" element={si(c.marca, <Estacion />)} /></Routes></div>;
  }
  return (
    <div className="cg page">
      <AvisosEstacion />
      <Routes>
        <Route index element={c.verPersonas ? <Inicio /> : <InicioHermano />} />
        <Route path="asistencia" element={si(c.asisAdmin, <Asistencia />)} />
        <Route path="asistencia/:eventId" element={si(c.asisAdmin, <RevisarAsistencia />)} />
        <Route path="estacion" element={si(c.marca || c.equipo.has(c.myUid), <EstacionInicio />)} />
        <Route path="personas" element={si(c.verPersonas, <Personas />)} />
        <Route path="personas/:key" element={<Ficha />} />
        <Route path="familias/:id" element={<Familia />} />
        <Route path="mificha" element={<MiFicha />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="oracion" element={<Oracion />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/congrega" replace />} />
      </Routes>
    </div>
  );
}
