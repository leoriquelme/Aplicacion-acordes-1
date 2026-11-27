// Mi ficha: cada persona ve y actualiza solo sus datos (contacto, foto y consentimiento) y ve a su familia.
// Es lo que ven en Congrega el Miembro y el Colaborador (y el Encargado de asistencia).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, deleteField, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Avatar } from '../components/Avatares.jsx';
import ElegirFoto from '../components/ElegirFoto.jsx';
import { CIVIL, activo, nombreDe, useCongrega } from './datos.jsx';
import { aparecerEnDirectorio, salirDelDirectorio, useDirectorio } from '../lib/directorio.jsx';

const CAMPOS = [
  ['telefono', 'Celular', 'tel'], ['email', 'Correo', 'email'], ['direccion', 'Dirección', 'text', true], ['comuna', 'Comuna', 'text'], ['region', 'Región', 'text'],
  ['fechaNacimiento', 'Fecha de nacimiento', 'date'], ['aniversario', 'Aniversario de matrimonio', 'date'],
];

export default function MiFicha() {
  const c = useCongrega();
  const { people, familias, fichas, myUid, churchId, guardarMisDatos } = c;
  const p = people.find((x) => x.key === myUid);
  const d = fichas.get(myUid) || {};
  const [f, setF] = useState(null);
  const [estado, setEstado] = useState('');
  if (!p) return <div className="card">Todavía no tienes ficha en esta iglesia. Entra una vez a Adora con tu cuenta y vuelve aquí.</div>;
  const fam = p.familiaId && familias.get(p.familiaId);
  const parientes = p.familiaId ? people.filter((m) => m.familiaId === p.familiaId && m.key !== p.key && activo(m)) : [];
  const persona = doc(db, 'churches', churchId, 'people', myUid);
  const editando = f != null;

  const guardar = async (e) => {
    e.preventDefault();
    setEstado('guardando');
    try {
      const datos = Object.fromEntries(CAMPOS.map(([k]) => [k, (f[k] || '').trim()]).concat([['genero', f.genero || ''], ['estadoCivil', f.estadoCivil || '']]));
      if (f.consentimiento && !d.consentimiento) Object.assign(datos, { consentimiento: true, fechaConsentimiento: new Date().toISOString().slice(0, 10), medioConsentimiento: 'En la app, por la persona' });
      const cambios = Object.keys(datos).filter((k) => (datos[k] ?? '') !== (d[k] ?? ''));
      await guardarMisDatos(datos, cambios);
      const md = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x.slice(5) : null);
      const pub = {};
      if (md(datos.fechaNacimiento) && md(datos.fechaNacimiento) !== p.birthday) pub.birthday = md(datos.fechaNacimiento);
      if (md(datos.aniversario) !== (p.aniversarioMD || null)) pub.aniversarioMD = md(datos.aniversario);
      if (Object.keys(pub).length) await updateDoc(persona, pub).catch(() => {});
      setF(null); setEstado('ok');
    } catch (err) { setEstado(`No se pudo guardar: ${err.message}`); }
  };

  return (
    <div className="cg-stack">
      <div className="page-head"><h1>Mi ficha</h1></div>
      <div className="cg-perfil">
        <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="xl" />
        <div className="cg-stack cg-grow">
          <h2 className="cg-titulo">{nombreDe(p)}</h2>
          <div className="cg-row">
            <ElegirFoto className="btn small" label="Subir foto" onFoto={(foto) => updateDoc(persona, { photo: foto })}>{p.photo ? 'Cambiar foto' : 'Subir foto'}</ElegirFoto>
            {p.photo && <button type="button" className="btn small ghost" onClick={() => updateDoc(persona, { photo: deleteField() })}>Quitar foto</button>}
          </div>
        </div>
      </div>

      <fieldset className="card cg-grid"><legend>Mi familia</legend>
        {fam ? (
          <div className="cg-dato full"><span>Familia {fam.name}</span>
            <div className="cg-tags">{parientes.length ? parientes.map((m) => <span key={m.key} className="cg-tag">{nombreDe(m)}{m.rolFamilia ? ` · ${m.rolFamilia}` : ''}</span>) : <span className="muted">Solo tú por ahora.</span>}</div>
          </div>
        ) : <div className="cg-dato full muted">Todavía no estás en una familia. Pídele al Administrador que te agregue.</div>}
      </fieldset>

      {estado === 'ok' && <div className="cg-aviso info">Listo, tus datos quedaron guardados.</div>}
      {estado && !['ok', 'guardando'].includes(estado) && <div className="cg-aviso" role="alert">{estado}</div>}

      {!editando ? (
        <>
          <fieldset className="card cg-grid"><legend>Mis datos</legend>
            {CAMPOS.map(([k, l, , full]) => (
              <div key={k} className={`cg-dato${full ? ' full' : ''}`}><span>{l}</span><div className={d[k] ? '' : 'muted'}>{d[k] || '—'}</div></div>
            ))}
            <div className="cg-dato"><span>Género</span><div className={d.genero ? '' : 'muted'}>{d.genero || '—'}</div></div>
            <div className="cg-dato"><span>Estado civil</span><div className={d.estadoCivil ? '' : 'muted'}>{d.estadoCivil || '—'}</div></div>
            <div className="cg-dato full"><span>Consentimiento de datos (Ley 21.719)</span><div>{d.consentimiento ? `Autorizado${d.fechaConsentimiento ? ` el ${d.fechaConsentimiento}` : ''}` : 'No registrado'}</div></div>
          </fieldset>
          <div><button type="button" className="btn primary" onClick={() => { setEstado(''); setF({ ...d, consentimiento: Boolean(d.consentimiento) }); }}>Actualizar mis datos</button></div>
        </>
      ) : (
        <form className="cg-stack" onSubmit={guardar}>
          <fieldset className="card cg-grid"><legend>Mis datos</legend>
            {CAMPOS.map(([k, l, tipo, full]) => (
              <label key={k} className={`cg-dato${full ? ' full' : ''}`}><span>{l}</span><input type={tipo} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
            ))}
            <label className="cg-dato"><span>Género</span>
              <select value={f.genero || ''} onChange={(e) => setF({ ...f, genero: e.target.value })}><option value="">—</option>{['Femenino', 'Masculino', 'Prefiere no decir'].map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="cg-dato"><span>Estado civil</span>
              <select value={f.estadoCivil || ''} onChange={(e) => setF({ ...f, estadoCivil: e.target.value })}><option value="">—</option>{CIVIL.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            {!d.consentimiento && (
              <label className="cg-dato full cg-consentimiento">
                <span>Consentimiento</span>
                <span><input type="checkbox" className="cg-checkbox" checked={Boolean(f.consentimiento)} onChange={(e) => setF({ ...f, consentimiento: e.target.checked })} /> Autorizo a la iglesia a guardar mis datos para contactarme y acompañarme (Ley 21.719).</span>
              </label>
            )}
          </fieldset>
          <div className="cg-row">
            <button type="submit" className="btn primary" disabled={estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" className="btn ghost" onClick={() => setF(null)}>Cancelar</button>
          </div>
        </form>
      )}
      <EnDirectorio churchId={churchId} uid={myUid} ficha={d} />
      {c.verPersonas && <p className="muted small">Para ver a toda la iglesia, entra a <Link to="/congrega/personas">Personas</Link>.</p>}
    </div>
  );
}

/** Aparecer (o no) en el directorio de hermanos con mi celular y correo. Es voluntario. */
function EnDirectorio({ churchId, uid, ficha }) {
  const dir = useDirectorio(churchId);
  const mio = dir.get(uid);
  const [conCorreo, setConCorreo] = useState(false);
  const [msg, setMsg] = useState('');
  const tel = (ficha.telefono || '').trim();
  const hacer = (f, ok) => f().then(() => setMsg(ok)).catch((e) => setMsg(`No se pudo: ${e.message}`));
  return (
    <fieldset className="card cg-stack"><legend>Directorio de hermanos</legend>
      {mio ? (
        <>
          <p className="small">Apareces en el <Link to="/congrega/directorio">directorio</Link> con tu celular{mio.email ? ' y tu correo' : ''}. Solo lo ven los hermanos de la iglesia.</p>
          <div className="cg-row">
            {(mio.telefono !== tel) && tel && <button type="button" className="btn small" onClick={() => hacer(() => aparecerEnDirectorio(churchId, uid, { telefono: tel, email: mio.email ? ficha.email : '' }), 'Listo: actualizado.')}>Usar mi celular nuevo</button>}
            <button type="button" className="btn small ghost" onClick={() => hacer(() => salirDelDirectorio(churchId, uid), 'Listo: ya no apareces en el directorio.')}>Dejar de aparecer</button>
          </div>
        </>
      ) : (
        <>
          <p className="small">Si quieres, los hermanos pueden ver tu celular para llamarte o escribirte por WhatsApp. Es voluntario y lo puedes quitar cuando quieras.</p>
          {tel ? (
            <>
              <label className="cg-row small"><input type="checkbox" className="cg-checkbox" checked={conCorreo} onChange={(e) => setConCorreo(e.target.checked)} /> Mostrar también mi correo</label>
              <div><button type="button" className="btn small primary" onClick={() => hacer(() => aparecerEnDirectorio(churchId, uid, { telefono: tel, email: conCorreo ? ficha.email || '' : '' }), 'Listo: ya apareces en el directorio.')}>Aparecer en el directorio</button></div>
            </>
          ) : <p className="muted small">Primero pon tu celular en "Actualizar mis datos".</p>}
        </>
      )}
      {msg && <p className="small">{msg}</p>}
    </fieldset>
  );
}
