// Unir perfiles repetidos (vienen de distintas bases). Se usa en Ajustes y en Personas → Repetidos.
import { useState } from 'react';
import { Avatar } from '../components/Avatares.jsx';
import { nombreDe, norm, useCongrega } from './datos.jsx';
import { compararPerfiles, cuentasPorEnlazar, gruposDuplicados, ordenarUnion } from './unir.js';

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
      <p className="muted">Cuando una persona aparece dos veces, búscala y únela: lo que le falta a una ficha se completa con la otra, y donde tengan datos distintos eliges cuál queda. Se junta toda la asistencia. Si una entró con Google, queda esa.</p>
      <UnirManual />
      <h3 className="cg-h3">Con el mismo nombre</h3>
      <Repetidos />
    </section>
  );
}

function UnirManual() {
  return <div className="card cg-manual"><UnirBuscador /></div>;
}

const coincide = (p, q) => {
  const t = norm(q).trim();
  if (!t) return false;
  const texto = norm([nombreDe(p), p.name, p.apodo, ...(p.otrosNombres || [])].filter(Boolean).join(' '));
  return t.split(/\s+/).every((w) => texto.includes(w));
};

/** Busca a una persona por nombre, apodo u otros nombres. Las que entraron con Google van primero. */
function Buscar({ label, excluir = [], onElegir, cuentas }) {
  const { people } = useCongrega();
  const [q, setQ] = useState('');
  const res = q.trim().length < 2 ? [] : people.filter((p) => !excluir.includes(p.key) && coincide(p, q))
    .sort((a, b) => (Boolean(b.uid) - Boolean(a.uid)) || norm(nombreDe(a)).localeCompare(norm(nombreDe(b)))).slice(0, 8);
  return (
    <div className="cg-buscar-unir">
      <label className="cg-dato"><span>{label}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe un nombre o apodo…" autoComplete="off" />
      </label>
      {q.trim().length >= 2 && (
        <div className="cg-lista cg-resultados">
          {!res.length && <div className="muted cg-vacio">Nadie con ese nombre.</div>}
          {res.map((p) => (
            <button key={p.key} type="button" className="cg-item cg-resultado" onClick={() => { onElegir(p.key); setQ(''); }}>
              <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
              <span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}</span>
                <span className="cg-meta">{p.uid ? <><span className="cg-chip">Google</span> {cuentas?.get(p.uid)?.email || 'con cuenta'}</> : 'Sin cuenta'}{p.apodo ? ` · “${p.apodo}”` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Elegida({ p, onCambiar, cuentas }) {
  return (
    <div className="cg-item cg-elegida">
      <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
      <span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}</span>
        <span className="cg-meta">{p.uid ? <><span className="cg-chip">Google</span> {cuentas?.get(p.uid)?.email || 'con cuenta'}</> : 'Sin cuenta'}</span>
      </span>
      {onCambiar && <button type="button" className="btn small ghost" onClick={onCambiar}>Cambiar</button>}
    </div>
  );
}

/**
 * Unir dos fichas de la misma persona sacando lo mejor de cada una.
 * `fija`: una de las dos ya elegida (desde su ficha). `onListo(key)`: después de unir.
 */
export function UnirBuscador({ fija = '', onListo }) {
  const { people, fichas, familias, cuentas, unirPersonas } = useCongrega();
  const [a, setA] = useState(fija);
  const [b, setB] = useState('');
  const [elecciones, setElecciones] = useState({});
  const [estado, setEstado] = useState('');
  const pa = people.find((p) => p.key === a); const pb = people.find((p) => p.key === b);
  const orden = pa && pb ? ordenarUnion(pa, pb) : null;
  const [base, otra] = orden || [];
  const filas = orden ? compararPerfiles(base, otra, fichas.get(base.key) || {}, fichas.get(otra.key) || {}) : [];
  const completa = filas.filter((x) => x.estado === 'soloB');
  const distintos = filas.filter((x) => x.estado === 'distinto');
  const iguales = filas.filter((x) => x.estado === 'igual' || x.estado === 'soloA').length;
  const ver = (campo, v) => {
    if (v === true) return 'Sí'; if (v === false) return 'No';
    if (campo === 'photo') return <img src={v} alt="" className="cg-mini-foto" />;
    if (campo === 'familiaId') return `Familia ${familias.get(v)?.name || '(otra)'}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return new Date(`${v}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    return String(v);
  };
  const limpiar = () => { setElecciones({}); setEstado(''); };
  const unir = async () => {
    setEstado('uniendo');
    try {
      const k = await unirPersonas(base.key, otra.key, elecciones);
      setEstado('Listo: quedó un solo perfil con lo mejor de las dos fichas.'); setB(''); if (!fija) setA(''); setElecciones({});
      onListo?.(k);
    } catch (e) { setEstado(`No se pudo unir: ${e.message}`); }
  };
  return (
    <div className="cg-stack">
      {pa ? <Elegida p={pa} cuentas={cuentas} onCambiar={fija ? null : () => { setA(''); limpiar(); }} />
        : <Buscar label="Primera ficha" excluir={[b]} cuentas={cuentas} onElegir={(k) => { setA(k); limpiar(); }} />}
      {pa && (pb ? <Elegida p={pb} cuentas={cuentas} onCambiar={() => { setB(''); limpiar(); }} />
        : <Buscar label="¿Con quién la unes? (la misma persona)" excluir={[a]} cuentas={cuentas} onElegir={(k) => { setB(k); limpiar(); }} />)}
      {pa && pb && !orden && <div className="cg-aviso">Las dos entraron con su propia cuenta de Google; no se pueden unir.</div>}
      {orden && (
        <div className="card cg-stack cg-vista-union">
          <p><strong>Se mantiene la ficha de {nombreDe(base)}</strong>{base.uid ? ' (entró con Google)' : ''}, con la asistencia, familia y ministerios de las dos. No se pierde ningún dato.</p>
          {completa.length > 0 && (
            <div className="cg-stack">
              <h4 className="cg-h3">Se completa con la otra ficha</h4>
              {completa.map((x) => <div key={x.campo} className="cg-dato"><span>{x.label}</span><div>{ver(x.campo, x.b)}</div></div>)}
            </div>
          )}
          {distintos.length > 0 && (
            <div className="cg-stack">
              <h4 className="cg-h3">Distintos: elige cuál queda</h4>
              {distintos.map((x) => {
                const elegido = Object.prototype.hasOwnProperty.call(elecciones, x.campo) ? elecciones[x.campo] : x.elegido;
                return (
                  <div key={x.campo} className="cg-dato"><span>{x.label}</span>
                    <div className="cg-opciones" role="radiogroup" aria-label={x.label}>
                      {[x.a, x.b].map((v, i) => (
                        <button key={i} type="button" role="radio" aria-checked={elegido === v} className={`cg-op${elegido === v ? ' on' : ''}`} onClick={() => setElecciones({ ...elecciones, [x.campo]: v })}>{ver(x.campo, v)}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!completa.length && !distintos.length && <p className="muted">Los datos ya coinciden; solo se juntan la asistencia y los ministerios.</p>}
          {iguales > 0 && <p className="muted small">{iguales} {iguales === 1 ? 'dato se mantiene' : 'datos se mantienen'} como están.</p>}
        </div>
      )}
      {estado && estado !== 'uniendo' && <div className={`cg-aviso${estado.startsWith('Listo') ? ' info' : ''}`} aria-live="polite">{estado}</div>}
      {orden && (
        <button type="button" className="btn primary cg-izq" disabled={estado === 'uniendo'} onClick={unir}>
          {estado === 'uniendo' ? 'Uniendo…' : 'Unir con lo mejor de cada una'}
        </button>
      )}
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
                  <span className="cg-meta">{!fuera(p) && elegida?.key === p.key ? 'Base · ' : ''}{meta(p, familias, veces)}</span>
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

const ES_OTRA = 'congrega.enlazarDescartadas';
const leerOtras = () => { try { return new Set(JSON.parse(localStorage.getItem(ES_OTRA) || '[]')); } catch { return new Set(); } };

/**
 * Hermanos que entraron con su cuenta (por ejemplo con el QR) y ya tenían ficha en la iglesia:
 * el Administrador las enlaza con un toque, así su cuenta queda con su familia, asistencia y datos.
 */
export function EnlazarCuentas() {
  const { people, fichas, cuentas, unirPersonas } = useCongrega();
  const [otras, setOtras] = useState(leerOtras);
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState('');
  const lista = cuentasPorEnlazar(people, fichas, cuentas).filter((x) => !otras.has(`${x.cuenta.key}|${x.ficha.key}`));
  if (!lista.length && !aviso) return null;
  const descartar = (id) => { const n = new Set(otras); n.add(id); setOtras(n); try { localStorage.setItem(ES_OTRA, JSON.stringify([...n].slice(-300))); } catch { /* sin almacenamiento */ } };
  const enlazar = async ({ cuenta, ficha }) => {
    const id = `${cuenta.key}|${ficha.key}`;
    setOcupado(id); setAviso('');
    try {
      // La cuenta de Google trae el nombre completo junto; la ficha lo tiene separado (nombre y apellidos): vale el de la ficha.
      const elecciones = ficha.nombre && !cuenta.nombre && !cuenta.apellido ? { nombre: ficha.nombre } : {};
      await unirPersonas(cuenta.key, [ficha.key], elecciones);
      setAviso(`Listo: la cuenta de ${nombreDe(cuenta)} quedó enlazada con su ficha.`);
    } catch (e) { setAviso(`No se pudo enlazar: ${e.message}`); }
    setOcupado('');
  };
  return (
    <section className="card cg-panel ancho cg-sugerencias">
      <div className="cg-panel-head"><h3>🔗 Hermanos que entraron con su cuenta</h3><span className="muted small">{lista.length}</span></div>
      <p className="muted">Ya tenían ficha en la iglesia. Al enlazarlas, la cuenta se queda con su familia, asistencia y datos.</p>
      {lista.slice(0, 8).map((x) => {
        const id = `${x.cuenta.key}|${x.ficha.key}`;
        return (
          <div key={id} className="cg-item cg-sugerencia">
            <Avatar name={nombreDe(x.cuenta)} personKey={x.cuenta.key} photo={x.cuenta.photo || ''} size="md" />
            <span className="cg-quien">
              <span className="cg-nombre">{nombreDe(x.cuenta)}</span>
              <span className="cg-meta">Ficha: {nombreDe(x.ficha)} · {x.motivo === 'correo' ? 'mismo correo' : 'mismo nombre y apellido'}</span>
            </span>
            <span className="cg-row cg-sug-acciones">
              <button type="button" className="btn small primary" disabled={Boolean(ocupado)} onClick={() => enlazar(x)}>{ocupado === id ? 'Enlazando…' : 'Enlazar'}</button>
              <button type="button" className="btn small ghost" disabled={Boolean(ocupado)} onClick={() => descartar(id)}>Es otra persona</button>
            </span>
          </div>
        );
      })}
      {aviso && <div className={`cg-aviso${aviso.startsWith('Listo') ? ' info' : ''}`} aria-live="polite">{aviso}</div>}
    </section>
  );
}
