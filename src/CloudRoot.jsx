import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import SuperAdmin from './pages/SuperAdmin.jsx';
import { AuthProvider, CloudStoreProvider, useAuth } from './lib/cloud.jsx';
import { DataContext } from './lib/store.jsx';
import Bienvenida from './pages/Bienvenida.jsx';
import App from './App.jsx';

function Gate() {
  const { user, session } = useAuth();
  const { pathname } = useLocation();
  if (user === undefined) return <div className="loading">Cargando…</div>;
  // Página del Super Admin: no es de una iglesia, se abre con #/super
  if (pathname.startsWith('/super')) return <SuperAdmin />;
  if (!user || !session) return <Bienvenida />;
  return (
    <CloudStoreProvider churchId={session.churchId} churchName={session.churchName} key={`${session.churchId}-${session.at || ''}`}>
      <MemberCheck />
    </CloudStoreProvider>
  );
}

function MemberCheck() {
  const { me, error, clearError } = useContext(DataContext);
  if (me === undefined) return <div className="loading">Abriendo la iglesia…</div>;
  if (me === null) return <Bienvenida notice="Vuelve a entrar con tu iglesia y tu nombre (si cambió tu contraseña, tu perfil o el código de acceso, usa los nuevos)." />;
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

export default function CloudRoot() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
