import { Link, useLocation } from 'react-router-dom';
import { ROLES, useStore } from '../lib/store.jsx';
import { UsersCard } from '../components/ChurchAdmin.jsx';
import { Avatar } from '../components/Avatares.jsx';
import Icon from '../components/Icon.jsx';
import { CodigoAcceso } from '../components/Administracion.jsx';
import InvitarCard from '../components/InvitarCard.jsx';

/** Nombre de la iglesia arriba y sus usuarios abajo. El administrador además cambia perfiles. */
export default function Miembros() {
  const { mode, church, people = [], me, can } = useStore();
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
        : <Link to="/mi-iglesia" className="back">← Mi iglesia</Link>}
      <h1><Icon name="church" /> {church?.name}</h1>
      <p className="muted">{people.length} {people.length === 1 ? 'miembro' : 'miembros'}</p>
      {/* El código de acceso: solo el Administrador, y solo al entrar desde Ajustes. */}
      {desdeAjustes && <CodigoAcceso />}
      <InvitarCard />
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
    </div>
  );
}
