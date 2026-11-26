import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fechaCorta, todayISO, formatLong, sortEvents } from '../lib/dates.js';
import { activo, nombreDe, norm, useCongrega } from './datos.jsx';
import { TIPOS_ASISTENCIA } from './unir.js';
import { coincide, marcadoDe } from './marcado.js';
import { Avatar } from '../components/Avatares.jsx';
import { AbrirEvento, EditarEvento } from './AbrirEvento.jsx';
import { etiquetaTipo, tipoEvento } from './eventos.js';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Evento elegido: el de hoy o el último con fecha. Se comparte con la Estación. */
export function useEvento() {
  const { events = [] } = useCongrega();
  const hoy = todayISO();
  const lista = useMemo(() => sortEvents(events.filter((e) => e.date && e.date <= hoy), -1).slice(0, 30), [events, hoy]);
  const [eventId, setEventId] = useState(null);
  const ev = events.find((e) => e.id === eventId) || events.find((e) => e.date === hoy) || lista[0] || null;
  const opciones = ev && !lista.some((e) => e.id === ev.id) ? [ev, ...lista] : lista;
  return { ev, opciones, setEventId, hoy };
}

/** Contador grande: presentes, colaboradores y visitas. */
export function Contador({ m }) {
  const n = m.presentes.size;
  return (
    <div className="cg-contador" aria-live="polite">{n}
      <small>{n === 1 ? 'presente' : 'presentes'}{m.cuenta.colaborador ? ` · ${plural(m.cuenta.colaborador, 'colaborador', 'colaboradores')}` : ''}{m.cuenta.visita ? ` · ${plural(m.cuenta.visita, 'visita', 'visitas')}` : ''}</small>
    </div>
  );
}

function resumenUltimasJornadas(events, asistencia, hoy) {
  const fechas = [...new Set([...asistencia.values()].map((a) => a.date).filter((d) => d && d <= hoy))]
    .sort((a, b) => b.localeCompare(a)).slice(0, 3);
  const porEvento = new Map(events.map((e) => [e.id, e]));
  return fechas.map((fecha) => {
    const servicios = new Map();
    asistencia.forEach((a) => {
      if (a.date !== fecha) return;
      const servicio = servicios.get(a.eventId) || { ev: porEvento.get(a.eventId) || { id: a.eventId, name: 'Servicio' }, total: 0, regular: 0, visita: 0, colaborador: 0 };
      servicio.total++;
      const tipo = ['regular', 'visita', 'colaborador'].includes(a.tipo) ? a.tipo : 'regular';
      servicio[tipo]++;
      servicios.set(a.eventId, servicio);
    });
    return { fecha, servicios: [...servicios.values()].sort((a, b) => (b.ev.time || '').localeCompare(a.ev.time || '')) };
  });
}

