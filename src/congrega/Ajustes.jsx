import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { ROLES } from '../lib/store.jsx';
import { buscarCoincidencias, esExportPco, filaPco, fusionarDatos, parseCsv } from './importarPco.js';
import { activo, asistenciaId, nombreDe as nombreP, norm, useCongrega } from './datos.jsx';
import { todayISO } from '../lib/dates.js';
import { fechaExcel, leerXlsx } from './xlsx.js';
import { hojaCheckins, keyNueva, planAsistencia } from './importarAsistencia.js';

export default function Ajustes() {
  const { isAdmin } = useCongrega();
  if (!isAdmin) return <div className="card">Solo el Administrador de la iglesia ve los ajustes de Congrega.</div>;
  return <div className="cg-stack"><div className="page-head"><h1>Ajustes</h1></div><Voluntarios /><Consentimiento /><Importar /><ImportarAsistencia /></div>;
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

/** Historial de asistencia (Planning Center Check-Ins, planilla Excel). */
function ImportarAsistencia() {
  const { churchId, people, events = [], asistencia, myUid } = useCongrega();
  const [archivo, setArchivo] = useState(null);
  const [elecciones, setElecciones] = useState({});
  const [estado, setEstado] = useState({ corriendo: false, hechos: 0, total: 0, error: '', listo: false });

  const elegir = async (f) => {
    setEstado({ corriendo: false, hechos: 0, total: 0, error: '', listo: false });
    try {
      const checkins = hojaCheckins(await leerXlsx(await f.arrayBuffer()), fechaExcel);
      if (!checkins?.length) throw new Error('No encontré la hoja de Check-Ins (columnas Fecha de sesión, Evento, Nombre y Apellido).');
      setElecciones({});
      setArchivo({ nombre: f.name, plan: planAsistencia(checkins, people, events) });
    } catch (e) { setEstado((s) => ({ ...s, error: e.message })); }
  };

  if (!archivo) {
    return (
      <section className="card cg-stack">
        <h2>Importar historial de asistencia</h2>
        <p className="muted">Elige la planilla Excel con los Check-Ins de Planning Center. Cada asistencia se une con la persona que ya está en la app y con el evento de ese día. Si la cargas de nuevo, no se duplica nada.</p>
        <label className="btn cg-izq">Elegir planilla Excel
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) elegir(f); e.target.value = ''; }} />
        </label>
        {estado.error && <div className="cg-aviso" role="alert">{estado.error}</div>}
      </section>
    );
  }

  const { plan } = archivo;
  // destino: key de una persona existente, 'nueva' para crearla, o '' para no importar sus asistencias.
  const destinoDe = (p) => elecciones[p.clave] ?? (p.match?.key || 'nueva');
  const revisar = plan.personas.filter((p) => !p.match || p.match.motivo !== 'mismo nombre').sort((a, b) => b.n - a.n);
  const ordenadas = [...people].sort((a, b) => norm(nombreP(a)).localeCompare(norm(nombreP(b))));
  const nuevosEv = plan.eventos.filter((e) => e.nuevo);
  const porTipo = new Map(); plan.eventos.forEach((e) => porTipo.set(e.name, (porTipo.get(e.name) || 0) + 1));
  const desde = plan.eventos.reduce((m, e) => (e.date < m ? e.date : m), '9999');
  const hasta = plan.eventos.reduce((m, e) => (e.date > m ? e.date : m), '');

  const importar = async () => {
    const ref = (...x) => doc(db, 'churches', churchId, ...x);
    const keyDe = new Map(plan.personas.map((p) => { const d = destinoDe(p); return [p.clave, d === 'nueva' ? keyNueva(p) : d]; }));
    const regs = plan.registros.filter((r) => keyDe.get(r.clave) && !asistencia.has(asistenciaId(r.eventId, keyDe.get(r.clave))));
    setEstado({ corriendo: true, hechos: 0, total: regs.length, error: '', listo: false });
    try {
      const ops = [];
      nuevosEv.forEach((e) => ops.push((b) => b.set(ref('events', e.id), { name: e.name, date: e.date, time: '', items: [], notes: '', soloAsistencia: true, origen: 'Planning Center' }, { merge: true })));
      plan.personas.forEach((p) => {
        if (destinoDe(p) !== 'nueva' || people.some((x) => x.key === keyNueva(p))) return;
        const primera = plan.registros.filter((r) => r.clave === p.clave).reduce((m, r) => (r.date < m ? r.date : m), '9999');
        ops.push((b) => b.set(ref('people', keyNueva(p)), {
          name: `${p.nombre} ${p.apellido}`.trim().slice(0, 60), nombre: p.nombre, apellido: p.apellido, uid: '', role: 'colaborador',
          tipo: p.visita ? 'Visita' : '', estado: 'activo', miembro: false, esNino: p.nino, creadoEn: Date.now(), creadoPor: myUid, primeraVisita: primera,
        }));
      });
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db); ops.slice(i, i + 400).forEach((op) => op(b)); await b.commit();
      }
      // Asistencias una por una (las reglas revisan que el evento y la persona existan), de a 20 a la vez.
      let hechos = 0;
      for (let i = 0; i < regs.length; i += 20) {
        await Promise.all(regs.slice(i, i + 20).map((r) => {
          const k = keyDe.get(r.clave);
          return setDoc(ref('asistencia', asistenciaId(r.eventId, k)), { eventId: r.eventId, personKey: k, date: r.date, at: Date.parse(`${r.date}T12:00:00`), por: myUid });
        }));
        hechos = Math.min(regs.length, i + 20);
        setEstado((s) => ({ ...s, hechos }));
      }
      setEstado({ corriendo: false, hechos, total: regs.length, error: '', listo: true });
    } catch (e) {
      setEstado((s) => ({ ...s, corriendo: false, error: `La importación se detuvo: ${e.message}. Puedes intentarlo de nuevo; lo ya cargado no se duplica.` }));
    }
  };

  return (
    <section className="card cg-stack">
      <h2>Importar historial de asistencia</h2>
      <strong>{archivo.nombre}</strong>
      <span>{plan.registros.length} asistencias · {plan.eventos.length} eventos ({[...porTipo].map(([n, c]) => `${c} ${n}`).join(', ')}) · del {desde} al {hasta}</span>
      <span className="muted">{plan.personas.length - revisar.length === 1 ? '1 persona se encontró' : `${plan.personas.length - revisar.length} personas se encontraron`} por su nombre exacto. {nuevosEv.length < plan.eventos.length ? `${plan.eventos.length - nuevosEv.length === 1 ? '1 evento ya existía y se usa ese' : `${plan.eventos.length - nuevosEv.length} eventos ya existían y se usan esos`}.` : ''} Los eventos nuevos quedan solo en Congrega, no aparecen en la lista de servicios de Adora.</span>
      {revisar.length > 0 && (
        <>
          <h3 className="cg-h3">Revisa a estas {revisar.length} personas</h3>
          <p className="muted">No las encontramos con el nombre exacto. Elige quién es cada una, créala como persona nueva (las que Planning Center marcó como visita quedan como Visita), o no importes sus asistencias.</p>
          <div className="card cg-lista">
            {revisar.map((p) => (
              <div key={p.clave} className="cg-item">
                <span className="cg-quien"><span className="cg-nombre">{p.nombre} {p.apellido}</span><span className="cg-meta">{p.n} {p.n === 1 ? 'asistencia' : 'asistencias'}{p.visita ? ' · visita' : ''}{p.match ? ` · sugerido: ${p.match.motivo}` : p.candidatos.length > 1 ? ' · hay varias con ese nombre' : ''}</span></span>
                <select className="cg-unir" value={destinoDe(p)} disabled={estado.corriendo} onChange={(e) => setElecciones({ ...elecciones, [p.clave]: e.target.value })} aria-label={`Quién es ${p.nombre} ${p.apellido}`}>
                  <option value="nueva">{p.visita ? 'Crear como visita' : 'Crear como persona nueva'}</option>
                  <option value="">No importar sus asistencias</option>
                  {p.candidatos.length > 0 && <optgroup label="Sugeridas">{p.candidatos.map((k) => <option key={k} value={k}>{nombreP(people.find((x) => x.key === k))}</option>)}</optgroup>}
                  <optgroup label="Todas las personas">{ordenadas.map((x) => <option key={x.key} value={x.key}>{nombreP(x)}</option>)}</optgroup>
                </select>
              </div>
            ))}
          </div>
        </>
      )}
      {(estado.corriendo || estado.listo) && <span aria-live="polite">{estado.listo ? `Listo: ${estado.hechos} asistencias cargadas.` : `Cargando… ${estado.hechos} de ${estado.total}`}</span>}
      {estado.error && <div className="cg-aviso" role="alert">{estado.error}</div>}
      <div className="cg-row">
        {!estado.listo && <button type="button" className="btn primary" disabled={estado.corriendo} onClick={importar}>{estado.corriendo ? 'Cargando…' : `Importar ${plan.registros.length} asistencias`}</button>}
        {!estado.corriendo && <button type="button" className="btn" onClick={() => { setArchivo(null); setEstado({ corriendo: false, hechos: 0, total: 0, error: '', listo: false }); }}>{estado.listo ? 'Cerrar' : 'Cancelar'}</button>}
      </div>
    </section>
  );
}

