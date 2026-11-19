import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, CloudStoreProvider, guardarPerfil, useAuth } from './lib/cloud.jsx';
import { PersonalStoreProvider } from './lib/personal.jsx';
import { DataContext } from './lib/store.jsx';
import Bienvenida from './pages/Bienvenida.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';
import App from './App.jsx';

function Gate() {
  const { user, profile, session } = useAuth();
  const { pathname } = useLocation();
  if (user === undefined || (user && profile === undefined)) return <div className="loading">Cargando…</div>;
  if (!user) return <Bienvenida />;
  if (!profile?.name) return <PedirNombre />;
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

/** La primera vez: guardar el nombre (el de Google o el que escribió al crear la cuenta, o preguntarlo). */
function PedirNombre() {
  const { user } = useAuth();
  const [name, setName] = useState(user.displayName || '');
  const [error, setError] = useState('');
  useEffect(() => {
    if (user.displayName) guardarPerfil(user.displayName).catch((e) => setError(e.message));
  }, [user.displayName]);
  if (user.displayName && !error) return <div className="loading">Preparando tu cuenta…</div>;
  return (
    <div className="welcome">
      <form className="welcome-card card" onSubmit={(e) => { e.preventDefault(); guardarPerfil(name).catch((er) => setError(er.message)); }}>
        <h1>¿Cómo te llamas?</h1>
        <p className="muted">Así te verán los hermanos de tu iglesia.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ej. Juan Pérez" autoFocus autoComplete="name" />
        <button className="btn primary big" disabled={!name.trim()} style={{ marginTop: '0.8rem' }}>Continuar</button>
        {error && <p className="error">{error}</p>}
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
