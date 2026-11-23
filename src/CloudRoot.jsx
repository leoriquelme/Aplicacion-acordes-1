import { Suspense, lazy, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, CloudStoreProvider, abrirIglesia, guardarPerfil, iglesiaCerradaAMano, marcarIglesiaCerrada, useAuth } from './lib/cloud.jsx';
import { PersonalStoreProvider } from './lib/personal.jsx';
import { DataContext } from './lib/store.jsx';
import Bienvenida from './pages/Bienvenida.jsx';
import { cerrarSesion } from './lib/acceso.js';
import App from './App.jsx';
import AceptarInvitacion from './components/AceptarInvitacion.jsx';
import { invitacionPendiente } from './lib/invitacion.js';

// La página del Super Admin solo la usa una persona: se baja únicamente cuando se abre.
const SuperAdmin = lazy(() => import('./pages/SuperAdmin.jsx'));

function Gate() {
  const { user, profile, session, setSession } = useAuth();
  const { pathname } = useLocation();
  const [invitacion, setInvitacion] = useState(invitacionPendiente);
  const [abriendo, setAbriendo] = useState(false);
  // Si tiene una sola iglesia y no la cerró a mano, se abre sola (por ejemplo en un teléfono nuevo).
  const ids = Object.keys(profile?.churches || {});
  const abrirSola = !!profile?.name && !session && !invitacion && ids.length === 1 && !iglesiaCerradaAMano();
  useEffect(() => {
    if (!abrirSola || abriendo) return;
    setAbriendo(true);
    abrirIglesia(ids[0], profile.name)
      .then((r) => setSession({ churchId: r.churchId, churchName: r.churchName, at: Date.now() }))
      .catch(() => marcarIglesiaCerrada(true)) // no se pudo (la quitaron o se bloqueó): no reintentar
      .finally(() => setAbriendo(false));
  }, [abrirSola]); // eslint-disable-line react-hooks/exhaustive-deps
  if (user === undefined || (user && profile === undefined)) return <div className="loading">Cargando…</div>;
  if (!user) return <Bienvenida />;
  if (!profile?.name) return <PedirNombre />;
  // Llegó con un link de invitación: ofrecer unirse a esa iglesia.
  if (invitacion) return <AceptarInvitacion code={invitacion} onListo={() => setInvitacion('')} />;
  // Página del Super Admin: no es de una iglesia, se abre con #/super
  if (pathname.startsWith('/super')) return <Suspense fallback={<div className="loading">Cargando…</div>}><SuperAdmin /></Suspense>;
  if (!session && (abrirSola || abriendo) && !pathname.startsWith('/super')) return <div className="loading">Entrando a la iglesia…</div>;
  if (!session) {
    return (
      <PersonalStoreProvider>
        <ConAvisos />
      </PersonalStoreProvider>
    );
  }
  return (
    <CloudStoreProvider churchId={session.churchId} churchName={session.churchName} key={`${session.churchId}-${session.at || ''}`}>
      <MemberCheck />
    </CloudStoreProvider>
  );
}

/** Nombre que trae la cuenta (Google lo guarda en el perfil del proveedor). */
const nombreDeCuenta = (u) => u.displayName || u.providerData?.find((p) => p.displayName)?.displayName || '';

/** La primera vez: guardar el nombre (el de Google o el que escribió al crear la cuenta, o preguntarlo). */
function PedirNombre() {
  const { user } = useAuth();
  const sugerido = nombreDeCuenta(user);
  const [name, setName] = useState(sugerido);
  const [error, setError] = useState('');
  useEffect(() => {
    if (sugerido) guardarPerfil(sugerido).catch((e) => setError(e.message));
  }, [sugerido]);
  if (sugerido && !error) return <div className="loading">Preparando tu cuenta…</div>;
  return (
    <div className="welcome">
      <form className="welcome-card card" onSubmit={(e) => { e.preventDefault(); guardarPerfil(name).catch((er) => setError(er.message)); }}>
        <h1>¿Cómo te llamas?</h1>
        {user.email && <p className="muted small">Entraste con <strong>{user.email}</strong></p>}
        <p className="muted">Así te verán los hermanos de tu iglesia.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ej. Juan Pérez" autoFocus autoComplete="name" />
        <button className="btn primary big" disabled={!name.trim()} style={{ marginTop: '0.8rem' }}>Continuar</button>
        {error && <p className="error">{error.includes('permission') ? 'Firebase no dejó guardar tu nombre: revisa que pegaste las reglas nuevas.' : error}</p>}
        <button type="button" className="btn ghost small" onClick={() => cerrarSesion()}>No soy yo: usar otra cuenta</button>
      </form>
    </div>
  );
}

function ConAvisos() {
  const { error, clearError } = useContext(DataContext);
  return (
    <>
      {error && (
        <div className="toast" role="alert">
          {error} <button className="btn small ghost" onClick={clearError}>✕</button>
        </div>
      )}
      <App />
    </>
  );
}

function MemberCheck() {
  const { me } = useContext(DataContext);
  const { setSession } = useAuth();
  // Ya no pertenezco (me sacaron, la iglesia se borró o se bloqueó): volver a mi inicio.
  useEffect(() => {
    if (me === null) { marcarIglesiaCerrada(true); setSession(null); }
  }, [me, setSession]);
  if (!me) return <div className="loading">Entrando a la iglesia…</div>;
  return <ConAvisos />;
}

export default function CloudRoot() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
