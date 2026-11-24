import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, deleteField, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Avatar } from '../components/Avatares.jsx';
import ElegirFoto from '../components/ElegirFoto.jsx';
import { CIVIL, RANGOS, ROLES_FAMILIA, TIPOS, activo, esMiembro, nombreDe, norm, useCongrega } from './datos.jsx';

const fmt = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
function edad(s) {
  if (!s) return null;
  const b = new Date(`${s}T12:00:00`); const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
const sino = (v) => (v === true ? 'Sí' : v === false ? 'No' : '');

function Dato({ label, value, full }) {
  const vacio = value == null || value === '' || (Array.isArray(value) && !value.length);
  return (
    <div className={`cg-dato${full ? ' full' : ''}`}>
      <span>{label}</span>
      <div className={vacio ? 'muted' : ''}>{vacio ? '—' : Array.isArray(value) ? value.join(', ') : String(value)}</div>
    </div>
  );
}

export default function Ficha() {
  const { key } = useParams();
  const nueva = key === 'nueva';
  const c = useCongrega();
  const { people, familias, fichas, asistencia, events = [], isAdmin } = c;
  const p = nueva ? { tipo: 'Activo', estado: 'activo', teams: [] } : people.find((x) => x.key === key);
  const [editar, setEditar] = useState(nueva);
  const [menu, setMenu] = useState(false);
  const [unir, setUnir] = useState(false);
  if (!p) return <div className="card">No encontramos a esta persona. <Link to="/congrega/personas">Volver a Personas</Link></div>;
  if (editar && isAdmin) return <Editar p={p} k={nueva ? null : key} onListo={() => setEditar(false)} />;

  const d = fichas.get(key) || {};
  const fam = p.familiaId && familias.get(p.familiaId);
  const vino = new Set(); asistencia.forEach((a) => { if (a.personKey === key) vino.add(a.eventId); });
  const ultimos = [...events].filter((e) => e.date).sort((a, b) => b.date.localeCompare(a.date)).filter((e) => [...asistencia.values()].some((a) => a.eventId === e.id)).slice(0, 8).reverse();
  const a = edad(d.fechaNacimiento);

  return (
    <div className="cg-stack">
      <div className="cg-row cg-entre">
        <Link className="btn ghost" to="/congrega/personas">← Personas</Link>
        {isAdmin && (
          <div className="cg-menu">
            <button type="button" className="btn primary" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>Editar ▾</button>
            {menu && (
              <>
                <div className="cg-menu-fondo" onClick={() => setMenu(false)} />
                <div className="cg-menu-panel" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); setEditar(true); }}>✏️ Editar datos</button>
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); setUnir(true); }}>🔗 Unir con otra ficha</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="cg-perfil">
        <Avatar name={nombreDe(p)} personKey={key} photo={p.photo || ''} size="xl" />
        <div className="cg-stack cg-grow">
          <h1 className="cg-titulo">{nombreDe(p)}</h1>
          {isAdmin && (
            <div className="cg-row">
              <ElegirFoto className="btn small" label="Subir foto" onFoto={(foto) => updateDoc(doc(db, 'churches', c.churchId, 'people', key), { photo: foto })}>
                {p.photo ? 'Cambiar foto' : 'Subir foto'}
              </ElegirFoto>
              {p.photo && <button type="button" className="btn small ghost" onClick={() => updateDoc(doc(db, 'churches', c.churchId, 'people', key), { photo: deleteField() })}>Quitar foto</button>}
            </div>
          )}
          {p.uid && p.photo && <span className="muted small">Si la persona tiene su propia foto en Adora, al entrar se vuelve a poner la suya.</span>}
        </div>
      </div>
      {isAdmin && !nueva && unir && <UnirCon p={p} onCerrar={() => setUnir(false)} />}
      {isAdmin && !d.consentimiento && <div className="cg-aviso">Falta registrar el consentimiento de esta persona para guardar sus datos (Ley 21.719).</div>}
      {c.marca && (
        <fieldset className="card cg-grid"><legend>Asistencia</legend>
          <div className="cg-dato full"><span>Últimos eventos con registro · {vino.size} en total</span>
            {ultimos.length ? <div className="cg-dots">{ultimos.map((e) => <span key={e.id} className={`cg-dot${vino.has(e.id) ? ' on' : ''}`} title={`${e.date} ${e.name || ''}`}>{Number(e.date.slice(8))}</span>)}</div> : <div className="muted">Sin registros todavía</div>}
          </div>
        </fieldset>
      )}
      <fieldset className="card cg-grid"><legend>Iglesia</legend>
        <Dato label="Miembro" value={sino(p.miembro)} />
        <Dato label="Asistencia habitual" value={p.tipo} />
        <Dato label="Rango de edad" value={p.rangoEdad} />
        <Dato label="Estado" value={activo(p) ? 'Activo' : 'Inactivo'} />
        <Dato label="Ministerios y equipos" value={p.teams || []} full />
        <Dato label="Familia" value={fam ? `${fam.name}${p.rolFamilia ? ` · ${p.rolFamilia}` : ''}` : ''} />
        {fam && (
          <div className="cg-dato full"><span>Integrantes de la familia</span>
            <div className="cg-tags">{people.filter((m) => m.familiaId === p.familiaId && m.key !== key).map((m) => <Link key={m.key} className="cg-tag" to={`/congrega/personas/${m.key}`}>{nombreDe(m)}{m.rolFamilia ? ` · ${m.rolFamilia}` : ''}</Link>)}</div>
          </div>
        )}
      </fieldset>
      {!isAdmin ? <div className="cg-aviso info">Los datos de contacto, cumpleaños y notas privadas solo los ven los administradores.</div> : (
        <>
          <fieldset className="card cg-grid"><legend>Datos personales</legend>
            <Dato label="Nombre completo" value={[p.nombre || p.name, d.segundoNombre, p.apellido].filter(Boolean).join(' ')} />
            <Dato label="Apodo" value={p.apodo} />
            <Dato label="Fecha de nacimiento" value={d.fechaNacimiento ? `${fmt(d.fechaNacimiento)}${a != null ? ` (${a} años)` : ''}` : ''} />
            <Dato label="Género" value={d.genero} />
            <Dato label="Estado civil" value={d.estadoCivil} />
            <Dato label="Aniversario de matrimonio" value={fmt(d.aniversario)} />
          </fieldset>
          <fieldset className="card cg-grid"><legend>Contacto</legend>
            <Dato label="Celular" value={d.telefono} />
            <Dato label="Correo" value={d.email} />
            <Dato label="Dirección" value={d.direccion} full />
            <Dato label="Comuna" value={d.comuna} />
            <Dato label="Región" value={d.region} />
          </fieldset>
          <fieldset className="card cg-grid"><legend>Vida en la iglesia</legend>
            <Dato label="Llegó a la iglesia" value={fmt(d.fechaLlegada)} />
            <Dato label="Fecha de conversión" value={fmt(d.fechaConversion)} />
            <Dato label="Bautizado/a" value={d.bautizado ? `Sí${d.fechaBautismo ? `, ${fmt(d.fechaBautismo)}` : ''}` : sino(d.bautizado)} />
            {!activo(p) && <Dato label="Motivo de inactividad" value={[d.motivoInactivo, d.fechaInactivo && `desde ${fmt(d.fechaInactivo)}`].filter(Boolean).join(', ')} />}
          </fieldset>
          <fieldset className="card cg-grid"><legend>Notas privadas <span className="muted">· solo administradores</span></legend>
            <Dato label="Notas pastorales" value={d.notas} full />
            <Dato label="Notas médicas" value={d.notasMedicas} full />
          </fieldset>
          <fieldset className="card cg-grid"><legend>Consentimiento y registro</legend>
            <Dato label="Consentimiento de datos" value={d.consentimiento ? `Sí${d.fechaConsentimiento ? `, ${fmt(d.fechaConsentimiento)}` : ''}${d.medioConsentimiento ? ` (${d.medioConsentimiento})` : ''}` : 'No registrado'} />
            {d.notaConsentimiento && <Dato full label="Nota del consentimiento" value={d.notaConsentimiento} />}
            <Dato label="Última modificación" value={d.actualizadoEn ? new Date(d.actualizadoEn).toLocaleString('es-CL') : ''} />
            {(d.cambios || []).length > 0 && <Dato full label="Historial de cambios" value={(d.cambios || []).slice(-5).reverse().map((x) => `${new Date(x.at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })} · ${(x.campos || []).join(', ')}`).join('\n')} />}
          </fieldset>
          {!p.uid && <Eliminar k={key} nombre={nombreDe(p)} />}
        </>
      )}
    </div>
  );
}

