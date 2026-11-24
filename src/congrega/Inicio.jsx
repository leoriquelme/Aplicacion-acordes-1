import { Link, useNavigate } from 'react-router-dom';
import { todayISO } from '../lib/dates.js';
import { RANGOS, TIPOS, activo, esMiembro, nombreDe, useCongrega } from './datos.jsx';

const corto = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');

/** Próximas fechas (cumpleaños o aniversarios) dentro de `dias`, a partir de "AAAA-MM-DD" o "MM-DD". */
export function proximas(lista, dias, hoy = new Date()) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return lista.map((x) => {
    const m = /(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(x.fecha || '');
    if (!m) return null;
    let next = new Date(base.getFullYear(), Number(m[2]) - 1, Number(m[3]));
    if (next < base) next = new Date(base.getFullYear() + 1, Number(m[2]) - 1, Number(m[3]));
    const diff = Math.round((next - base) / 86400000);
    return diff <= dias ? { ...x, next, diff, anos: m[1] ? next.getFullYear() - Number(m[1]) : null } : null;
  }).filter(Boolean).sort((a, b) => a.diff - b.diff);
}
const cuando = (d) => (d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`);

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
  const { people, events = [], asistencia, fichas, familias, verPrivado: isAdmin, verAsistencia: marca } = useCongrega();
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
  const cumple = proximas(activos.map((p) => ({ p, fecha: fichas.get(p.key)?.fechaNacimiento || p.birthday })), 30);
  const anivRaw = isAdmin ? proximas(activos.map((p) => ({ p, fecha: fichas.get(p.key)?.aniversario })), 60) : [];
  const parejas = new Map();
  anivRaw.forEach((a) => { const k = `${a.p.familiaId || a.p.key}|${a.next.getTime()}`; if (!parejas.has(k)) parejas.set(k, { ...a, nombres: [] }); parejas.get(k).nombres.push(a.p.nombre || a.p.name); });

  const ministerios = new Map(); activos.forEach((p) => (p.teams || []).forEach((m) => ministerios.set(m, (ministerios.get(m) || 0) + 1)));
  const rangos = RANGOS.map((r) => ({ label: r, v: activos.filter((p) => p.rangoEdad === r).length })).filter((x) => x.v);
  const comunas = new Map(); if (isAdmin) activos.forEach((p) => { const c = fichas.get(p.key)?.comuna; if (c) comunas.set(c, (comunas.get(c) || 0) + 1); });

  let seguimiento = [];
  const ult3 = evs.slice(0, 3);
  if (marca && ult3.length === 3) {
    const vinieron = new Set(); asistencia.forEach((a) => { if (ult3.some((e) => e.id === a.eventId)) vinieron.add(a.personKey); });
    seguimiento = activos.filter((p) => (esMiembro(p) || p.tipo === 'Activo' || p.tipo === 'Regular') && !vinieron.has(p.key));
  }
  let constancia = null;
  if (marca && recientes.length) {
    const veces = new Map(); asistencia.forEach((a) => { if (recientes.some((e) => e.id === a.eventId)) veces.set(a.personKey, (veces.get(a.personKey) || 0) + 1); });
    constancia = Array.from({ length: recientes.length + 1 }, (_, i) => ({ label: i === 0 ? 'Ninguna' : `${i} ${i === 1 ? 'vez' : 'veces'}`, v: activos.filter((p) => (veces.get(p.key) || 0) === i).length }));
  }
  const ir = (k) => navigate(`/congrega/personas/${k}`);
  const delta = ult && ant ? nUlt - conteo.get(ant.id) : null;

  return (
    <div className="cg-stack">
      <div className="page-head"><div><h1>Congrega</h1><p className="muted">Personas y asistencia de la iglesia</p></div></div>
      <div className="datos-grid">
        <div className="card dato"><strong>{ult ? nUlt : '—'}</strong><span>{ult ? `Asistencia ${corto(ult.date)}` : marca ? 'Sin asistencia registrada' : 'Asistencia (solo quienes la marcan)'}</span>
          {delta != null && <span className={`cg-delta ${delta >= 0 ? 'sube' : 'baja'}`}>{delta > 0 ? `▲ ${delta} más` : delta < 0 ? `▼ ${-delta} menos` : 'Igual'} que la vez anterior</span>}</div>
        <div className="card dato"><strong>{prom}</strong><span>Promedio últimos {recientes.length} eventos</span></div>
        <Link className="card dato" to="/congrega/personas"><strong>{activos.length}</strong><span>Personas activas · {activos.filter(esMiembro).length} miembros ›</span></Link>
        <div className="card dato"><strong>{visitasMes}</strong><span>Visitas nuevas este mes</span></div>
      </div>
      <div className="cg-dash">
        <section className="card cg-panel"><h3>Cumpleaños próximos</h3><p className="muted">Próximos 30 días</p>
          {cumple.length ? cumple.slice(0, 8).map((c) => <Recordatorio key={c.p.key} r={c} titulo={nombreDe(c.p)} sub={`${cuando(c.diff)}${c.anos ? ` · cumple ${c.anos}` : ''}`} onClick={() => ir(c.p.key)} />) : <div className="muted cg-vacio">Nadie está de cumpleaños en los próximos 30 días.</div>}
        </section>
        {isAdmin && (
          <section className="card cg-panel"><h3>Aniversarios de matrimonio</h3><p className="muted">Próximos 60 días</p>
            {parejas.size ? [...parejas.values()].slice(0, 8).map((a) => {
              const fam = a.p.familiaId && familias.get(a.p.familiaId);
              return <Recordatorio key={`${a.p.key}${a.diff}`} r={a} titulo={`${a.nombres.join(' y ')}${fam ? ` · ${fam.name}` : ''}`} sub={`${cuando(a.diff)}${a.anos ? ` · ${a.anos} ${a.anos === 1 ? 'año' : 'años'} de casados` : ''}`} onClick={() => ir(a.p.key)} />;
            }) : <div className="muted cg-vacio">No hay aniversarios en los próximos 60 días.</div>}
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
        {marca && (
          <section className="card cg-panel ancho"><h3>Asistencia por evento</h3><p className="muted">Últimos {Math.min(12, evs.length)} eventos con registro</p>
            {evs.length ? <Linea puntos={evs.slice(0, 12).reverse().map((e) => ({ id: e.id, v: conteo.get(e.id), label: `${e.name || 'Evento'} ${e.date}`, corto: corto(e.date) }))} /> : <div className="muted cg-vacio">Aún no hay asistencia registrada.</div>}
          </section>
        )}
        {constancia && <section className="card cg-panel"><h3>Constancia</h3><p className="muted">Personas activas según cuántas veces vinieron en los últimos {recientes.length} eventos</p><Barras items={constancia} /></section>}
        <section className="card cg-panel"><h3>Edades</h3><p className="muted">Personas activas por rango de edad</p><Barras items={rangos} /></section>
        <section className="card cg-panel"><h3>Ministerios y equipos</h3><p className="muted">Personas que sirven en cada uno</p>
          <Barras items={[...ministerios].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v).slice(0, 10)} vacio="Nadie tiene ministerios asignados." /></section>
        <section className="card cg-panel"><h3>Asistencia habitual</h3><p className="muted">Cómo está clasificada cada persona activa</p>
          <Barras items={TIPOS.map((t) => ({ label: t, v: activos.filter((p) => p.tipo === t).length })).concat([{ label: 'Sin clasificar', v: activos.filter((p) => !p.tipo).length }]).filter((x) => x.v)} /></section>
        {isAdmin && <section className="card cg-panel"><h3>Dónde viven</h3><p className="muted">Personas activas por comuna</p>
          <Barras items={[...comunas].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v).slice(0, 8)} vacio="Falta la comuna en las fichas." /></section>}
        {isAdmin && <section className="card cg-panel"><h3>Consentimiento de datos</h3><p className="muted">Ley 21.719: personas activas con autorización registrada</p>
          <Barras items={[{ label: 'Con consentimiento', v: activos.filter((p) => fichas.get(p.key)?.consentimiento).length }, { label: 'Falta registrar', v: activos.filter((p) => !fichas.get(p.key)?.consentimiento).length }]} /></section>}
        {marca && ult3.length === 3 && (
          <section className="card cg-panel"><h3>Para hacer seguimiento</h3><p className="muted">Faltaron a los últimos 3 eventos con registro</p>
            {seguimiento.length ? seguimiento.slice(0, 8).map((p) => <button type="button" key={p.key} className="cg-rec" onClick={() => ir(p.key)}><span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}</span><span className="cg-meta">{p.tipo || (esMiembro(p) ? 'Miembro' : '')}</span></span></button>) : <div className="muted cg-vacio">Nadie lleva 3 eventos sin venir.</div>}
          </section>
        )}
      </div>
    </div>
  );
}
