// Perfil familiar: el nombre de la familia y, dentro, el perfil personal de cada integrante activo.
// El Administrador cambia el nombre, agrega integrantes y entra a editar a cada uno.
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Avatar } from '../components/Avatares.jsx';
import { ROLES_FAMILIA, activo, esMiembro, nombreDe, norm, useCongrega } from './datos.jsx';

const ORDEN_ROL = { 'Contacto principal': 0, 'Cónyuge': 1, 'Hijo/a': 2 };

export default function Familia() {
  const { id } = useParams();
  const c = useCongrega();
  const { familias, people, isAdmin, churchId, verPersonas, anotar } = c;
  const fam = familias.get(id);
  const [nombre, setNombre] = useState(null);
  const [agregar, setAgregar] = useState('');
  const [error, setError] = useState('');
  if (!verPersonas) return <Navigate to="/congrega/mificha" replace />;
  if (!fam) return <div className="card">No encontramos esta familia. <Link to="/congrega/personas">Volver a Personas</Link></div>;
  const ms = people.filter((p) => p.familiaId === id && activo(p)).sort((a, b) => ((ORDEN_ROL[a.rolFamilia] ?? 3) - (ORDEN_ROL[b.rolFamilia] ?? 3)) || norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const inactivos = people.filter((p) => p.familiaId === id && !activo(p)).length;
  const sinFamilia = people.filter((p) => !p.familiaId && activo(p)).sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const falla = (e) => setError(`No se pudo guardar: ${e.message}`);
  const persona = (k) => doc(db, 'churches', churchId, 'people', k);

  return (
    <div className="cg-stack">
      <div className="cg-row cg-entre">
        <Link className="btn ghost" to="/congrega/personas">← Personas</Link>
      </div>
      <div className="cg-perfil">
        <span className="cg-familia-avatares grande" aria-hidden="true">
          {ms.slice(0, 4).map((p) => <Avatar key={p.key} name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="lg" />)}
        </span>
        <div className="cg-stack cg-grow">
          {nombre == null ? (
            <h1 className="cg-titulo">Familia {fam.name}</h1>
          ) : (
            <form className="cg-row" onSubmit={(e) => { e.preventDefault(); if (!nombre.trim()) return; setDoc(doc(db, 'churches', churchId, 'families', id), { name: nombre.trim().slice(0, 60) }, { merge: true }).then(() => { anotar('Cambió el nombre de una familia', nombre.trim()); setNombre(null); }).catch(falla); }}>
              <input className="cg-grow" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre de la familia" autoFocus />
              <button type="submit" className="btn primary small">Guardar</button>
              <button type="button" className="btn ghost small" onClick={() => setNombre(null)}>Cancelar</button>
            </form>
          )}
          <span className="muted">{ms.length} {ms.length === 1 ? 'integrante' : 'integrantes'}{inactivos ? ` · ${inactivos} inactivo${inactivos === 1 ? '' : 's'} (no se muestra${inactivos === 1 ? '' : 'n'})` : ''}</span>
          {isAdmin && nombre == null && <div><button type="button" className="btn small" onClick={() => setNombre(fam.name)}>Cambiar nombre</button></div>}
        </div>
      </div>
      {error && <div className="cg-aviso" role="alert">{error}</div>}

      <section className="card cg-stack">
        <h2>Integrantes</h2>
        <div className="cg-lista">
          {ms.map((p) => (
            <div key={p.key} className="cg-item cg-integrante">
              <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="lg" />
              <Link className="cg-quien" to={`/congrega/personas/${p.key}`}>
                <span className="cg-nombre">{nombreDe(p)}</span>
                <span className="cg-meta">
                  {p.rolFamilia && <span>{p.rolFamilia}</span>}
                  {esMiembro(p) && <span className="cg-chip ok">Miembro</span>}
                  {p.tipo && <span className="cg-chip">{p.tipo}</span>}
                </span>
              </Link>
              {(isAdmin || c.editarFicha) && (
              <div className="cg-integrante-acciones">
              {isAdmin && (
                <select className="cg-rol-familia" value={p.rolFamilia || ''} aria-label={`Rol de ${nombreDe(p)} en la familia`} onChange={(e) => updateDoc(persona(p.key), { rolFamilia: e.target.value || null }).catch(falla)}>
                  <option value="">Rol…</option>
                  {ROLES_FAMILIA.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              <Link className="btn small" to={`/congrega/personas/${p.key}?editar=1`}>Editar</Link>
              </div>
              )}
            </div>
          ))}
          {!ms.length && <div className="muted cg-vacio">Esta familia no tiene integrantes activos.</div>}
        </div>
        {isAdmin && (
          <div className="cg-row">
            <select className="cg-grow" value={agregar} onChange={(e) => setAgregar(e.target.value)} aria-label="Agregar a la familia">
              <option value="">Agregar a alguien sin familia…</option>
              {sinFamilia.map((p) => <option key={p.key} value={p.key}>{nombreDe(p)}</option>)}
            </select>
            <button type="button" className="btn primary" disabled={!agregar} onClick={() => {
              const p = people.find((x) => x.key === agregar);
              updateDoc(persona(agregar), { familiaId: id }).then(() => { anotar('Agregó a una familia', nombreDe(p), fam.name); setAgregar(''); }).catch(falla);
            }}>Agregar</button>
          </div>
        )}
      </section>
    </div>
  );
}
