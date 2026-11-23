import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { ROLES } from '../lib/store.jsx';
import { esExportPco, filaPco, parseCsv } from './importarPco.js';
import { useCongrega } from './datos.jsx';

export default function Ajustes() {
  const { isAdmin } = useCongrega();
  if (!isAdmin) return <div className="card">Solo el Administrador de la iglesia ve los ajustes de Congrega.</div>;
  return <div className="cg-stack"><Voluntarios /><Importar /></div>;
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

function Importar() {
  const { churchId, people, fichas } = useCongrega();
  const [archivo, setArchivo] = useState(null);
  const [medicas, setMedicas] = useState(false);
  const [estado, setEstado] = useState({ corriendo: false, hechos: 0, error: '' });

  if (!archivo) {
    return (
      <section className="card cg-stack">
        <h2>Importar desde Planning Center</h2>
        <p className="muted">En Planning Center People, exporta a las personas como CSV y elige el archivo. Si importas de nuevo, se actualizan las mismas personas en vez de duplicarse.</p>
        <label className="btn cg-izq">Elegir archivo CSV
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            f.text().then((t) => { const filas = parseCsv(t); if (!esExportPco(filas)) setEstado({ corriendo: false, hechos: 0, error: 'Ese archivo no parece una exportación de Planning Center People.' }); else setArchivo({ nombre: f.name, filas }); });
          }} />
        </label>
        {estado.error && <div className="cg-aviso" role="alert">{estado.error}</div>}
      </section>
    );
  }
  const filas = archivo.filas.map((r) => filaPco(r, { conNotasMedicas: medicas }));
  const nuevas = filas.filter((f) => !people.some((p) => p.key === f.key)).length;
  const fams = new Map(filas.filter((f) => f.familia).map((f) => [f.familia.id, f.familia]));
  const conMed = filas.filter((f) => f.tieneNotasMedicas).length;

  const importar = async () => {
    setEstado({ corriendo: true, hechos: 0, error: '' });
    try {
      const ops = [];
      fams.forEach((f) => ops.push((b) => b.set(doc(db, 'churches', churchId, 'families', f.id), { name: f.name }, { merge: true })));
      filas.forEach((f) => {
        ops.push((b) => b.set(doc(db, 'churches', churchId, 'people', f.key), f.persona, { merge: true }));
        const prev = fichas.get(f.key) || {};
        ops.push((b) => b.set(doc(db, 'churches', churchId, 'fichas', f.key), {
          ...f.ficha, actualizadoEn: Date.now(),
          cambios: [...(prev.cambios || []), { at: Date.now(), campos: ['importación desde Planning Center'] }].slice(-50),
        }, { merge: true }));
      });
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => op(b));
        await b.commit();
        setEstado({ corriendo: true, hechos: Math.min(filas.length, Math.round(((i + 400) / ops.length) * filas.length)), error: '' });
      }
      setEstado({ corriendo: false, hechos: filas.length, error: '' });
    } catch (e) {
      setEstado((s) => ({ ...s, corriendo: false, error: `La importación se detuvo: ${e.message}. Puedes intentarlo de nuevo, no se duplicará nada.` }));
    }
  };

  return (
    <section className="card cg-stack">
      <h2>Importar desde Planning Center</h2>
      <strong>{archivo.nombre}</strong>
      <span>{filas.length} personas: {nuevas} nuevas y {filas.length - nuevas} que se actualizarán · {fams.size} familias · {filas.filter((f) => f.persona.estado === 'inactivo').length} inactivas</span>
      {conMed > 0 && (
        <label className="cg-row">
          <input type="checkbox" className="cg-checkbox" checked={medicas} disabled={estado.corriendo} onChange={(e) => setMedicas(e.target.checked)} />
          <span className="cg-grow">Importar también las notas médicas ({conMed} personas). Son datos de salud, sensibles según la Ley 21.719; solo los verá el Administrador.</span>
        </label>
      )}
      <span className="muted">Las notas pastorales, el consentimiento y los equipos que ya tengas se conservan.</span>
      {(estado.corriendo || estado.hechos > 0) && <span aria-live="polite">{estado.corriendo ? `Importando… ${estado.hechos} de ${filas.length}` : `Listo: ${estado.hechos} personas importadas.`}</span>}
      {estado.error && <div className="cg-aviso" role="alert">{estado.error}</div>}
      <div className="cg-row">
        {!estado.hechos && <button type="button" className="btn primary" disabled={estado.corriendo} onClick={importar}>{estado.corriendo ? 'Importando…' : `Importar ${filas.length} personas`}</button>}
        {!estado.corriendo && <button type="button" className="btn" onClick={() => { setArchivo(null); setEstado({ corriendo: false, hechos: 0, error: '' }); }}>{estado.hechos ? 'Cerrar' : 'Cancelar'}</button>}
      </div>
    </section>
  );
}