function ResumenJornada() {
  const { events = [], asistencia } = useCongrega();
  const jornadas = resumenUltimasJornadas(events, asistencia, todayISO());
  if (!jornadas.length) return null;
  return (
    <section className="card cg-stack cg-resumen">
      <div><h2>Últimas 3 jornadas</h2><div className="muted">Asistencia desglosada por servicio</div></div>
      {jornadas.map((j) => (
        <div key={j.fecha} className="cg-stack">
          <h3>{formatLong(j.fecha)}</h3>
          {j.servicios.map((s) => (
            <div key={s.ev.id} className="cg-row cg-entre">
              <span className="cg-quien"><Link className="cg-nombre" to={`/congrega/asistencia/${s.ev.id}`}>{s.ev.name || 'Servicio'}</Link>
                <span className="cg-meta">{s.regular} regulares · {s.visita} visitas · {s.colaborador} colaboradores</span>
              </span>
              <span className="cg-chip">{s.total} {s.total === 1 ? 'persona' : 'personas'}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

/** Aviso al volver con "Terminar y cerrar": la asistencia ya quedó guardada. */
export function AvisoCerrado({ cerrado }) {
  const [visto, setVisto] = useState(false);
  if (!cerrado || visto) return null;
  return (
    <div className="cg-aviso ok cg-row cg-entre" role="status">
      <span>✓ Asistencia de <strong>{cerrado.nombre}</strong> cerrada y guardada: {plural(cerrado.n, 'presente', 'presentes')}.</span>
      <button type="button" className="btn small ghost" onClick={() => setVisto(true)} aria-label="Ocultar aviso">✕</button>
    </div>
  );
}

/** Asistencia: resumen de la última jornada y lista de eventos. Para cambiar quién vino se entra a "Revisar". */
export default function Asistencia() {
  const ctx = useCongrega();
  const { events = [], asistencia, can, saveEvent } = ctx;
  const navigate = useNavigate();
  const hoy = todayISO();
  const lista = useMemo(() => sortEvents(events.filter((e) => e.date && e.date <= hoy), -1).slice(0, 30), [events, hoy]);
  const conteo = useMemo(() => { const c = new Map(); asistencia.forEach((a) => c.set(a.eventId, (c.get(a.eventId) || 0) + 1)); return c; }, [asistencia]);
  const puedeAbrir = ctx.asisAdmin || can?.events;
  const cerrado = useLocation().state?.cerrado;
  return (
    <div className="cg-stack">
      <div className="page-head">
        <h1>Asistencia</h1>
        <Link className="btn" to="/congrega/estacion">Abrir estación</Link>
      </div>
      <AvisoCerrado cerrado={cerrado} />
      <ResumenJornada />
      {puedeAbrir && (
        <AbrirEvento saveEvent={saveEvent} principal={!events.some((e) => e.date === hoy)} onCreado={(id) => navigate(`/congrega/asistencia/${id}`)} />
      )}
      <h2 className="cg-h3">Últimos eventos</h2>
      <div className="cg-tarjetas-eventos">
        {lista.slice(0, 4).map((e) => (
          <Link key={e.id} className="card cg-tarjeta-evento" to={`/congrega/asistencia/${e.id}`}>
            <span className="cg-te-fecha">{fechaCorta(e.date)}</span>
            <strong className="cg-te-nombre">{e.name || 'Evento'}</strong>
            <span className="cg-chip tipo-evento">{etiquetaTipo(tipoEvento(e))}</span>
            <span className="cg-te-num"><b>{conteo.get(e.id) || 0}</b> {(conteo.get(e.id) || 0) === 1 ? 'presente' : 'presentes'}</span>
            <span className="btn small cg-te-btn">Revisar ›</span>
          </Link>
        ))}
      </div>
      {!lista.length && <div className="card muted cg-vacio">Todavía no hay eventos. {puedeAbrir ? 'Abre un evento para empezar.' : 'Un Administrador debe crear el evento.'}</div>}
      {lista.length > 4 && (
        <details className="card cg-anteriores">
          <summary>Eventos anteriores ({lista.length - 4})</summary>
          <div className="cg-lista">
            {lista.slice(4).map((e) => (
              <div key={e.id} className="cg-item">
                <span className="cg-quien"><span className="cg-nombre">{e.name || 'Evento'}</span><span className="cg-meta">{fechaCorta(e.date)} · {etiquetaTipo(tipoEvento(e))} · {plural(conteo.get(e.id) || 0, 'presente', 'presentes')}</span></span>
                <Link className="btn small" to={`/congrega/asistencia/${e.id}`}>Revisar ›</Link>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Revisar asistencia de un evento: aquí se marca, se quita y se cambia el tipo. */
export function RevisarAsistencia() {
  const ctx = useCongrega();
  const { people, familias, marca, registrarVisita, listo, sinTipo, events = [], saveEvent, can } = ctx;
  const puedeEditar = ctx.asisAdmin || can?.events;
  const [editando, setEditando] = useState(false);
  const navigate = useNavigate();
  const { eventId } = useParams();
  const ev = events.find((e) => e.id === eventId);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [visita, setVisita] = useState(null);
  const [abierta, setAbierta] = useState('');
  const [tipoAbierto, setTipoAbierto] = useState('');
  const [error, setError] = useState('');

  if (!marca) return <Navigate to="/congrega" replace />;
  if (!ev) return <div className="card">{events.length ? 'No encontramos este evento.' : 'Cargando…'} <Link to="/congrega/asistencia">Volver a Asistencia</Link></div>;

  const m = marcadoDe(ctx, ev, setError);
  const { presentes } = m;
  const quien = (uid) => people.find((p) => p.key === uid)?.name || 'otro voluntario';
  const q = norm(buscar);
  const filas = people.filter((p) => {
    if (q) return coincide(p, q, familias);
    if (!activo(p) && !presentes.has(p.key)) return false;
    if (filtro === 'faltan') return !presentes.has(p.key);
    if (filtro === 'presentes') return presentes.has(p.key);
    return true;
  }).sort((a, b) => (filtro === 'presentes' ? (presentes.get(b.key).at - presentes.get(a.key).at) : norm(nombreDe(a)).localeCompare(norm(nombreDe(b)))));

  return (
    <div className="cg-stack">
      <div className="cg-row cg-entre">
        <Link className="btn ghost" to="/congrega/asistencia">← Asistencia</Link>
      </div>
      {(
        <>
          <section className="card cg-evento">
            <div className="cg-evento-head">
              <div>
                <h2>{ev.name || 'Evento'}</h2>
                <div className="muted">{formatLong(ev.date)} · {etiquetaTipo(tipoEvento(ev))}</div>
                {puedeEditar && !editando && <button type="button" className="btn small ghost cg-izq" onClick={() => setEditando(true)}>✎ Cambiar nombre o tipo</button>}
              </div>
              <Contador m={m} />
            </div>
            {editando && <EditarEvento ev={ev} saveEvent={saveEvent} onListo={() => setEditando(false)} />}
          </section>
          <div className="cg-row">
            <input className="cg-grow" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o familia…" aria-label="Buscar persona" />
            <div className="cg-seg" role="group" aria-label="Mostrar">
              {[['todos', 'Todos'], ['faltan', 'Faltan'], ['presentes', 'Presentes']].map(([k, l]) => (
                <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>
              ))}
            </div>
          </div>
          {error && <div className="cg-aviso" role="alert">{error}</div>}
          {sinTipo && <div className="cg-aviso">La asistencia se guarda, pero falta publicar las reglas nuevas en Firebase para guardar si vino como regular, visita o colaborador. Si ya las publicaste, recarga la app.</div>}
          {visita ? (
            <form className="card cg-stack" onSubmit={async (e) => {
              e.preventDefault();
              if (!visita.nombre.trim()) return;
              try { await registrarVisita({ nombre: visita.nombre.trim(), apellido: visita.apellido.trim() }, ev); setVisita(null); setBuscar(''); } catch { setError('No se pudo registrar la visita.'); }
            }}>
              <strong>Visita nueva</strong>
              <div className="cg-row">
                <input className="cg-grow" autoFocus placeholder="Nombre" value={visita.nombre} onChange={(e) => setVisita({ ...visita, nombre: e.target.value })} />
                <input className="cg-grow" placeholder="Apellido" value={visita.apellido} onChange={(e) => setVisita({ ...visita, apellido: e.target.value })} />
              </div>
              <div className="cg-row">
                <button className="btn primary" type="submit">Agregar y marcar presente</button>
                <button className="btn ghost" type="button" onClick={() => setVisita(null)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn ghost cg-izq" onClick={() => setVisita({ nombre: '', apellido: '' })}>+ Registrar visita nueva</button>
          )}
          <div className="card cg-lista" role="list">
            {!listo.asistencia ? <div className="muted cg-vacio">Cargando…</div>
              : !filas.length ? <div className="muted cg-vacio">{q ? 'Nadie coincide. Puedes registrarlo como visita nueva.' : filtro === 'faltan' ? 'Llegaron todos.' : 'Aún no hay nadie aquí.'}</div>
              : filas.slice(0, 400).map((p) => {
                const a = presentes.get(p.key);
                const fam = p.familiaId && familias.get(p.familiaId);
                const parientes = m.familiaDe(p);
                const abierto = abierta === p.key;
                const t = a && new Date(a.at);
                return (
                  <div key={p.key} className={`cg-item${a ? ' presente' : ''}`} role="listitem">
                    <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="lg" />
                    <button type="button" className="cg-quien" aria-expanded={parientes.length ? abierto : undefined}
                      onClick={() => (parientes.length ? setAbierta(abierto ? '' : p.key) : navigate(`/congrega/personas/${p.key}`))}>
                      <span className="cg-nombre">{nombreDe(p)}</span>
                      <span className="cg-meta">
                        {!a && p.tipo === 'Visita' && <span className="cg-chip visita">Visita</span>}
                        {fam && <span>{fam.name}{parientes.length ? ` · ${parientes.length} más ${abierto ? '▴' : '▾'}` : ''}</span>}
                        {a && <span>{String(t.getHours()).padStart(2, '0')}:{String(t.getMinutes()).padStart(2, '0')} · por {quien(a.por)}</span>}
                      </span>
                    </button>
                    {a && (
                      <button type="button" className={`cg-chip-tipo ${m.tipoDe(p)}`} aria-expanded={tipoAbierto === p.key} aria-label={`Cómo vino ${nombreDe(p)}: ${TIPOS_ASISTENCIA.find(([k]) => k === m.tipoDe(p))?.[1]}. Cambiar`}
                        onClick={() => setTipoAbierto(tipoAbierto === p.key ? '' : p.key)}>
                        {TIPOS_ASISTENCIA.find(([k]) => k === m.tipoDe(p))?.[1]} {tipoAbierto === p.key ? '▴' : '▾'}
                      </button>
                    )}
                    <button type="button" className="cg-check" aria-pressed={Boolean(a)} aria-label={`${a ? 'Quitar' : 'Marcar'} asistencia de ${nombreDe(p)}`} onClick={() => {
                      // Al marcar a alguien con familia se marca a toda la familia; el panel queda abierto para desmarcar a quien no vino.
                      if (!a && parientes.length) { m.marcarVarios([p.key, ...parientes.map((x) => x.key)]); setAbierta(p.key); } else m.toggle(p);
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    {a && tipoAbierto === p.key && (
                      <div className="cg-seg cg-tipo" role="group" aria-label={`Cómo vino ${nombreDe(p)}`}>
                        {TIPOS_ASISTENCIA.map(([k, l]) => <button key={k} type="button" aria-pressed={m.tipoDe(p) === k} disabled={sinTipo} onClick={() => { m.cambiarTipo(p, k); setTipoAbierto(''); }}>{l}</button>)}
                      </div>
                    )}
                    {abierto && <Familia p={p} m={m} onFicha={() => navigate(`/congrega/personas/${p.key}`)} />}
                  </div>
                );
              })}
          </div>
          <div className="cg-barra-final">
            <button type="button" className="btn cg-agregar-visita" onClick={() => { setVisita({ nombre: '', apellido: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ Agregar visita</button>
            <button type="button" className="btn primary cg-cerrar-asistencia" onClick={() => navigate('/congrega/asistencia', { state: { cerrado: { nombre: ev.name || 'Evento', n: presentes.size } } })}>✓ Terminar y cerrar</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Desplegable con los familiares activos: marcar uno por uno o a todos. */
export function Familia({ p, m, onFicha }) {
  const parientes = m.familiaDe(p);
  const faltan = [p, ...parientes].filter((x) => !m.presentes.has(x.key));
  return (
    <div className="cg-familia">
      <span className="muted small">{faltan.length ? 'Familia:' : 'Se marcó a toda la familia. Toca a quien no vino para quitarlo.'}</span>
      {parientes.map((x) => (
        <div key={x.key} className={`cg-familiar${m.presentes.has(x.key) ? ' presente' : ''}`}>
          <Avatar name={nombreDe(x)} personKey={x.key} photo={x.photo || ''} size="sm" />
          <span className="cg-grow">{nombreDe(x)}{x.rolFamilia ? <span className="muted"> · {x.rolFamilia}</span> : ''}</span>
          <button type="button" className="cg-check chico" aria-pressed={m.presentes.has(x.key)} aria-label={`${m.presentes.has(x.key) ? 'Quitar' : 'Marcar'} asistencia de ${nombreDe(x)}`} onClick={() => m.toggle(x)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      ))}
      <div className="cg-row">
        {faltan.length > 0 && <button type="button" className="btn small primary" onClick={() => m.marcarVarios(faltan.map((x) => x.key))}>Marcar a toda la familia ({faltan.length})</button>}
        {onFicha && <button type="button" className="btn small ghost" onClick={onFicha}>Ver ficha</button>}
      </div>
    </div>
  );
}
