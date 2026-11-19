import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Inicio from './pages/Inicio.jsx';
import Canciones from './pages/Canciones.jsx';
import Cancion from './pages/Cancion.jsx';
import EditarCancion from './pages/EditarCancion.jsx';
import Eventos from './pages/Eventos.jsx';
import Evento from './pages/Evento.jsx';
import Ajustes from './pages/Ajustes.jsx';
import Presentacion from './pages/Presentacion.jsx';
import Biblioteca from './pages/Biblioteca.jsx';
import Importar from './pages/Importar.jsx';
import { useStore } from './lib/store.jsx';

const TABS = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/canciones', label: 'Canciones', icon: '🎵' },
  { to: '/eventos', label: 'Eventos', icon: '📅' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];

export default function App() {
  const { pathname } = useLocation();
  const presenting = pathname.startsWith('/presentar');
  const { mode, church, me } = useStore();

  return (
    <div className="app">
      {!presenting && (
        <header className="topbar">
          <div className="brand">Cancionero</div>
          <nav className="tabs">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className="tab">
                <span className="tab-icon" aria-hidden="true">{t.icon}</span>
                <span>{t.label}</span>
              </NavLink>
            ))}
          </nav>
          {mode === 'cloud' && church && (
            <div className="church-chip" title={`${me?.name} en ${church.name}`}>⛪ {church.name}</div>
          )}
        </header>
      )}
      <main className={presenting ? '' : 'content'}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/canciones" element={<Canciones />} />
          <Route path="/canciones/nueva" element={<EditarCancion />} />
          <Route path="/canciones/importar" element={<Importar />} />
          <Route path="/canciones/biblioteca" element={<Biblioteca />} />
          <Route path="/canciones/:id" element={<Cancion />} />
          <Route path="/canciones/:id/editar" element={<EditarCancion />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/eventos/:id" element={<Evento />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/presentar/:tipo/:id" element={<Presentacion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