function Eliminar({ k, nombre }) {
  const { eliminarPersona } = useCongrega();
  const navigate = useNavigate();
  const [seguro, setSeguro] = useState(false);
  if (!seguro) return <div><button type="button" className="btn danger" onClick={() => setSeguro(true)}>Eliminar persona</button></div>;
  return (
    <div className="cg-aviso cg-row">
      <span className="cg-grow">¿Eliminar a {nombre}, su ficha y su asistencia? No se puede deshacer.</span>
      <button type="button" className="btn danger" onClick={async () => { await eliminarPersona(k); navigate('/congrega/personas'); }}>Sí, eliminar</button>
      <button type="button" className="btn" onClick={() => setSeguro(false)}>Cancelar</button>
    </div>
  );
}

function Campo({ label, children, full }) {
  return <label className={`cg-dato${full ? ' full' : ''}`}><span>{label}</span>{children}</label>;
}
function Opciones({ value, onChange, options, vacio = '—' }) {
  return <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}><option value="">{vacio}</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
}

const PERSONA = ['nombre', 'apellido', 'apodo', 'tipo', 'miembro', 'rangoEdad', 'esNino', 'estado', 'familiaId', 'rolFamilia', 'teams'];

function Editar({ p, k, onListo }) {
  const { fichas, familias, guardarPersona, crearFamilia, people } = useCongrega();
  const navigate = useNavigate();
  const d0 = (k && fichas.get(k)) || {};
  const [f, setF] = useState({ ...d0, ...Object.fromEntries(PERSONA.map((x) => [x, p[x]])), nombre: p.nombre || (!p.apellido ? p.name : '') || '', teams: p.teams || [] });
  const [famNueva, setFamNueva] = useState('');
  const [error, setError] = useState('');
  const set = (campo) => (v) => setF((x) => ({ ...x, [campo]: v?.target ? v.target.value : v }));
  const bool = (v) => (v === 'Sí' ? true : v === 'No' ? false : null);
  const ministerios = [...new Set(people.flatMap((x) => x.teams || []).concat(f.teams))].sort();
  const [otro, setOtro] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    if (!f.nombre?.trim()) { setError('El nombre es obligatorio.'); return; }
    try {
      let familiaId = f.familiaId || null;
      if (familiaId === '__nueva') { if (!famNueva.trim()) { setError('Escribe el nombre de la familia.'); return; } familiaId = await crearFamilia(famNueva.trim()); }
      const persona = Object.fromEntries(PERSONA.map((x) => [x, f[x] ?? null]));
      Object.assign(persona, { nombre: f.nombre.trim(), apellido: (f.apellido || '').trim(), familiaId, estado: f.estado || 'activo', esNino: Boolean(f.esNino) });
      persona.name = `${persona.nombre} ${persona.apellido}`.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(f.fechaNacimiento || '')) persona.birthday = f.fechaNacimiento.slice(5);
      const ficha = Object.fromEntries(Object.entries(f).filter(([x]) => !PERSONA.includes(x) && !['cambios', 'actualizadoEn', 'actualizadoPor'].includes(x)));
      const cambios = Object.keys(f).filter((x) => !['cambios', 'actualizadoEn', 'actualizadoPor'].includes(x) && JSON.stringify(f[x] ?? '') !== JSON.stringify((PERSONA.includes(x) ? p[x] : d0[x]) ?? ''));
      const id = await guardarPersona(k, persona, ficha, cambios);
      if (k) onListo(); else navigate(`/congrega/personas/${id}`, { replace: true });
    } catch (err) { setError(`No se pudo guardar: ${err.message}`); }
  };

  return (
    <form className="cg-stack" onSubmit={guardar}>
      <div className="cg-row"><h2 className="cg-grow">{k ? `Editar a ${nombreDe(p)}` : 'Nueva persona'}</h2></div>
      {p.uid && <div className="cg-aviso info">Esta persona tiene cuenta en la app: su nombre, foto y equipos también los puede cambiar ella misma.</div>}
      <fieldset className="card cg-grid"><legend>Identificación</legend>
        <Campo label="Nombre"><input value={f.nombre || ''} onChange={set('nombre')} /></Campo>
        <Campo label="Segundo nombre"><input value={f.segundoNombre || ''} onChange={set('segundoNombre')} /></Campo>
        <Campo label="Apellidos"><input value={f.apellido || ''} onChange={set('apellido')} /></Campo>
        <Campo label="Apodo"><input value={f.apodo || ''} onChange={set('apodo')} /></Campo>
      </fieldset>
      <fieldset className="card cg-grid"><legend>Situación en la iglesia</legend>
        <Campo label="Miembro"><Opciones value={sino(f.miembro)} onChange={(v) => set('miembro')(bool(v))} options={['Sí', 'No']} /></Campo>
        <Campo label="Asistencia habitual"><Opciones value={f.tipo} onChange={set('tipo')} options={TIPOS} /></Campo>
        <Campo label="Rango de edad"><Opciones value={f.rangoEdad} onChange={set('rangoEdad')} options={RANGOS} /></Campo>
        <Campo label="Es niño/a"><Opciones value={f.esNino ? 'Sí' : 'No'} onChange={(v) => set('esNino')(v === 'Sí')} options={['Sí', 'No']} /></Campo>
        <Campo label="Estado"><Opciones value={f.estado === 'inactivo' ? 'Inactivo' : 'Activo'} onChange={(v) => set('estado')(v === 'Inactivo' ? 'inactivo' : 'activo')} options={['Activo', 'Inactivo']} /></Campo>
        <Campo label="Motivo de inactividad"><Opciones value={f.motivoInactivo} onChange={set('motivoInactivo')} options={['Cambio de iglesia', 'Cambio de domicilio', 'No volvió a asistir', 'Fallecido/a', 'Otro']} /></Campo>
        <Campo label="Inactivo desde"><input type="date" value={f.fechaInactivo || ''} onChange={set('fechaInactivo')} /></Campo>
      </fieldset>
      <fieldset className="card cg-grid"><legend>Familia y ministerios</legend>
        <Campo label="Familia">
          <select value={f.familiaId || ''} onChange={set('familiaId')}>
            <option value="">Sin familia</option>
            {[...familias.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            <option value="__nueva">Nueva familia…</option>
          </select>
          {f.familiaId === '__nueva' && <input value={famNueva} onChange={(e) => setFamNueva(e.target.value)} placeholder="Ej. Rojas Muñoz" />}
        </Campo>
        <Campo label="Rol en la familia"><Opciones value={f.rolFamilia} onChange={set('rolFamilia')} options={ROLES_FAMILIA} /></Campo>
        <div className="cg-dato full"><span>Ministerios y equipos</span>
          <div className="cg-tags">
            {ministerios.map((m) => <button key={m} type="button" className="cg-tag" aria-pressed={f.teams.includes(m)} onClick={() => set('teams')(f.teams.includes(m) ? f.teams.filter((x) => x !== m) : [...f.teams, m])}>{m}</button>)}
            <input className="cg-tag-input" value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Otro…" onKeyDown={(e) => { if (e.key === 'Enter' && otro.trim()) { e.preventDefault(); set('teams')([...new Set([...f.teams, otro.trim()])]); setOtro(''); } }} />
          </div>
        </div>
      </fieldset>
      <fieldset className="card cg-grid"><legend>Datos personales y contacto</legend>
        <Campo label="Fecha de nacimiento"><input type="date" value={f.fechaNacimiento || ''} onChange={set('fechaNacimiento')} /></Campo>
        <Campo label="Género"><Opciones value={f.genero} onChange={set('genero')} options={['Femenino', 'Masculino', 'Prefiere no decir']} /></Campo>
        <Campo label="Estado civil"><Opciones value={f.estadoCivil} onChange={set('estadoCivil')} options={CIVIL} /></Campo>
        <Campo label="Aniversario de matrimonio"><input type="date" value={f.aniversario || ''} onChange={set('aniversario')} /></Campo>
        <Campo label="Celular"><input type="tel" value={f.telefono || ''} onChange={set('telefono')} placeholder="9 1234 5678" /></Campo>
        <Campo label="Correo"><input type="email" value={f.email || ''} onChange={set('email')} /></Campo>
        <Campo label="Dirección" full><input value={f.direccion || ''} onChange={set('direccion')} /></Campo>
        <Campo label="Comuna"><input value={f.comuna || ''} onChange={set('comuna')} /></Campo>
        <Campo label="Región"><input value={f.region || ''} onChange={set('region')} /></Campo>
      </fieldset>
      <fieldset className="card cg-grid"><legend>Vida en la iglesia</legend>
        <Campo label="Fecha de llegada"><input type="date" value={f.fechaLlegada || ''} onChange={set('fechaLlegada')} /></Campo>
        <Campo label="Fecha de conversión"><input type="date" value={f.fechaConversion || ''} onChange={set('fechaConversion')} /></Campo>
        <Campo label="Bautizado/a"><Opciones value={sino(f.bautizado)} onChange={(v) => set('bautizado')(bool(v))} options={['Sí', 'No']} /></Campo>
        <Campo label="Fecha de bautismo"><input type="date" value={f.fechaBautismo || ''} onChange={set('fechaBautismo')} /></Campo>
      </fieldset>
      <fieldset className="card cg-grid"><legend>Notas privadas <span className="muted">· solo administradores</span></legend>
        <Campo label="Notas pastorales" full><textarea value={f.notas || ''} onChange={set('notas')} rows={4} /></Campo>
        <Campo label="Notas médicas (alergias, enfermedades)" full><textarea value={f.notasMedicas || ''} onChange={set('notasMedicas')} rows={3} /></Campo>
      </fieldset>
      <fieldset className="card cg-grid"><legend>Consentimiento</legend>
        <Campo label="¿Autorizó guardar sus datos?"><Opciones value={f.consentimiento ? 'Sí' : ''} onChange={(v) => set('consentimiento')(v === 'Sí')} options={['Sí', 'No']} /></Campo>
        <Campo label="Fecha"><input type="date" value={f.fechaConsentimiento || ''} onChange={set('fechaConsentimiento')} /></Campo>
        <Campo label="Medio"><Opciones value={f.medioConsentimiento} onChange={set('medioConsentimiento')} options={['Formulario en papel', 'Formulario digital', 'Verbal', 'Entregados por la persona']} /></Campo>
      </fieldset>
      {error && <div className="cg-aviso" role="alert">{error}</div>}
      <div className="cg-row">
        <button className="btn primary" type="submit">{k ? 'Guardar cambios' : 'Crear persona'}</button>
        <button className="btn" type="button" onClick={() => (k ? onListo() : navigate('/congrega/personas'))}>Cancelar</button>
      </div>
    </form>
  );
}

export { esMiembro };

/** Unir a mano con otra ficha que es la misma persona (por ejemplo, con otro nombre o apodo). */
function UnirCon({ p, onCerrar }) {
  const { people, unirPersonas } = useCongrega();
  const navigate = useNavigate();
  const [otra, setOtra] = useState('');
  const [estado, setEstado] = useState('');
  const opciones = people.filter((x) => x.key !== p.key && !(x.uid && p.uid)).sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  return (
    <div className="card">
      <div className="cg-row cg-entre"><strong>Unir con otra ficha de la misma persona</strong><button type="button" className="btn small ghost" onClick={onCerrar} aria-label="Cerrar">✕</button></div>
      <div className="cg-stack" style={{ marginTop: '0.7rem' }}>
        <p className="muted">Se juntan los datos, la familia, los ministerios y toda la asistencia en una sola ficha. Si una de las dos entró con su cuenta, queda esa.</p>
        <select value={otra} onChange={(e) => setOtra(e.target.value)} aria-label="Con quién unir" disabled={estado === 'uniendo'}>
          <option value="">Elige a la otra persona…</option>
          {opciones.map((x) => <option key={x.key} value={x.key}>{nombreDe(x)}</option>)}
        </select>
        {estado && estado !== 'uniendo' && <div className="cg-aviso" role="alert">{estado}</div>}
        <button type="button" className="btn primary cg-izq" disabled={!otra || estado === 'uniendo'} onClick={async () => {
          setEstado('uniendo');
          try { const k = await unirPersonas(p.key, otra); setEstado(''); setOtra(''); onCerrar(); navigate(`/congrega/personas/${k}`, { replace: true }); } catch (e) { setEstado(`No se pudo unir: ${e.message}`); }
        }}>{estado === 'uniendo' ? 'Uniendo…' : 'Unir en una'}</button>
      </div>
    </div>
  );
}