/** Ley 21.719: registrar de una vez el consentimiento de quienes entregaron sus datos o fueron informados. */
function Consentimiento() {
  const { churchId, people, fichas, myUid, me } = useCongrega();
  const [inactivas, setInactivas] = useState(false);
  const [confirmo, setConfirmo] = useState(false);
  const [estado, setEstado] = useState({ corriendo: false, listo: 0, error: '' });
  const hoy = todayISO();
  const faltan = people.filter((p) => !fichas.get(p.key)?.consentimiento && (inactivas || activo(p)));
  const marcar = async () => {
    setEstado({ corriendo: true, listo: 0, error: '' });
    try {
      const ahora = Date.now();
      const nota = `Datos entregados por la persona o informada antes del ${hoy}. Marcado en bloque por ${me?.name || 'el Administrador'}.`;
      for (let i = 0; i < faltan.length; i += 400) {
        const b = writeBatch(db);
        faltan.slice(i, i + 400).forEach((p) => {
          const prev = fichas.get(p.key) || {};
          b.set(doc(db, 'churches', churchId, 'fichas', p.key), {
            consentimiento: true, fechaConsentimiento: hoy, medioConsentimiento: 'Entregados por la persona', notaConsentimiento: nota,
            consentimientoPor: myUid, consentimientoEn: ahora, actualizadoEn: ahora, actualizadoPor: myUid,
            cambios: [...(prev.cambios || []), { at: ahora, by: myUid, campos: ['consentimiento (marca en bloque)'] }].slice(-50),
          }, { merge: true });
        });
        await b.commit();
      }
      setEstado({ corriendo: false, listo: faltan.length, error: '' });
      setConfirmo(false);
    } catch (e) {
      setEstado({ corriendo: false, listo: 0, error: `No se pudo guardar: ${e.message}. Puedes intentarlo de nuevo.` });
    }
  };
  return (
    <section className="card cg-stack">
      <h2>Consentimiento de datos</h2>
      <p className="muted">La Ley 21.719 pide registrar que cada persona autorizó guardar sus datos. Si todos te los entregaron ellos mismos o fueron informados, puedes registrarlo de una vez. Cada ficha guarda la fecha, quién lo marcó y una nota de que fue en bloque.</p>
      {estado.listo > 0 && <div className="cg-aviso info" aria-live="polite">Listo: consentimiento registrado para {estado.listo} {estado.listo === 1 ? 'persona' : 'personas'}.</div>}
      {faltan.length ? (
        <>
          <span><strong>{faltan.length}</strong> {faltan.length === 1 ? 'persona no tiene' : 'personas no tienen'} el consentimiento registrado.</span>
          <label className="cg-row"><input type="checkbox" className="cg-checkbox" checked={inactivas} disabled={estado.corriendo} onChange={(e) => setInactivas(e.target.checked)} /><span className="cg-grow">Incluir también a las personas inactivas</span></label>
          <label className="cg-row"><input type="checkbox" className="cg-checkbox" checked={confirmo} disabled={estado.corriendo} onChange={(e) => setConfirmo(e.target.checked)} /><span className="cg-grow">Confirmo que estas personas entregaron sus datos o fueron informadas de que la iglesia los guarda.</span></label>
          <button type="button" className="btn primary cg-izq" disabled={!confirmo || estado.corriendo} onClick={marcar}>{estado.corriendo ? 'Guardando…' : `Registrar consentimiento de ${faltan.length} ${faltan.length === 1 ? 'persona' : 'personas'}`}</button>
        </>
      ) : <span className="muted">Todas las personas{inactivas ? '' : ' activas'} tienen el consentimiento registrado.</span>}
      {estado.error && <div className="cg-aviso" role="alert">{estado.error}</div>}
    </section>
  );
}
