import { Suspense, lazy, useEffect, useRef } from 'react';
import { APP_ETAPA, APP_NOMBRE } from './lib/marca.js';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { appElegida } from './congrega/apps.js';
import Inicio from './pages/Inicio.jsx';
import Canciones from './pages/Canciones.jsx';
import InicioPersonal from './pages/InicioPersonal.jsx';
import { useStore } from './lib/store.jsx';
import Icon from './components/Icon.jsx';
import { enVivoActivo } from './lib/envivo.js';
import IglesiaLogo from './components/IglesiaLogo.jsx';
import { useEquipoEstacion } from './congrega/estacion.jsx';
import { entradaPermisos, permisosDe, pestanasCongrega } from './congrega/permisos.js';
import { BarraVistaComo } from './components/VistaComo.jsx';
import { SincronizarMusica } from './lib/musicaPublica.jsx';

// Para que la app abra rápido (aunque haya poca señal), al abrir solo se baja lo de la primera
// pantalla. Las demás páginas se bajan solas un momento después, sin que se note.
const cargarCancion = () => import('./pages/Cancion.jsx');
const cargarEditarCancion = () => import('./pages/EditarCancion.jsx');
const cargarEventos = () => import('./pages/Eventos.jsx');
const cargarEvento = () => import('./pages/Evento.jsx');
const cargarAjustes = () => import('./pages/Ajustes.jsx');
const cargarPresentacion = () => import('./pages/Presentacion.jsx');
const cargarBiblioteca = () => import('./pages/Biblioteca.jsx');
const cargarApoyo = () => import('./pages/Apoyo.jsx');
const cargarMiIglesia = () => import('./pages/MiIglesia.jsx');
const cargarMiembros = () => import('./pages/Miembros.jsx');
const cargarSugerencias = () => import('./pages/Sugerencias.jsx');
const cargarImprimir = () => import('./pages/Imprimir.jsx');
const cargarImportar = () => import('./pages/Importar.jsx');
const cargarEditarPerfil = () => import('./components/Comunicacion.jsx');
const cargarCongrega = () => import('./congrega/Congrega.jsx');
const cargarApps = () => import('./congrega/Apps.jsx');
const cargarMusica = () => import('./pages/Musica.jsx');
const cargarAfiche = () => import('./pages/Afiche.jsx');
const Congrega = lazy(cargarCongrega);
const Apps = lazy(cargarApps);
const Musica = lazy(cargarMusica);
const Afiche = lazy(cargarAfiche);
const Cancion = lazy(cargarCancion);
const EditarCancion = lazy(cargarEditarCancion);
const Eventos = lazy(cargarEventos);
const Evento = lazy(cargarEvento);
const Ajustes = lazy(cargarAjustes);
const Presentacion = lazy(cargarPresentacion);
const Biblioteca = lazy(cargarBiblioteca);
const Apoyo = lazy(cargarApoyo);
const MiIglesia = lazy(cargarMiIglesia);
const Miembros = lazy(cargarMiembros);
const Sugerencias = lazy(cargarSugerencias);
const Imprimir = lazy(cargarImprimir);
const Importar = lazy(cargarImportar);
const EditarPerfil = lazy(() => cargarEditarPerfil().then((m) => ({ default: m.EditarPerfil })));
const TODAS = [cargarCancion, cargarEditarCancion, cargarEventos, cargarEvento, cargarAjustes, cargarPresentacion, cargarBiblioteca, cargarApoyo, cargarMiIglesia, cargarMiembros, cargarSugerencias, cargarImprimir, cargarImportar, cargarEditarPerfil, cargarCongrega, cargarApps, cargarMusica, cargarAfiche];

