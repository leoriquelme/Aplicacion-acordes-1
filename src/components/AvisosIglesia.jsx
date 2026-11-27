import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useStore } from '../lib/store.jsx';
import { todayISO, formatLong } from '../lib/dates.js';
import { DIAS_POR_DEFECTO, MAX_TEXTO, MAX_TITULO, avisoParaGuardar, avisosVigentes, masDias, textoAviso } from '../lib/avisos.js';
import { permisosDe } from '../congrega/permisos.js';
import Icon from './Icon.jsx';

/** Avisos de la iglesia (churches/{c}/avisos). Todos los leen; el Pastor y el Administrador publican. */
export function useAvisos(churchId) {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    if (!churchId || !db) return undefined;
    return onSnapshot(collection(db, 'churches', churchId, 'avisos'), (s) => setLista(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setLista([]));
  }, [churchId]);
  return lista;
}

/** Cuadro de avisos para el Inicio de Congrega (no sale en Adora). */
export default function AvisosIglesia() {
  const { mode, churchId, church, me, role, misPerfiles = [] } = useStore();
  const lista = useAvisos(mode === 'cloud' ? churchId : null);
  const [editando, setEditando] = useState(null); // null | {} nuevo | aviso
  const puede = permisosDe({ role, perfiles: misPerfiles }).pastor;
  if (mode !== 'cloud') return null;
  const hoy = todayISO();
  const vigentes = avisosVigentes(lista, hoy);
  if (!vigentes.length && !puede) return null;
  return (
    <section className="card bloque-avisos" aria-label="Avisos de la iglesia">
      <div className="avisos-head">
        <h2>📢 Avisos</h2>
        {puede && !editando && <button className="btn small" onClick={() => setEditando({})}>+ Nuevo aviso</button>}
      </div>
      {editando && <EditarAviso churchId={churchId} aviso={editando} por={me?.name} onListo={() => setEditando(null)} />}
      {!vigentes.length && !editando && <p className="muted small">No hay avisos. Publica uno y lo verán todos los hermanos en Inicio.</p>}
      {vigentes.map((a) => (
        <article key={a.id} className={`aviso-item${a.fijado ? ' fijado' : ''}`}>
          <h3>{a.fijado && <span title="Fijado">📌 </span>}{a.titulo}</h3>
          {a.texto && <p className="aviso-texto">{a.texto}</p>}
          <div className="row gap wrap aviso-pie">
            <span className="muted small">{a.por ? `${a.por} · ` : ''}hasta el {formatLong(a.hasta).toLowerCase()}</span>
            <a className="btn small" href={`https://wa.me/?text=${encodeURIComponent(textoAviso(a, church?.name))}`} target="_blank" rel="noreferrer"><Icon name="phone" /> Compartir</a>
            {puede && <button className="btn small ghost" onClick={() => setEditando(a)}>Editar</button>}
          </div>
        </article>
      ))}
    </section>
  );
}

function EditarAviso({ churchId, aviso, por, onListo }) {
  const nuevo = !aviso.id;
  const [f, setF] = useState({ titulo: aviso.titulo || '', texto: aviso.texto || '', hasta: aviso.hasta || masDias(todayISO(), DIAS_POR_DEFECTO), fijado: aviso.fijado === true });
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const col = collection(db, 'churches', churchId, 'avisos');
  const guardar = async (e) => {
    e.preventDefault();
    setOcupado(true); setError('');
    try {
      const datos = avisoParaGuardar(f, nuevo ? por : aviso.por || por);
      if (nuevo) await addDoc(col, datos); else await setDoc(doc(col, aviso.id), datos);
      onListo();
    } catch (er) { setError(er.message); setOcupado(false); }
  };
  const borrar = async () => {
    setOcupado(true);
    try { await deleteDoc(doc(col, aviso.id)); onListo(); } catch (er) { setError(er.message); setOcupado(false); }
  };
  return (
    <form className="aviso-form" onSubmit={guardar}>
      <label>Título<input value={f.titulo} maxLength={MAX_TITULO} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ej. Cena de Navidad el sábado 20" autoFocus /></label>
      <label>Detalle (opcional)<textarea value={f.texto} maxLength={MAX_TEXTO} rows={3} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder="Hora, lugar, qué traer…" /></label>
      <div className="row gap wrap">
        <label>Se muestra hasta<input type="date" value={f.hasta} min={todayISO()} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
        <label className="row gap aviso-fijar"><input type="checkbox" checked={f.fijado} onChange={(e) => setF({ ...f, fijado: e.target.checked })} /> Fijar arriba</label>
      </div>
      <div className="row gap wrap">
        <button className="btn primary" disabled={ocupado || !f.titulo.trim()}>{ocupado ? 'Guardando…' : nuevo ? 'Publicar aviso' : 'Guardar'}</button>
        <button type="button" className="btn ghost" onClick={onListo}>Cancelar</button>
        {!nuevo && <button type="button" className="btn ghost danger" disabled={ocupado} onClick={borrar}>Borrar</button>}
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
