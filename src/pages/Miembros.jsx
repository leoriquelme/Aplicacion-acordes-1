import { Link, useLocation } from 'react-router-dom';
import { ROLES, conCuenta, useStore } from '../lib/store.jsx';
import { UsersCard } from '../components/ChurchAdmin.jsx';
import { Avatar } from '../components/Avatares.jsx';
import Icon from '../components/Icon.jsx';
import { CodigoAcceso } from '../components/Administracion.jsx';
import InvitarCard from '../components/InvitarCard.jsx';
import { Grupo, SalirIglesia } from '../components/Comunicacion.jsx';
import IglesiaLogo from '../components/IglesiaLogo.jsx';
import ElegirFoto from '../components/ElegirFoto.jsx';

/** Nombre de la iglesia arriba y sus usuarios abajo. El administrador además cambia perfiles. */
export default function Miembros() {
  const { mode, church, people: todas = [], me, can, setChurchLogo, isTest } = useStore();
  const people = conCuenta(todas, isTest);
  const sinCuenta = todas.length - people.length;
  const desdeAjustes = useLocation().state?.from === 'ajustes';
  if (mode !== 'cloud') {
    return (
      <div className="page">
        <p>Para ver los miembros, entra con tu iglesia.</p>
        <Link to="/ajustes">← Ajustes</Link>
      </div>
    );
  }
  const sorted = [...people].sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || (b.role === 'director') - (a.role === 'director') || (a.name || '').localeCompare(b.name || '', 'es'));
  return (
    <div className="page">
      {desdeAjustes
        ? <Link to="/ajustes" className="back">← Ajustes</Link>
        : <Link to="/mi-iglesia" className="back">← Iglesia</Link>}
      <header className="iglesia-cabeza">
        <div className="perfil-foto">
          <IglesiaLogo className="logo-grande" size="2.4rem" />
          {can.users && setChurchLogo && (
            <ElegirFoto className="perfil-camara" modo="contener" label="Cambiar logo" onFoto={setChurchLogo}>
              <Icon name="camera" />
            </ElegirFoto>
          )}
        </div>
        <h1>{church?.name}</h1>
        {can.users && church?.logo && <button className="btn ghost small" onClick={() => setChurchLogo(null)}>Quitar logo</button>}
      </header>
      <p className="muted">{people.length} {people.length === 1 ? 'persona usa' : 'personas usan'} la app{sinCuenta > 0 ? <> · las otras {sinCuenta} están en <Link to="/congrega/personas">Congrega</Link></> : ''}</p>
      {/* Invitar y código de acceso: solo el Administrador. */}
      {can.users && (
        <Grupo>
          <InvitarCard />
          <CodigoAcceso />
        </Grupo>
      )}
      {can.users ? (
        <UsersCard />
      ) : (
        <ul className="card miembros">
          {sorted.map((p) => (
            <li key={p.key}>
              <Avatar name={p.name} personKey={p.key} />
              <span className="grow"><strong>{p.name}</strong>{p.key === me?.key && <span className="muted"> (tú)</span>}</span>
              <span className={`role-pill role-${p.role}`}>{ROLES[p.role]?.label || 'Colaborador'}</span>
            </li>
          ))}
        </ul>
      )}
      <SalirIglesia />
    </div>
  );
}
