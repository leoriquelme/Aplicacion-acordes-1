import { useContext } from 'react';
import { AuthProvider, CloudStoreProvider, useAuth } from './lib/cloud.jsx';
import { DataContext } from './lib/store.jsx';
import Bienvenida from './pages/Bienvenida.jsx';
import App from './App.jsx';

function Gate() {
  const { user, churchId } = useAuth();
  if (user === undefined) return <div className="loading">Cargando…</div>;
  if (!user || !churchId) return <Bienvenida />;
  return (
    <CloudStoreProvider churchId={churchId} key={churchId}>
      <MemberCheck />
    </CloudStoreProvider>
  );
}

function MemberCheck() {
  const { me, error, clearError } = useContext(DataContext);
  if (me === undefined) return <div className="loading">Abriendo la iglesia…</div>;
  if (me === null) {
    return <Bienvenida notice="Ya no tienes acceso a esa iglesia. Pide un código nuevo al administrador." key="sin-acceso" />;
  }
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
