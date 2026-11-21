import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, CloudStoreProvider, guardarPerfil, useAuth } from './lib/cloud.jsx';
import { PersonalStoreProvider } from './lib/personal.jsx';
import { DataContext } from './lib/store.jsx';
import Bienvenida from './pages/Bienvenida.jsx';
import { cerrarSesion } from './lib/acceso.js';
import SuperAdmin from './pages/SuperAdmin.jsx';
import App from './App.jsx';
import AceptarInvitacion from './components/AceptarInvitacion.jsx';
import { invitacionPendiente } from './lib/invitacion.js';

function Gate() {
  const { user, profile, session } = useAuth();
  const { pathname } = useLocation();
  const [invitacion, setInvitacion] = useState(invitacionPendiente);
  if (user === undefined || (user && profile === undefined)) return <div className="loading">Cargando…</div>;
  if (!user) return <Bienvenida />;
  if (!profile?.name) return <PedirNombre />;
  // Llegó con un link de invitación: ofrecer unirse a esa iglesia.
  if (invitacion) return <AceptarInvitacion code={invitacion} onListo={() => setInvitacion('')} />;
  // Página del Super Admin: no es de una iglesia, se abre con #/super
  if (pathname.startsWith('/super')) return <SuperAdmin />;
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
    if (me === null) setSession(null);
  }, [me, setSession]);
  if (!me) return <div className="loading">Abriendo la iglesia…</div>;
  return <ConAvisos />;
}

export default function CloudRoot() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
