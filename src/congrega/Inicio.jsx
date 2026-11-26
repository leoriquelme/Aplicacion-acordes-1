import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatares.jsx';
import { todayISO } from '../lib/dates.js';
import { RANGOS, TIPOS, activo, esMiembro, nombreDe, useCongrega } from './datos.jsx';
import { sugerencias } from './sugerencias.js';

const corto = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');

/** Próximas fechas (cumpleaños o aniversarios) dentro de `dias`, a partir de "AAAA-MM-DD" o "MM-DD". */
/** Fechas (cumpleaños, aniversarios) desde `atras` días antes de hoy hasta `dias` días después. */
export function proximas(lista, dias, hoy = new Date(), atras = 0) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return lista.map((x) => {
    const m = /(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(x.fecha || '');
    if (!m) return null;
    const y = base.getFullYear();
    const next = [y - 1, y, y + 1].map((a) => new Date(a, Number(m[2]) - 1, Number(m[3])))
      .find((d) => { const n = Math.round((d - base) / 86400000); return n >= -atras && n <= dias; });
    if (!next) return null;
    const diff = Math.round((next - base) / 86400000);
    return { ...x, next, diff, anos: m[1] ? next.getFullYear() - Number(m[1]) : null };
  }).filter(Boolean).sort((a, b) => a.diff - b.diff);
}
const cuando = (d) => (d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : d === -1 ? 'Ayer' : d < 0 ? `Hace ${-d} días` : `En ${d} días`);
// Ventanas del Inicio: cumpleaños desde ayer hasta 7 días más; aniversarios desde ayer hasta 15 días más.
export const VENTANA_CUMPLE = 7;
export const VENTANA_ANIVERSARIO = 15;

// Filtro del gráfico de asistencia. Niños: rango Bebé o Niño (o marcado como niño si no tiene rango).
export const EDADES_NINOS = ['Bebé', 'Niño'];
export const esNino = (p) => EDADES_NINOS.includes(p?.rangoEdad) || (!p?.rangoEdad && p?.esNino === true);
export const FILTROS_EDAD = [['todos', 'Todos'], ['adultos', 'Adultos'], ['ninos', 'Niños']];
export const pasaFiltro = (p, f) => f === 'todos' || (f === 'ninos' ? esNino(p) : !esNino(p));

/** Botón circular para ver (y editar) a las personas detrás de un gráfico. */
function VerQuienes({ titulo, grupos, onAbrir }) {
  const n = new Set(grupos.flatMap((g) => g.ps.map((p) => p.key))).size;
  return (
    <button type="button" className="cg-ver-quienes" onClick={() => onAbrir({ titulo, grupos })} aria-label={`Ver a las ${n} personas de ${titulo}`} title="Ver y editar a estas personas">
      <span aria-hidden="true">👥</span>
    </button>
  );
}

