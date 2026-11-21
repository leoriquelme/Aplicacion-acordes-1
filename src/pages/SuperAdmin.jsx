import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  actividadGeneral, actividadIglesia, cambiarEstadoIglesia, eliminarIglesia, reiniciarOraciones, resolverSugerencia, soySuperAdmin, todasLasIglesias, todasLasSugerencias, useAuth,
} from '../lib/cloud.jsx';
import ConfirmX from '../components/ConfirmX.jsx';
import Icon from '../components/Icon.jsx';

// Página solo para el encargado del Cancionero (Super Admin): ve todas las iglesias,
// cuánto movimiento tienen, y puede bloquear o eliminar las que estén de prueba o abandonadas.

// Límites del plan gratis de Firebase (Firestore, plan Spark).
const LIMITE_MB = 1024; // 1 GiB guardado
const LECTURAS_DIA = 50000;
const ESCRITURAS_DIA = 20000;
// Tamaño aproximado de cada cosa guardada (incluye los índices que Firebase crea solo), en KB.
const KB = { canciones: 6, eventos: 2.5, miembros: 0.8, inscripciones: 0.8, iglesia: 1.5 };
const DIAS_SIN_MOVIMIENTO = 30;

const fecha = (ms) => (ms ? new Date(ms).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const n = (x) => (x == null ? '—' : x.toLocaleString('es-CL'));
const pl = (x, uno, varios) => `${n(x)} ${x === 1 ? uno : varios}`;

function estadoDe(ig, a) {
  if (ig.status === 'bloqueada') return { txt: 'Bloqueada', cls: 'mal' };
  if (!a) return null;
  if ((a.canciones || 0) === 0 && (a.eventos || 0) === 0 && (a.miembros || 0) <= 1) return { txt: 'Vacía', cls: 'alerta' };
  if (!a.ultimaVez || Date.now() - a.ultimaVez > DIAS_SIN_MOVIMIENTO * 864e5) return { txt: `Sin movimiento hace +${DIAS_SIN_MOVIMIENTO} días`, cls: 'alerta' };
  return { txt: 'Con movimiento', cls: 'bien' };
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const email = user.email || '';
  const [esSuper, setEsSuper] = useState(undefined);

  useEffect(() => { soySuperAdmin().then(setEsSuper); }, [user.uid]);

  if (esSuper === undefined) return <div className="loading">Revisando permisos…</div>;
  if (!esSuper) {
    return (
      <div className="welcome">
        <div className="welcome-card card wide">
          <h1>Super Admin</h1>
          <p>La cuenta <strong>{email}</strong> no es Super Admin.</p>
          <p className="muted small">Si eres el encargado del Cancionero, copia este código y créalo en Firebase (Firestore → colección <code>superadmins</code> → documento con este código como ID):</p>
          <div className="uid-box">{user.uid}</div>
          <div className="row gap wrap" style={{ marginTop: '0.6rem' }}>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(user.uid)}>Copiar código</button>
            <button className="btn" onClick={() => soySuperAdmin().then(setEsSuper)}>Ya lo creé, revisar otra vez</button>
            <Link className="btn ghost" to="/">Volver</Link>
          </div>
        </div>
      </div>
    );
  }
  return <Panel email={email} />;
}

