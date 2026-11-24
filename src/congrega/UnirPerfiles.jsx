// Unir perfiles repetidos (vienen de distintas bases). Se usa en Ajustes y en Personas → Repetidos.
import { useState } from 'react';
import { Avatar } from '../components/Avatares.jsx';
import { nombreDe, norm, useCongrega } from './datos.jsx';
import { gruposDuplicados } from './unir.js';

const meta = (p, familias, veces) => [
  p.uid ? 'Con cuenta' : '',
  p.tipo || '',
  p.familiaId && familias.get(p.familiaId)?.name,
  `${veces.get(p.key) || 0} asistencias`,
].filter(Boolean).join(' · ');

/** Sección de Ajustes: unir dos perfiles a mano y los repetidos encontrados. */
export default function UnirPerfiles() {
  return (
    <section className="card cg-stack">
      <h2>Unir perfiles</h2>
      <p className="muted">Cuando una persona aparece dos veces, únela en un solo perfil: se juntan sus datos, familia, ministerios, foto y toda su asistencia. Si uno de los dos entró con su cuenta, queda ese.</p>
      <UnirManual />
      <h3 className="cg-h3">Con el mismo nombre</h3>
      <Repetidos />
    </section>
  );
}

function UnirManual() {
  const { people, unirPersonas } = useCongrega();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [estado, setEstado] = useState('');
  const orden = [...people].sort((x, y) => norm(nombreDe(x)).localeCompare(norm(nombreDe(y))));
  const pa = people.find((p) => p.key === a); const pb = people.find((p) => p.key === b);
  const dosCuentas = pa?.uid && pb?.uid;
  const unir = async () => {
    setEstado('uniendo');
    try { await unirPersonas(a, b); setEstado(`Listo: quedó un solo perfil de ${nombreDe(pa.uid || !pb.uid ? pa : pb)}.`); setA(''); setB(''); } catch (e) { setEstado(`No se pudo unir: ${e.message}`); }
  };
  return (
    <div className="card cg-manual">
      <label>Perfil que queda
        <select value={a} onChange={(e) => { setA(e.target.value); setEstado(''); }} disabled={estado === 'uniendo'}>
          <option value="">Elige una persona…</option>
          {orden.map((p) => <option key={p.key} value={p.key} disabled={p.key === b}>{nombreDe(p)}{p.uid ? ' (con cuenta)' : ''}</option>)}
        </select>
      </label>
      <label>Perfil que se une a ese (se elimina)
        <select value={b} onChange={(e) => { setB(e.target.value); setEstado(''); }} disabled={estado === 'uniendo'}>
          <option value="">Elige la otra…</option>
          {orden.map((p) => <option key={p.key} value={p.key} disabled={p.key === a}>{nombreDe(p)}{p.uid ? ' (con cuenta)' : ''}</option>)}
        </select>
      </label>
      {dosCuentas && <div className="cg-aviso">Las dos tienen su propia cuenta; no se pueden unir.</div>}
      {estado && estado !== 'uniendo' && <div className={`cg-aviso${estado.startsWith('Listo') ? ' info' : ''}`} aria-live="polite">{estado}</div>}
      <button type="button" className="btn primary cg-izq" disabled={!a || !b || dosCuentas || estado === 'uniendo'} onClick={unir}>
        {estado === 'uniendo' ? 'Uniendo…' : 'Unir en un perfil'}
      </button>
    </div>
  );
}

/** Grupos de personas con el mismo nombre y primer apellido. */
export function Repetidos() {
  const { people, familias, asistencia, unirPersonas } = useCongrega();
  const [queda, setQueda] = useState({});
  const [quitar, setQuitar] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState('');
  const veces = new Map(); asistencia.forEach((a) => veces.set(a.personKey, (veces.get(a.personKey) || 0) + 1));
  const grupos = gruposDuplicados(people).sort((a, b) => norm(nombreDe(a[0])).localeCompare(norm(nombreDe(b[0]))));
  const unir = async (marcadas, principal, id) => {
    setOcupado(id); setAviso('');
    try {
      await unirPersonas(principal.key, marcadas.filter((p) => p.key !== principal.key).map((p) => p.key));
      setAviso(`Listo: ${nombreDe(principal)} quedó como un solo perfil.`);
    } catch (e) { setAviso(`No se pudo unir: ${e.message}`); }
    setOcupado('');
  };
  return (
    <div className="cg-stack">
      {aviso && <div className={`cg-aviso${aviso.startsWith('Listo') ? ' info' : ''}`} aria-live="polite">{aviso}</div>}
      {!grupos.length && <div className="muted cg-vacio">No hay personas con el mismo nombre y primer apellido.</div>}
      {grupos.map((g) => {
        const id = g.map((p) => p.key).sort().join('|');
        const fuera = (p) => Boolean(quitar[`${id}|${p.key}`]);
        const marcadas = g.filter((p) => !fuera(p));
        const elegida = marcadas.find((p) => p.key === queda[id]) || marcadas.find((p) => p.uid) || marcadas[0];
        return (
          <section key={id} className="card cg-grupo">
            <div className="cg-grupo-head"><h3>{nombreDe(g[0])}</h3><span className="muted">{g.length} perfiles</span></div>
            {g.map((p) => (
              <div key={p.key} className={`cg-item${fuera(p) ? ' fuera' : elegida?.key === p.key ? ' queda' : ''}`}>
                <input type="radio" name={id} aria-label={`Dejar el perfil de ${nombreDe(p)}`} checked={!fuera(p) && elegida?.key === p.key}
                  disabled={fuera(p) || Boolean(ocupado)} onChange={() => setQueda({ ...queda, [id]: p.key })} />
                <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="lg" />
                <span className="cg-quien">
                  <span className="cg-nombre">{nombreDe(p)}</span>
                  <span className="cg-meta">{!fuera(p) && elegida?.key === p.key ? 'Queda este · ' : ''}{meta(p, familias, veces)}</span>
                </span>
                <button type="button" className="btn small ghost" disabled={Boolean(ocupado)} onClick={() => setQuitar({ ...quitar, [`${id}|${p.key}`]: !fuera(p) })}>
                  {fuera(p) ? 'Incluir' : 'Es otra'}
                </button>
              </div>
            ))}
            <div className="cg-grupo-pie">
              <button type="button" className="btn primary" disabled={marcadas.length < 2 || Boolean(ocupado)} onClick={() => unir(marcadas, elegida, id)}>
                {ocupado === id ? 'Uniendo…' : `Unir ${marcadas.length} en un perfil`}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