/** Baja las demás páginas cuando el teléfono está libre, así después cambian al instante y sirven sin internet. */
function usePrecargarPaginas() {
  useEffect(() => {
    const precargar = () => TODAS.forEach((f) => f().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(precargar, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(precargar, 1500);
    return () => clearTimeout(t);
  }, []);
}

const TABS = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/canciones', label: 'Canciones', icon: 'music' },
  { to: '/eventos', label: 'Eventos', icon: 'calendar' },
  { to: '/mi-iglesia', label: 'Iglesia', icon: 'church' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];
// Congrega usa el mismo menú de Adora (arriba en computador, abajo en el teléfono).
// Cada perfil ve solo sus pestañas (permisos.js → pestanasCongrega).
const TABS_CONGREGA = [
  { id: 'inicio', to: '/congrega', label: 'Inicio', icon: 'home', end: true },
  { id: 'asistencia', to: '/congrega/asistencia', label: 'Asistencia', icon: 'hand' },
  { id: 'estacion', to: '/congrega/estacion', label: 'Estación', icon: 'laptop' },
  { id: 'personas', to: '/congrega/personas', label: 'Personas', icon: 'users' },
  { id: 'agenda', to: '/congrega/agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'oracion', to: '/congrega/oracion', label: 'Oración', icon: 'pray' },
  { id: 'mificha', to: '/congrega/mificha', label: 'Mi ficha', icon: 'user' },
  { id: 'ajustes', to: '/congrega/ajustes', label: 'Ajustes', icon: 'settings' },
];

export default function App() {
  const { pathname, state } = useLocation();
  // Páginas abiertas desde Ajustes (ej. la página de la iglesia): la pestaña Ajustes sigue marcada.
  const desdeAjustes = state?.from === 'ajustes';
  // Presentación y Estación de asistencia usan la pantalla completa, sin barra ni menú.
  const presenting = pathname.startsWith('/presentar') || pathname.startsWith('/congrega/estacion/marcar');
  const { mode, church, me, live, myUid, role, events = [], eventsReady = true, saveEvent, can, churchId, misPerfiles = [], vistaComo } = useStore();
  const equipoEstacion = useEquipoEstacion(mode === 'cloud' && pathname.startsWith('/congrega') ? churchId : null);
  const pestanas = pestanasCongrega(permisosDe(entradaPermisos({ role, misPerfiles, vistaComo, church, myUid }, equipoEstacion.get(myUid)?.estado === 'aceptado')));
  const liveEvent = enVivoActivo(live) ? events.find((e) => e.id === live.eventId) : null;
  const personal = mode === 'personal';
  usePrecargarPaginas();
  // Asegura que la iglesia tenga el servicio de este domingo aunque se abra desde Adora o Congrega.
  const cultoCreadoEnSemana = useRef('');
  useEffect(() => {
    if (!eventsReady || mode === 'personal' || !can?.events) return;
    const hoy = new Date();
    const diasHastaDomingo = (7 - hoy.getDay()) % 7;
    const domingo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diasHastaDomingo);
    const pad = (n) => String(n).padStart(2, '0');
    const fecha = `${domingo.getFullYear()}-${pad(domingo.getMonth() + 1)}-${pad(domingo.getDate())}`;
    if (cultoCreadoEnSemana.current === fecha) return;
    const yaHayCulto = events.some((e) => e.date === fecha && /culto|adoraci[oó]n|servicio/i.test(e.name || ''));
    if (yaHayCulto) { cultoCreadoEnSemana.current = fecha; return; }
    cultoCreadoEnSemana.current = fecha;
    saveEvent({ id: `culto-dominical-${fecha}`, name: 'Servicio de Adoración', tipo: 'culto', date: fecha, time: '11:45', notes: '', items: [] });
  }, [eventsReady, mode, can?.events, events, saveEvent]);
  // Selector de apps (como Planning Center): la primera vez se pregunta qué app usar; después se abre la última elegida.
  const navigate = useNavigate();
  const yaElegido = useRef(false);
  useEffect(() => {
    if (yaElegido.current || mode !== 'cloud' || !church) return;
    yaElegido.current = true;
    if (pathname !== '/') return;
    const app = appElegida();
    if (!app) navigate('/apps', { replace: true });
    else if (app === 'congrega') navigate('/congrega', { replace: true });
  }, [mode, church, pathname, navigate]);
  const enCongrega = pathname.startsWith('/congrega');
  const enApps = pathname === '/apps';
  // Sin iglesia abierta: solo Inicio, Canciones y Ajustes (a la iglesia se entra desde Ajustes o con un link).
  const tabs = enCongrega ? TABS_CONGREGA.filter((t) => pestanas.includes(t.id))
    : personal ? TABS.filter((t) => ['/', '/canciones', '/ajustes'].includes(t.to)) : TABS;

  return (
    <div className="app">
      {!presenting && (
        <header className="topbar">
          <Link className="brand" to="/apps" title="Cambiar de módulo"><span className="brand-mark" aria-hidden="true">I</span><span className="brand-name">{APP_NOMBRE}</span><span className="brand-context">{enCongrega ? 'Congrega' : enApps ? 'Apps' : 'Adora'}</span><span className="beta-pill">{APP_ETAPA}</span><span className="brand-cambiar" aria-hidden="true">▾</span></Link>
          {!enApps && (!enCongrega || (mode === 'cloud' && church)) && <nav className="tabs">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => `tab${(desdeAjustes && !enCongrega ? t.to === '/ajustes' : isActive) ? ' active' : ''}`}
              >
                <span className="tab-icon"><Icon name={t.icon} size="1.25em" /></span>
                <span>{t.label}</span>
              </NavLink>
            ))}
          </nav>}
          {personal && <div className="church-chip" title={me?.name}><Icon name="user" /> {me?.name}</div>}
          {mode === 'cloud' && church && (
            <div className="church-chip" title={`${me?.name} en ${church.name}`}><IglesiaLogo className="logo-chip" /> {church.name}</div>
          )}
        </header>
      )}
      {!presenting && <BarraVistaComo />}
      {mode === 'cloud' && can?.events && <SincronizarMusica />}
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
      <main key={presenting ? 'presenting' : pathname} className={presenting ? '' : 'content'}>
        <Suspense fallback={<div className="cargando-pagina">Cargando…</div>}>
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
          <Route path="/imprimir/afiche/:tipo" element={<Afiche />} />
          <Route path="/musica" element={<Musica />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/congrega/*" element={<Congrega />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}
