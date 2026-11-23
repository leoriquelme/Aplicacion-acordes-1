import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { ROLES } from '../lib/store.jsx';
import { buscarCoincidencias, esExportPco, filaPco, fusionarDatos, parseCsv } from './importarPco.js';
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
  const { churchId, people, fichas, asistencia, myUid } = useCongrega();
  const [elecciones, setElecciones] = useState({});
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
            setElecciones({});
            f.text().then((t) => { const filas = parseCsv(t); if (!esExportPco(filas)) setEstado({ corriendo: false, hechos: 0, error: 'Ese archivo no parece una exportación de Planning Center People.' }); else setArchivo({ nombre: f.name, filas }); });
          }} />
        </label>
        {estado.error && <div className="cg-aviso" role="alert">{estado.error}</div>}
      </section>
    );
  }
  const filas = archivo.filas.map((r) => filaPco(r, { conNotasMedicas: medicas }));
  const fams = new Map(filas.filter((f) => f.familia).map((f) => [f.familia.id, f.familia]));
  const conMed = filas.filter((f) => f.tieneNotasMedicas).length;
  const sugeridas = archivo.sugeridas || (archivo.sugeridas = buscarCoincidencias(filas, people, fichas));
  // destino[key de la fila] = key de la persona existente con quien se une, o '' para crearla como nueva.
  const destinoDe = (f) => (f.key in elecciones ? elecciones[f.key] : sugeridas.get(f.key)?.key || '');
  const unidas = filas.filter((f) => destinoDe(f));
  const usados = new Set(unidas.map(destinoDe));
  const conCuentaLibres = people.filter((p) => p.uid && !usados.has(p.key));
  const porNombre = [...filas].sort((a, b) => a.persona.name.localeCompare(b.persona.name, 'es'));
  const nombreDe = (k) => people.find((p) => p.key === k)?.name || k;

  const importar = async () => {
    setEstado({ corriendo: true, hechos: 0, error: '' });
    try {
      const ref = (...x) => doc(db, 'churches', churchId, ...x);
      const ops = [];
      fams.forEach((f) => ops.push((b) => b.set(ref('families', f.id), { name: f.name }, { merge: true })));
      filas.forEach((f) => {
        const k = destinoDe(f) || f.key;
        const prevP = people.find((p) => p.key === k) || {};
        const persona = k === f.key ? f.persona : fusionarDatos(prevP, f.persona);
        ops.push((b) => b.set(ref('people', k), persona, { merge: true }));
        const prev = fichas.get(k) || {};
        const ficha = k === f.key ? f.ficha : fusionarDatos(prev, f.ficha);
        ops.push((b) => b.set(ref('fichas', k), {
          ...ficha, actualizadoEn: Date.now(),
          cambios: [...(prev.cambios || []), { at: Date.now(), campos: [k === f.key ? 'importación desde Planning Center' : 'unido con su registro de Planning Center'] }].slice(-50),
        }, { merge: true }));
        // Si antes se importó por separado (pco-…), se pasa su asistencia y se borra el duplicado.
        if (k !== f.key && people.some((p) => p.key === f.key)) {
          asistencia.forEach((a, id) => {
            if (a.personKey !== f.key) return;
            ops.push((b) => b.set(ref('asistencia', `${a.eventId}__${k}`), { ...a, personKey: k, por: myUid }));
            ops.push((b) => b.delete(ref('asistencia', id)));
          });
          ops.push((b) => b.delete(ref('fichas', f.key)));
          ops.push((b) => b.delete(ref('people', f.key)));
        }
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
      <span>{filas.length} personas · {unidas.length} se unen con alguien que ya está en la app · {fams.size} familias · {filas.filter((f) => f.persona.estado === 'inactivo').length} inactivas</span>
      <div className="cg-stack">
        <h3 className="cg-h3">Unir con quienes ya están en la app</h3>
        <p className="muted">Si alguien ya entró con Google (o ya estaba cargado), sus datos del CSV se agregan a su misma ficha en vez de crear otra. Revisa las sugerencias y cambia lo que no corresponda.</p>
        {unidas.length > 0 && (
          <div className="card cg-lista">
            {unidas.map((f) => (
              <div key={f.key} className="cg-item">
                <span className="cg-quien"><span className="cg-nombre">{f.persona.name}</span><span className="cg-meta">{sugeridas.get(f.key)?.key === destinoDe(f) ? `Sugerido: ${sugeridas.get(f.key).motivo}` : 'Elegido a mano'}</span></span>
                <select className="cg-unir" value={destinoDe(f)} disabled={estado.corriendo} onChange={(e) => setElecciones({ ...elecciones, [f.key]: e.target.value })} aria-label={`Con quién unir a ${f.persona.name}`}>
                  <option value={destinoDe(f)}>Unir con {nombreDe(destinoDe(f))}</option>
                  <option value="">Crear como persona nueva</option>
                </select>
              </div>
            ))}
          </div>
        )}
        {conCuentaLibres.length > 0 && (
          <>
            <p className="muted">Personas con cuenta que no encontramos en el CSV (por ejemplo, si usan un apodo). Elige quién es cada una, o déjala sin unir:</p>
            <div className="card cg-lista">
              {conCuentaLibres.map((p) => (
                <div key={p.key} className="cg-item">
                  <span className="cg-quien"><span className="cg-nombre">{p.name}</span><span className="cg-meta">Entró con su cuenta</span></span>
                  <select className="cg-unir" value="" disabled={estado.corriendo} aria-label={`Quién es ${p.name} en el CSV`}
                    onChange={(e) => e.target.value && setElecciones({ ...elecciones, [e.target.value]: p.key })}>
                    <option value="">No está en el CSV</option>
                    {porNombre.filter((f) => !destinoDe(f)).map((f) => <option key={f.key} value={f.key}>{f.persona.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
        {!unidas.length && !conCuentaLibres.length && <p className="muted">No hay coincidencias: todas se crearán como personas nuevas.</p>}
      </div>
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