function ListaQuienes({ abierto, onCerrar }) {
  if (!abierto) return null;
  const grupos = abierto.grupos.filter((g) => g.ps.length);
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={abierto.titulo} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal cg-stack cg-quienes">
        <div className="cg-row cg-entre"><h2>{abierto.titulo}</h2><button type="button" className="btn small ghost" onClick={onCerrar} aria-label="Cerrar">✕</button></div>
        {!grupos.length && <div className="muted cg-vacio">No hay personas aquí.</div>}
        {grupos.map((g) => (
          <details key={g.label} open={grupos.length === 1}>
            <summary><strong>{g.label}</strong> <span className="muted">· {g.ps.length}</span></summary>
            <div className="cg-lista">
              {[...g.ps].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b))).map((p) => (
                <div key={p.key} className="cg-item">
                  <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
                  <Link className="cg-quien" to={`/congrega/personas/${p.key}`}><span className="cg-nombre">{nombreDe(p)}</span><span className="cg-meta">{[p.tipo, p.rangoEdad].filter(Boolean).join(' · ')}</span></Link>
                  <Link className="btn small" to={`/congrega/personas/${p.key}?editar=1`}>Editar</Link>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

const DESCARTADAS = 'congrega.sugerenciasDescartadas';
const leerDescartadas = () => { try { return new Set(JSON.parse(localStorage.getItem(DESCARTADAS) || '[]')); } catch { return new Set(); } };

/** Cuadro de sugerencias: clasificaciones que probablemente quedaron mal. Se aplican o se descartan. */
function Sugerencias({ lista, porKey, aplicar }) {
  const [fuera, setFuera] = useState(leerDescartadas);
  const [error, setError] = useState('');
  const [todas, setTodas] = useState(false);
  const visibles = lista.filter((x) => !fuera.has(x.id) && porKey.get(x.key));
  if (!visibles.length) return null;
  const descartar = (id) => { const n = new Set(fuera); n.add(id); setFuera(n); try { localStorage.setItem(DESCARTADAS, JSON.stringify([...n].slice(-500))); } catch { /* sin almacenamiento */ } };
  return (
    <section className="card cg-panel ancho cg-sugerencias">
      <div className="cg-panel-head"><h3>💡 Sugerencias</h3><span className="muted small">{visibles.length}</span></div>
      <p className="muted">Datos que parecen mal clasificados. Revísalos y aplica el cambio o descártalo.</p>
      {(todas ? visibles : visibles.slice(0, 6)).map((x) => {
        const p = porKey.get(x.key);
        return (
          <div key={x.id} className="cg-item cg-sugerencia">
            <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
            <Link className="cg-quien" to={`/congrega/personas/${p.key}`}><span className="cg-nombre">{nombreDe(p)}</span><span className="cg-meta">{x.texto}</span></Link>
            <span className="cg-row cg-sug-acciones">
              <button type="button" className="btn small primary" onClick={() => aplicar(p, x.cambio).then(() => setError('')).catch((e) => setError(`No se pudo: ${e.message}`))}>{x.accion}</button>
              <button type="button" className="btn small ghost" onClick={() => descartar(x.id)}>Descartar</button>
            </span>
          </div>
        );
      })}
      {visibles.length > 6 && <button type="button" className="btn small ghost cg-izq" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver las ${visibles.length}`}</button>}
      {error && <div className="cg-aviso" role="alert">{error}</div>}
    </section>
  );
}

const CERRAR_DATOS_MIEMBROS = 'congrega.datosMiembros.cerrado';
const camposPendientes = (p, ficha = {}) => [
  ...(!p.rangoEdad ? ['Rango de edad'] : []),
  ...(!ficha.telefono?.trim() ? ['Celular'] : []),
  ...(!ficha.email?.trim() ? ['Correo'] : []),
  ...(!ficha.comuna?.trim() ? ['Comuna'] : []),
  ...(!ficha.region?.trim() ? ['Región'] : []),
  ...(!ficha.fechaLlegada ? ['Fecha de llegada'] : []),
].slice(0, 6);

/** Sugerencia privada para que Administración complete una ficha y pueda saltar a otra. */
function SugerirDatosMiembros({ people, fichas, churchId, myUid }) {
  const claveCierre = `${CERRAR_DATOS_MIEMBROS}:${churchId || 'iglesia'}:${myUid || 'admin'}`;
  const [cerrado, setCerrado] = useState(() => { try { return localStorage.getItem(claveCierre) === '1'; } catch { return false; } });
  const [saltados, setSaltados] = useState(() => new Set());
  const pendientes = people.filter((p) => activo(p) && esMiembro(p)).map((p) => ({ p, campos: camposPendientes(p, fichas.get(p.key) || {}) })).filter((x) => x.campos.length);
  const visibles = pendientes.filter((x) => !saltados.has(x.p.key));
  const actual = visibles[0];
  if (cerrado || !actual) return null;
  const cerrar = () => { try { localStorage.setItem(claveCierre, '1'); } catch { /* sin almacenamiento */ } setCerrado(true); };
  return (
    <section className="card cg-panel">
      <div className="cg-panel-head"><h3>Completar datos de miembros</h3><button type="button" className="btn small ghost" onClick={cerrar}>Cerrar</button></div>
      <p className="muted">Hay datos sin completar en esta ficha. Agrega solo lo que conozcas.</p>
      <div className="cg-rec">
        <span className="cg-quien"><span className="cg-nombre">{nombreDe(actual.p)}</span><span className="cg-meta">Falta: {actual.campos.join(' · ')}</span></span>
      </div>
      <div className="cg-row">
        <Link className="btn small primary" to={`/congrega/personas/${actual.p.key}?editar=1`}>Agregar datos</Link>
        <button type="button" className="btn small ghost" onClick={() => setSaltados((s) => new Set([...s, actual.p.key]))}>Saltar</button>
        <span className="muted small">{saltados.size + 1} de {pendientes.length}</span>
      </div>
    </section>
  );
}

function Panel({ titulo, sub, grupos, ver, onAbrir, ancho, children, extra }) {
  return (
    <section className={`card cg-panel${ancho ? ' ancho' : ''}`}>
      <div className="cg-panel-head"><h3>{titulo}</h3>{ver && grupos && <VerQuienes titulo={titulo} grupos={grupos} onAbrir={onAbrir} />}{extra}</div>
      {sub && <p className="muted">{sub}</p>}
      {children}
    </section>
  );
}

function Barras({ items, vacio = 'Sin datos todavía.' }) {
  if (!items.length) return <div className="muted cg-vacio">{vacio}</div>;
  const max = Math.max(1, ...items.map((i) => i.v));
  return (
    <div className="cg-barras">
      {items.map((it) => (
        <div key={it.label} className="cg-barra" title={`${it.label}: ${it.v}`}>
          <span>{it.label}</span>
          <div className="cg-track"><div style={{ width: `${Math.max(2, Math.round((it.v / max) * 100))}%` }} /></div>
          <b>{it.v}</b>
        </div>
      ))}
    </div>
  );
}

function Linea({ puntos }) {
  const W = 640; const H = 260; const L = 44; const R = 20; const T = 30; const B = 40;
  const max = Math.max(5, ...puntos.map((p) => p.v));
  const tope = Math.ceil(max / 10) * 10;
  const x = (i) => L + (puntos.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (puntos.length - 1));
  const y = (v) => T + (H - T - B) * (1 - v / tope);
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const paso = Math.ceil(puntos.length / 4);
  return (
    <svg className="cg-linea" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Asistencia por evento">
      {[0, tope / 2, tope].map((g) => <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} /><text x={L - 6} y={y(g) + 7} textAnchor="end">{g}</text></g>)}
      {puntos.length > 1 && <path className="area" d={`${d} L${x(puntos.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} />}
      <path className="trazo" d={d} />
      {puntos.map((p, i) => (
        <g key={p.id}>
          <circle className="punto" cx={x(i)} cy={y(p.v)} r={i === puntos.length - 1 ? 8 : 5.5}><title>{`${p.label}: ${p.v}`}</title></circle>
          {(puntos.length - 1 - i) % paso === 0 && <text x={x(i)} y={H - 8} textAnchor={i === puntos.length - 1 ? 'end' : 'middle'}>{p.corto}</text>}
        </g>
      ))}
      {puntos.length > 0 && <text className="valor" x={x(puntos.length - 1)} y={y(puntos[puntos.length - 1].v) - 16} textAnchor="end">{puntos[puntos.length - 1].v}</text>}
    </svg>
  );
}

function Recordatorio({ r, titulo, sub, onClick }) {
  return (
    <button type="button" className="cg-rec" onClick={onClick}>
      <span className={`cg-dia${r.diff === 0 ? ' hoy' : ''}`}><b>{r.next.getDate()}</b><small>{r.next.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')}</small></span>
      <span className="cg-quien"><span className="cg-nombre">{titulo}</span><span className="cg-meta">{sub}</span></span>
    </button>
  );
}

export default function Inicio() {
  const { people, events = [], asistencia, fichas, familias, churchId, myUid, verPrivado: isAdmin, verAsistencia: marca, pastor, asisAdmin, aplicarCambio } = useCongrega();
  const [quienes, setQuienes] = useState(null);
  const [filtroEdad, setFiltroEdad] = useState('todos');
  // El círculo para ver y editar a las personas de cada gráfico: Administrativo de asistencia, Pastor y Administrador.
  const ver = pastor || asisAdmin;
  const porKey = new Map(people.map((p) => [p.key, p]));
  const navigate = useNavigate();
  const hoy = todayISO();
  const activos = people.filter(activo);
  const conteo = new Map(); asistencia.forEach((a) => conteo.set(a.eventId, (conteo.get(a.eventId) || 0) + 1));
  const evs = events.filter((e) => e.date && e.date <= hoy && conteo.has(e.id)).sort((a, b) => b.date.localeCompare(a.date));
  const ult = evs[0]; const ant = evs[1];
  const nUlt = ult ? conteo.get(ult.id) : 0;
  const recientes = evs.slice(0, 4);
  const prom = recientes.length ? Math.round(recientes.reduce((t, e) => t + conteo.get(e.id), 0) / recientes.length) : 0;
  const mes = hoy.slice(0, 7);
  const visitasMes = people.filter((p) => p.tipo === 'Visita' && (p.primeraVisita || '').slice(0, 7) === mes).length;
  const proxEventos = events.filter((e) => e.date && e.date >= hoy).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  // Cumpleaños: la fecha completa (ficha privada) o el "MM-DD" visible que cada uno pone en Adora.
  const cumple = proximas(activos.map((p) => ({ p, fecha: fichas.get(p.key)?.fechaNacimiento || p.birthday })), VENTANA_CUMPLE, new Date(), 1);
  const anivRaw = isAdmin ? proximas(activos.map((p) => ({ p, fecha: fichas.get(p.key)?.aniversario })), VENTANA_ANIVERSARIO, new Date(), 1) : [];
  const parejas = new Map();
  anivRaw.forEach((a) => { const k = `${a.p.familiaId || a.p.key}|${a.next.getTime()}`; if (!parejas.has(k)) parejas.set(k, { ...a, nombres: [] }); parejas.get(k).nombres.push(a.p.nombre || a.p.name); });

  // Cada barra guarda a sus personas (ps), para el círculo "ver a estas personas".
  const barra = (label, ps) => ({ label, v: ps.length, ps });
  const ministerios = new Map(); activos.forEach((p) => (p.teams || []).forEach((m) => { if (!ministerios.has(m)) ministerios.set(m, []); ministerios.get(m).push(p); }));
  const rangos = RANGOS.map((r) => barra(r, activos.filter((p) => p.rangoEdad === r))).filter((x) => x.v);
  const comunas = new Map(); if (isAdmin) activos.forEach((p) => { const c = fichas.get(p.key)?.comuna; if (c) { if (!comunas.has(c)) comunas.set(c, []); comunas.get(c).push(p); } });
  const tipos = TIPOS.map((t) => barra(t, activos.filter((p) => p.tipo === t))).concat([barra('Sin clasificar', activos.filter((p) => !p.tipo))]).filter((x) => x.v);
  const listaMinisterios = [...ministerios].map(([l, ps]) => barra(l, ps)).sort((a, b) => b.v - a.v).slice(0, 10);
  const listaComunas = [...comunas].map(([l, ps]) => barra(l, ps)).sort((a, b) => b.v - a.v).slice(0, 8);
  // Quiénes vinieron a cada evento (con el filtro Todos / Adultos / Niños).
  const vinieronA = (id, f = 'todos') => [...asistencia.values()].filter((a) => a.eventId === id).map((a) => porKey.get(a.personKey)).filter((p) => p && pasaFiltro(p, f));
  const grafico = evs.slice(0, 12).reverse().map((e) => ({ e, ps: vinieronA(e.id, filtroEdad) }));

  const [anio, mesNum, diaNum] = hoy.split('-').map(Number);
  const limiteSeguimiento = new Date(anio, mesNum - 1, diaNum - 21);
  const padFecha = (n) => String(n).padStart(2, '0');
  const desdeSeguimiento = `${limiteSeguimiento.getFullYear()}-${padFecha(limiteSeguimiento.getMonth() + 1)}-${padFecha(limiteSeguimiento.getDate())}`;
  const asistioReciente = new Set();
  asistencia.forEach((a) => { if (a.date && a.date >= desdeSeguimiento && a.date <= hoy) asistioReciente.add(a.personKey); });
  const seguimiento = activos.filter((p) => (esMiembro(p) || p.tipo === 'Activo' || p.tipo === 'Regular') && !asistioReciente.has(p.key));
  let constancia = null;
  if (marca && recientes.length) {
    const veces = new Map(); asistencia.forEach((a) => { if (recientes.some((e) => e.id === a.eventId)) veces.set(a.personKey, (veces.get(a.personKey) || 0) + 1); });
    constancia = Array.from({ length: recientes.length + 1 }, (_, i) => barra(i === 0 ? 'Ninguna' : `${i} ${i === 1 ? 'vez' : 'veces'}`, activos.filter((p) => (veces.get(p.key) || 0) === i)));
  }
  const ir = (k) => navigate(`/congrega/personas/${k}`);
  const delta = ult && ant ? nUlt - conteo.get(ant.id) : null;

  return (
    <div className="cg-stack">
      <div className="page-head"><div><h1>Congrega</h1><p className="muted">Personas y asistencia de la iglesia</p></div></div>
      <div className="datos-grid">
        <div className="card dato cg-dato-ver">{ver && ult && <VerQuienes titulo={`Asistencia ${corto(ult.date)}`} grupos={[{ label: ult.name || 'Evento', ps: vinieronA(ult.id) }]} onAbrir={setQuienes} />}<strong>{ult ? nUlt : '—'}</strong><span>{ult ? `Asistencia ${corto(ult.date)}` : marca ? 'Sin asistencia registrada' : 'Asistencia (solo quienes la marcan)'}</span>
          {delta != null && <span className={`cg-delta ${delta >= 0 ? 'sube' : 'baja'}`}>{delta > 0 ? `▲ ${delta} más` : delta < 0 ? `▼ ${-delta} menos` : 'Igual'} que la vez anterior</span>}</div>
        <div className="card dato"><strong>{prom}</strong><span>Promedio últimos {recientes.length} eventos</span></div>
        <Link className="card dato" to="/congrega/personas"><strong>{isAdmin ? activos.length : people.length}</strong><span>{isAdmin ? `Personas activas · ${activos.filter(esMiembro).length} miembros ›` : 'Personas registradas ›'}</span></Link>
        <div className="card dato cg-dato-ver">{ver && visitasMes > 0 && <VerQuienes titulo="Visitas nuevas este mes" grupos={[{ label: 'Visitas', ps: people.filter((p) => p.tipo === 'Visita' && (p.primeraVisita || '').slice(0, 7) === mes) }]} onAbrir={setQuienes} />}<strong>{visitasMes}</strong><span>Visitas nuevas este mes</span></div>
      </div>
      <div className="cg-dash">
        {isAdmin && <SugerirDatosMiembros people={people} fichas={fichas} churchId={churchId} myUid={myUid} />}
        {ver && <Sugerencias lista={sugerencias({ people, fichas, asistencia, events, hoy })} porKey={porKey} aplicar={aplicarCambio} />}
        <section className="card cg-panel"><h3>Cumpleaños próximos</h3><p className="muted">Desde ayer hasta los próximos {VENTANA_CUMPLE} días</p>
          {cumple.length ? cumple.slice(0, 8).map((c) => <Recordatorio key={c.p.key} r={c} titulo={nombreDe(c.p)} sub={`${cuando(c.diff)}${c.anos ? ` · ${c.diff < 0 ? 'cumplió' : 'cumple'} ${c.anos}` : ''}`} onClick={() => ir(c.p.key)} />) : <div className="muted cg-vacio">Nadie está de cumpleaños esta semana.</div>}
        </section>
        {isAdmin && (
          <section className="card cg-panel"><h3>Aniversarios de matrimonio</h3><p className="muted">Desde ayer hasta los próximos {VENTANA_ANIVERSARIO} días</p>
            {parejas.size ? [...parejas.values()].slice(0, 8).map((a) => {
              const fam = a.p.familiaId && familias.get(a.p.familiaId);
              return <Recordatorio key={`${a.p.key}${a.diff}`} r={a} titulo={`${a.nombres.join(' y ')}${fam ? ` · ${fam.name}` : ''}`} sub={`${cuando(a.diff)}${a.anos ? ` · ${a.anos} ${a.anos === 1 ? 'año' : 'años'} de casados` : ''}`} onClick={() => ir(a.p.key)} />;
            }) : <div className="muted cg-vacio">No hay aniversarios en los próximos 15 días.</div>}
          </section>
        )}
        <section className="card cg-panel"><h3>Próximos eventos</h3><p className="muted">Los mismos eventos de Adora</p>
          {proxEventos.length ? proxEventos.map((e) => (
            <button type="button" key={e.id} className="cg-rec" onClick={() => navigate(`/eventos/${e.id}`)}>
              <span className="cg-dia"><b>{Number(e.date.slice(8))}</b><small>{corto(e.date).split(' ')[1]}</small></span>
              <span className="cg-quien"><span className="cg-nombre">{e.name || 'Evento'}</span><span className="cg-meta">{e.time || ''}</span></span>
            </button>
          )) : <div className="muted cg-vacio">No hay eventos próximos.</div>}
        </section>
        {/* Reportes: solo Pastor y Administrador */}
        {pastor && (
          <>
            {marca && (
              <Panel ancho titulo="Asistencia por evento" sub={`Últimos ${Math.min(12, evs.length)} eventos con registro${filtroEdad === 'ninos' ? ' · niños: rango Bebé o Niño' : ''}`}
                ver={ver} onAbrir={setQuienes} grupos={grafico.map(({ e, ps }) => ({ label: `${e.name || 'Evento'} · ${corto(e.date)}`, ps })).reverse()}
                extra={(
                  <div className="cg-seg cg-filtro-edad" role="group" aria-label="Filtrar por edad">
                    {FILTROS_EDAD.map(([k, l]) => <button key={k} type="button" aria-pressed={filtroEdad === k} onClick={() => setFiltroEdad(k)}>{l}</button>)}
                  </div>
                )}>
                {evs.length ? <Linea puntos={grafico.map(({ e, ps }) => ({ id: e.id, v: ps.length, label: `${e.name || 'Evento'} ${e.date}`, corto: corto(e.date) }))} /> : <div className="muted cg-vacio">Aún no hay asistencia registrada.</div>}
              </Panel>
            )}
            {constancia && <Panel titulo="Constancia" sub={`Personas activas según cuántas veces vinieron en los últimos ${recientes.length} eventos`} ver={ver} onAbrir={setQuienes} grupos={constancia}><Barras items={constancia} /></Panel>}
            <Panel titulo="Edades" sub="Personas activas por rango de edad" ver={ver} onAbrir={setQuienes} grupos={rangos}><Barras items={rangos} /></Panel>
            <Panel titulo="Ministerios y equipos" sub="Personas que sirven en cada uno" ver={ver} onAbrir={setQuienes} grupos={listaMinisterios}>
              <Barras items={listaMinisterios} vacio="Nadie tiene ministerios asignados." /></Panel>
            <Panel titulo="Asistencia habitual" sub="Cómo está clasificada cada persona activa" ver={ver} onAbrir={setQuienes} grupos={tipos}><Barras items={tipos} /></Panel>
            {isAdmin && <Panel titulo="Dónde viven" sub="Personas activas por comuna" ver={ver} onAbrir={setQuienes} grupos={listaComunas}>
              <Barras items={listaComunas} vacio="Falta la comuna en las fichas." /></Panel>}
            {marca && (
              <Panel titulo="Para hacer seguimiento" sub="Personas sin asistencia en las últimas 3 semanas" ver={ver} onAbrir={setQuienes} grupos={[{ label: 'Sin asistencia en 3 semanas', ps: seguimiento }]}>
                {seguimiento.length ? seguimiento.slice(0, 8).map((p) => <button type="button" key={p.key} className="cg-rec" onClick={() => ir(p.key)}><span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}</span><span className="cg-meta">{p.tipo || (esMiembro(p) ? 'Miembro' : '')}</span></span></button>) : <div className="muted cg-vacio">Todos registran asistencia en las últimas 3 semanas.</div>}
              </Panel>
            )}
          </>
        )}
      </div>
      <ListaQuienes abierto={quienes} onCerrar={() => setQuienes(null)} />
    </div>
  );
}
