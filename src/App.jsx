import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Inicio from './pages/Inicio.jsx';
import Canciones from './pages/Canciones.jsx';
import Cancion from './pages/Cancion.jsx';
import EditarCancion from './pages/EditarCancion.jsx';
import Eventos from './pages/Eventos.jsx';
import Evento from './pages/Evento.jsx';
import Ajustes from './pages/Ajustes.jsx';
import Presentacion from './pages/Presentacion.jsx';
import Biblioteca from './pages/Biblioteca.jsx';
import Apoyo from './pages/Apoyo.jsx';
import MiIglesia from './pages/MiIglesia.jsx';
import Miembros from './pages/Miembros.jsx';
import Sugerencias from './pages/Sugerencias.jsx';
import Imprimir from './pages/Imprimir.jsx';
import Importar from './pages/Importar.jsx';
import InicioPersonal from './pages/InicioPersonal.jsx';
import { useStore } from './lib/store.jsx';
import Icon from './components/Icon.jsx';
import { enVivoActivo } from './lib/envivo.js';
import IglesiaLogo from './components/IglesiaLogo.jsx';
import { EditarPerfil } from './components/Comunicacion.jsx';

const TABS = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/canciones', label: 'Canciones', icon: 'music' },
  { to: '/eventos', label: 'Eventos', icon: 'calendar' },
  { to: '/mi-iglesia', label: 'Iglesia', icon: 'church' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];

export default function App() {
  const { pathname, state } = useLocation();
  // Páginas abiertas desde Ajustes (ej. la página de la iglesia): la pestaña Ajustes sigue marcada.
  const desdeAjustes = state?.from === 'ajustes';
  const presenting = pathname.startsWith('/presentar');
  const { mode, church, me, live, myUid, events = [] } = useStore();
  const liveEvent = enVivoActivo(live) ? events.find((e) => e.id === live.eventId) : null;
  const personal = mode === 'personal';
  // Sin iglesia abierta: solo Inicio, Canciones y Ajustes (a la iglesia se entra desde Ajustes o con un link).
  const tabs = personal ? TABS.filter((t) => ['/', '/canciones', '/ajustes'].includes(t.to)) : TABS;

  return (
    <div className="app">
      {!presenting && (
        <header className="topbar">
          <div className="brand">Cancionero</div>
          <nav className="tabs">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => `tab${(desdeAjustes ? t.to === '/ajustes' : isActive) ? ' active' : ''}`}
              >
                <span className="tab-icon"><Icon name={t.icon} size="1.25em" /></span>
                <span>{t.label}</span>
              </NavLink>
            ))}
          </nav>
          {personal && <div className="church-chip" title={me?.name}><Icon name="user" /> {me?.name}</div>}
          {mode === 'cloud' && church && (
            <div className="church-chip" title={`${me?.name} en ${church.name}`}><IglesiaLogo className="logo-chip" /> {church.name}</div>
          )}
        </header>
      )}
      {!presenting && liveEvent && (
        <div className="en-vivo-barra" role="status">
          <span className="en-vivo-dot" />
          {live.by === myUid ? (
            <>
              <span className="grow">Estás pasando la letra en vivo de <strong>{liveEvent.name}</strong></span>
              <Link className="btn small primary" to={`/presentar/evento/${liveEvent.id}?envivo=1`}>Volver</Link>
            </>
          ) : (
            <>
              <span className="grow"><strong>{live.byName || 'El director'}</strong> está pasando la letra de {liveEvent.name}</span>
              <Link className="btn small primary" to={`/presentar/evento/${liveEvent.id}?seguir=1`}><Icon name="play" /> Seguir en vivo</Link>
            </>
          )}
        </div>
      )}
      <main className={presenting ? '' : 'content'}>
        <Routes>
          <Route path="/" element={personal ? <InicioPersonal /> : <Inicio />} />
          <Route path="/canciones" element={<Canciones />} />
          <Route path="/canciones/nueva" element={<EditarCancion />} />
          <Route path="/canciones/importar" element={<Importar />} />
          <Route path="/canciones/biblioteca" element={<Biblioteca />} />
          <Route path="/canciones/:id" element={<Cancion />} />
          <Route path="/canciones/:id/editar" element={<EditarCancion />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/eventos/:id" element={<Evento />} />
          <Route path="/mi-iglesia" element={<MiIglesia />} />
          <Route path="/mi-iglesia/miembros" element={<Miembros />} />
          <Route path="/sugerencias" element={<Sugerencias />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/ajustes/perfil" element={<EditarPerfil />} />
          <Route path="/apoyo" element={<Apoyo />} />
          <Route path="/presentar/:tipo/:id" element={<Presentacion />} />
          <Route path="/imprimir/evento/:id" element={<Imprimir />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