function Panel({ email }) {
  const [iglesias, setIglesias] = useState(null);
  const [act, setAct] = useState({});
  const [general, setGeneral] = useState({});
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todas');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const lista = (await todasLasIglesias()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || a.name.localeCompare(b.name));
      setIglesias(lista);
      actividadGeneral().then(setGeneral);
      const pares = await Promise.all(lista.map(async (ig) => [ig.id, await actividadIglesia(ig.id)]));
      setAct(Object.fromEntries(pares));
    } catch (e) {
      setError(`No se pudieron cargar las iglesias: ${e.message}`);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  if (!iglesias) return <div className="loading">{error || 'Cargando iglesias…'}</div>;

  const suma = (k) => Object.values(act).reduce((t, a) => t + (a?.[k] || 0), 0);
  const tot = { iglesias: iglesias.length, miembros: suma('miembros'), canciones: suma('canciones'), eventos: suma('eventos'), inscripciones: suma('inscripciones') };
  const docs = tot.iglesias + tot.miembros + tot.canciones + tot.eventos + tot.inscripciones + (general.compartidas || 0);
  const mb = (tot.iglesias * KB.iglesia + tot.canciones * KB.canciones + (general.compartidas || 0) * KB.canciones
    + tot.eventos * KB.eventos + tot.miembros * KB.miembros + tot.inscripciones * KB.inscripciones) / 1024;
  const pct = Math.min(100, (mb / LIMITE_MB) * 100);
  // Lecturas: al abrir la app se leen canciones, eventos, miembros e inscripciones de la iglesia.
  // Suponiendo que cada miembro la abre 2 veces al día:
  const lecturas = Object.values(act).reduce((t, a) => t + (a ? (a.miembros || 0) * 2 * ((a.canciones || 0) + (a.eventos || 0) + (a.miembros || 0) + (a.inscripciones || 0)) : 0), 0);
  const pctLect = Math.min(100, (lecturas / LECTURAS_DIA) * 100);

  const visibles = iglesias.filter((ig) => {
    const e = estadoDe(ig, act[ig.id]);
    if (filtro === 'revisar') return e && e.cls !== 'bien';
    if (filtro === 'bloqueadas') return ig.status === 'bloqueada';
    return true;
  });

  return (
    <div className="super">
      <div className="super-head">
        <div>
          <h1 style={{ margin: 0 }}>Super Admin</h1>
          <p className="muted small" style={{ margin: 0 }}>{email}</p>
        </div>
        <div className="row gap wrap">
          <button className="btn" onClick={() => { setAct({}); cargar(); }}><Icon name="repeat" /> Actualizar</button>
          <Link className="btn ghost" to="/">Volver a la app</Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="super-tiles">
        <div className="super-tile"><span className="muted small">Iglesias</span><b>{n(tot.iglesias)}</b></div>
        <div className="super-tile"><span className="muted small">Miembros</span><b>{n(tot.miembros)}</b></div>
        <div className="super-tile"><span className="muted small">Canciones</span><b>{n(tot.canciones)}</b></div>
        <div className="super-tile"><span className="muted small">Eventos</span><b>{n(tot.eventos)}</b></div>
        <div className="super-tile"><span className="muted small">Compartidas</span><b>{n(general.compartidas)}</b></div>
        <div className="super-tile"><span className="muted small">Documentos</span><b>{n(docs)}</b></div>
      </div>

      <section className="card">
        <h2>Uso del plan gratis de Firebase</h2>
        <p style={{ margin: 0 }}>Espacio guardado: <strong>≈ {mb < 1 ? mb.toFixed(2) : mb.toFixed(1)} MB</strong> de 1 GB ({pct < 0.1 ? 'menos de 0,1' : pct.toFixed(1)}%)</p>
        <div className="uso-barra"><span style={{ width: `${Math.max(pct, 0.5)}%` }} /></div>
        <p style={{ margin: '0.6rem 0 0' }}>Lecturas por día (estimado, si cada miembro abre la app 2 veces): <strong>≈ {n(lecturas)}</strong> de {n(LECTURAS_DIA)} ({pctLect.toFixed(1)}%)</p>
        <div className="uso-barra"><span style={{ width: `${Math.max(pctLect, 0.5)}%`, background: pctLect > 70 ? 'var(--danger)' : undefined }} /></div>
        <p className="muted small">
          Son estimaciones. Las cifras exactas están en la consola de Firebase → Firestore Database → pestaña <strong>Uso</strong>.
          El límite gratis es 1 GB guardado, {n(LECTURAS_DIA)} lecturas y {n(ESCRITURAS_DIA)} escrituras por día (se reinician cada día).
          {(pct > 70 || pctLect > 70) ? ' ⚠️ Te estás acercando al límite: conviene revisar el plan de pago (Blaze, se paga solo lo que pasa del límite gratis).' : ' Por ahora estás muy lejos del límite.'}
        </p>
      </section>

      <SugerenciasRecibidas />

      <ReiniciarOraciones />

      <div className="row gap wrap" style={{ margin: '1rem 0 0.6rem', alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Iglesias</h2>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar iglesias">
          <option value="todas">Todas</option>
          <option value="revisar">Para revisar (vacías o sin movimiento)</option>
          <option value="bloqueadas">Bloqueadas</option>
        </select>
      </div>
      <div className="super-lista">
        {visibles.map((ig) => <IglesiaFila key={ig.id} ig={ig} a={act[ig.id]} onCambio={cargar} />)}
        {visibles.length === 0 && <p className="muted">No hay iglesias en esta lista.</p>}
      </div>
    </div>
  );
}

function IglesiaFila({ ig, a, onCambio }) {
  const [borrar, setBorrar] = useState(false);
  const [escrito, setEscrito] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const estado = estadoDe(ig, a);

  const hacer = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onCambio();
    } catch (e) {
      setError(`No se pudo: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card super-iglesia">
      <div>
        <strong>{ig.name}</strong>
        {estado && <span className={`etiqueta ${estado.cls}`}>{estado.txt}</span>}
        {ig.conCodigo && <span className="etiqueta">con código de acceso</span>}
        <div className="muted small">
          {ig.city ? `${ig.city} · ` : ''}Creada: {fecha(ig.createdAt)}{!ig.createdAt && ' (antigua)'}
          {ig.ownerEmail ? ` · ${ig.ownerName ? `${ig.ownerName} (${ig.ownerEmail})` : ig.ownerEmail}` : ''}
        </div>
      </div>
      <div className="nums small">
        {a ? (
          <>
            <span><Icon name="users" /> {pl(a.miembros, 'miembro', 'miembros')}</span>
            <span><Icon name="music" /> {pl(a.canciones, 'canción', 'canciones')}</span>
            <span><Icon name="calendar" /> {pl(a.eventos, 'evento', 'eventos')}</span>
            <span>Última actividad: {fecha(a.ultimaVez)}</span>
          </>
        ) : <span className="muted">Contando…</span>}
      </div>
      <div className="row gap wrap">
        {ig.status === 'bloqueada' ? (
          <button className="btn small" disabled={busy} onClick={() => hacer(() => cambiarEstadoIglesia(ig.id, 'activa'))}>Desbloquear</button>
        ) : (
          <ConfirmX label={`Bloquear ${ig.name}`} className="btn small" text="Bloquear" armedText="¿Bloquear? Nadie podrá entrar"
            disabled={busy} onConfirm={() => hacer(() => cambiarEstadoIglesia(ig.id, 'bloqueada'))} />
        )}
        {!borrar && <button className="btn small danger ghost" disabled={busy} onClick={() => setBorrar(true)}>Eliminar…</button>}
      </div>
      {borrar && (
        <div className="danger-zone">
          <p className="small" style={{ marginTop: 0 }}>
            Se borrará <strong>{ig.name}</strong> para siempre, con sus {n(a?.miembros)} miembros, {n(a?.canciones)} canciones y {n(a?.eventos)} eventos.
            No se puede deshacer. Para confirmar, escribe el nombre de la iglesia:
          </p>
          <input value={escrito} onChange={(e) => setEscrito(e.target.value)} placeholder={ig.name} aria-label="Nombre de la iglesia para confirmar" />
          <div className="row gap wrap" style={{ marginTop: '0.5rem' }}>
            <button className="btn small danger" disabled={busy || escrito.trim().toUpperCase() !== ig.name.toUpperCase()}
              onClick={() => hacer(() => eliminarIglesia(ig))} style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}>{busy ? 'Eliminando…' : 'Eliminar para siempre'}</button>
            <button className="btn small ghost" onClick={() => { setBorrar(false); setEscrito(''); }}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

/** Deja en 0 el contador de oraciones de toda la app. */
function ReiniciarOraciones() {
  const [msg, setMsg] = useState('');
  const reiniciar = async () => {
    setMsg('');
    try {
      await reiniciarOraciones();
      setMsg('✓ Contador en 0.');
    } catch (e) {
      setMsg(`No se pudo: ${e.message}. Revisa que pegaste las reglas nuevas.`);
    }
  };
  return (
    <section className="card">
      <h2>Contador de oraciones</h2>
      <div className="row gap wrap" style={{ alignItems: 'center' }}>
        <ConfirmX onConfirm={reiniciar} label="Reiniciar contador de oraciones" className="btn" text="Reiniciar a 0" armedText="¿Dejar en 0?" />
        {msg && <span className="small">{msg}</span>}
      </div>
    </section>
  );
}

/** Sugerencias de mejoras que envían las personas desde Ajustes (de todas las iglesias). */
function SugerenciasRecibidas() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const cargar = useCallback(() => {
    setError('');
    todasLasSugerencias().then(setLista).catch((e) => { setLista([]); setError(`No se pudieron cargar: ${e.message}. Revisa que pegaste las reglas nuevas.`); });
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const resolver = async (id) => {
    try {
      await resolverSugerencia(id);
      setLista((l) => l.filter((s) => s.id !== id));
    } catch (e) {
      setError(`No se pudo: ${e.message}`);
    }
  };
  return (
    <section className="card sugerencias">
      <h2>Sugerencias recibidas {lista?.length > 0 && <span className="badge">{lista.length}</span>}</h2>
      {error && <p className="error">{error}</p>}
      {lista === null ? <p className="muted small">Cargando…</p> : lista.length === 0 ? (
        <p className="muted small">No hay sugerencias pendientes.</p>
      ) : (
        <ul>
          {lista.map((s) => (
            <li key={s.id}>
              <div className="grow">
                <div className="small muted">
                  {s.name || 'Alguien'}{s.email ? ` (${s.email})` : ''} · {s.churchName || 'Sin iglesia'} · {fecha(s.at)}
                </div>
                <div className="sug-text">{s.text}</div>
              </div>
              <ConfirmX className="btn small" label="Marcar como resuelta" text="✓ Resuelta" armedText="¿Confirmar?" onConfirm={() => resolver(s.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
