// Peticiones de oración de la iglesia (churches/{c}/oracion).
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, deleteField, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useStore } from '../lib/store.jsx';
import { MAX_PETICION, cuantosOran, estoyOrando, ordenarPeticiones, peticionNueva } from '../lib/oracion.js';
import Icon from '../components/Icon.jsx';
import { useCongrega } from './datos.jsx';

/** Peticiones que puedo ver: el Pastor todas; los demás las de toda la iglesia y las propias. */
export function usePeticiones() {
  const { churchId, myUid, pastor } = useCongrega();
  const [listas, setListas] = useState({});
  useEffect(() => {
    const col = collection(db, 'churches', churchId, 'oracion');
    const leer = (k, q) => onSnapshot(q, (s) => setListas((l) => ({ ...l, [k]: s.docs.map((d) => ({ ...d.data(), id: d.id })) })), () => setListas((l) => ({ ...l, [k]: [] })));
    const subs = pastor ? [leer('todas', col)] : [leer('iglesia', query(col, where('para', '==', 'iglesia'))), leer('mias', query(col, where('autorUid', '==', myUid)))];
    return () => subs.forEach((u) => u());
  }, [churchId, myUid, pastor]);
  return useMemo(() => ordenarPeticiones(Object.values(listas)), [listas]);
}

export default function Oracion() {
  const { churchId, myUid, pastor } = useCongrega();
  const { me } = useStore();
  const lista = usePeticiones();
  const deLaIglesia = lista.filter((p) => p.para === 'iglesia');
  const privadas = lista.filter((p) => p.para !== 'iglesia');
  return (
    <div className="cg-stack cg-oracion">
      <div className="page-head"><div><h1>Oración</h1><p className="muted">“Orad unos por otros” · Santiago 5:16</p></div></div>
      <NuevaPeticion churchId={churchId} yo={{ uid: myUid, nombre: me?.name }} />
      <section className="cg-stack">
        <h2 className="cg-seccion-titulo">Peticiones de la iglesia</h2>
        {deLaIglesia.length ? deLaIglesia.map((p) => <Peticion key={p.id} p={p} churchId={churchId} myUid={myUid} pastor={pastor} />)
          : <div className="card muted">No hay peticiones compartidas con la iglesia este mes.</div>}
      </section>
      {privadas.length > 0 && (
        <section className="cg-stack">
          <h2 className="cg-seccion-titulo">{pastor ? 'Solo para los pastores' : 'Mis peticiones a los pastores'}</h2>
          {privadas.map((p) => <Peticion key={p.id} p={p} churchId={churchId} myUid={myUid} pastor={pastor} />)}
        </section>
      )}
    </div>
  );
}

function NuevaPeticion({ churchId, yo }) {
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState('pastores');
  const [estado, setEstado] = useState('');
  const enviar = async (e) => {
    e.preventDefault();
    setEstado('enviando');
    try {
      await addDoc(collection(db, 'churches', churchId, 'oracion'), peticionNueva({ texto, para }, yo));
      setTexto(''); setEstado(para === 'iglesia' ? 'Listo: la iglesia ya puede orar por tu petición.' : 'Listo: los pastores recibieron tu petición.');
    } catch (er) { setEstado(`No se pudo enviar: ${er.message}`); }
  };
  return (
    <form className="card aviso-form" onSubmit={enviar}>
      <label>¿Por qué quieres que oremos?<textarea rows={3} maxLength={MAX_PETICION} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu petición…" /></label>
      <fieldset className="oracion-para">
        <legend className="small">¿Quién la ve?</legend>
        <label className="row gap"><input type="radio" name="para" checked={para === 'pastores'} onChange={() => setPara('pastores')} /> Solo los pastores</label>
        <label className="row gap"><input type="radio" name="para" checked={para === 'iglesia'} onChange={() => setPara('iglesia')} /> Toda la iglesia, con mi nombre</label>
      </fieldset>
      <div className="row gap wrap">
        <button className="btn primary" disabled={!texto.trim() || estado === 'enviando'}><Icon name="pray" /> {estado === 'enviando' ? 'Enviando…' : 'Enviar petición'}</button>
      </div>
      {estado && estado !== 'enviando' && <p className={estado.startsWith('Listo') ? 'small' : 'error small'}>{estado}</p>}
    </form>
  );
}

function Peticion({ p, churchId, myUid, pastor }) {
  const ref = doc(db, 'churches', churchId, 'oracion', p.id);
  const mia = p.autorUid === myUid;
  const oro = estoyOrando(p, myUid);
  const n = cuantosOran(p);
  const [error, setError] = useState('');
  const hacer = (f) => () => f().then(() => setError('')).catch((e) => setError(`No se pudo: ${e.message}`));
  const cuando = new Date(p.at).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return (
    <article className={`card aviso-item peticion${p.estado === 'respondida' ? ' respondida' : ''}`}>
      <p className="muted small">{mia ? 'Tú' : p.autor || 'Un hermano'} · {cuando}{p.para !== 'iglesia' ? ' · 🔒 solo pastores' : ''}</p>
      {p.estado === 'respondida' && <p className="peticion-respondida">🙌 ¡Dios respondió!</p>}
      <p className="aviso-texto">{p.texto}</p>
      <div className="row gap wrap aviso-pie">
        {p.estado !== 'respondida' && (p.para === 'iglesia' || pastor) && (
          <button type="button" className={`btn small${oro ? ' primary' : ''}`} aria-pressed={oro}
            onClick={hacer(() => updateDoc(ref, { [`orando.${myUid}`]: oro ? deleteField() : true }))}>
            <Icon name="pray" /> {oro ? 'Estoy orando' : 'Voy a orar'}{n ? ` · ${n}` : ''}
          </button>
        )}
        {p.estado === 'respondida' && n > 0 && <span className="muted small">{n} {n === 1 ? 'hermano oró' : 'hermanos oraron'}</span>}
        {(mia || pastor) && p.estado !== 'respondida' && <button type="button" className="btn small ghost" onClick={hacer(() => updateDoc(ref, { estado: 'respondida' }))}>Dios respondió</button>}
        {(mia || pastor) && <button type="button" className="btn small ghost" onClick={hacer(() => deleteDoc(ref))}>Borrar</button>}
      </div>
      {error && <p className="error small">{error}</p>}
    </article>
  );
}
