import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { ROLES } from '../lib/store.jsx';
import { useCongrega } from './datos.jsx';
import UnirPerfiles from './UnirPerfiles.jsx';

export default function Ajustes() {
  const { isAdmin } = useCongrega();
  if (!isAdmin) return <div className="card">Solo el Administrador de la iglesia ve los ajustes de Congrega.</div>;
  return <div className="cg-stack"><div className="page-head"><h1>Ajustes</h1></div><UnirPerfiles /><Voluntarios /></div>;
}

function Voluntarios() {
  const { people, habilitarAsistencia, churchId } = useCongrega();
  const [miembros, setMiembros] = useState(null);
  const [error, setError] = useState('');
  // Los miembros con cuenta: su perfil y si marcan asistencia (members/{uid}).
  useMiembros(churchId, setMiembros);
  const conCuenta = people.filter((p) => p.uid);
  return (
    <section className="card cg-stack">
      <h2>Quién marca asistencia</h2>
      <p className="muted">El Administrador y los Directores siempre pueden. Habilita a los voluntarios que registran la llegada los domingos. Solo ven nombres, familias y ministerios, no los datos privados.</p>
      {error && <div className="cg-aviso" role="alert">{error}</div>}
      <div className="card cg-lista">
        {conCuenta.map((p) => {
          const m = miembros?.get(p.key);
          const siempre = p.role === 'admin' || p.role === 'director';
          return (
            <label key={p.key} className="cg-item">
              <span className="cg-quien"><span className="cg-nombre">{p.name}</span><span className="cg-meta">{ROLES[p.role]?.label || 'Colaborador'}</span></span>
              <input type="checkbox" className="cg-checkbox" checked={siempre || m?.asistencia === true} disabled={siempre || !miembros}
                onChange={(e) => habilitarAsistencia(p.key, e.target.checked).catch((err) => setError(`No se pudo cambiar: ${err.message}`))} />
            </label>
          );
        })}
      </div>
    </section>
  );
}

function useMiembros(churchId, set) {
  useEffect(() => onSnapshot(collection(db, 'churches', churchId, 'members'), (s) => set(new Map(s.docs.map((d) => [d.id, d.data()]))), () => set(new Map())), [churchId, set]);
}

