import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fechaCorta, todayISO, formatLong, sortEvents } from '../lib/dates.js';
import { activo, nombreDe, norm, useCongrega } from './datos.jsx';
import { TIPOS_ASISTENCIA } from './unir.js';
import { coincide, marcadoDe, resumenJornada } from './marcado.js';
import { Avatar } from '../components/Avatares.jsx';

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

function ResumenJornada() {
  const { events = [], asistencia, people } = useCongrega();
  const r = resumenJornada(events, asistencia, people, todayISO());
  if (!r) return null;
  return (
    <section className="card cg-stack cg-resumen">
      <div className="cg-evento-head">
        <div><h2>Última jornada</h2><div className="muted">{formatLong(r.fecha)}</div></div>
        <div className="cg-contador">{r.personas}<small>{r.personas === 1 ? 'persona' : 'personas'}</small></div>
      </div>
      <div className="datos-grid">
        <div className="card dato"><strong>{r.regular}</strong><span>{r.regular === 1 ? 'regular' : 'regulares'}</span></div>
        <div className="card dato"><strong>{r.colaborador}</strong><span>{r.colaborador === 1 ? 'colaborador' : 'colaboradores'}</span></div>
        <div className="card dato"><strong>{r.visita}</strong><span>{r.visita === 1 ? 'visita' : 'visitas'}</span></div>
        <div className="card dato"><strong>{r.primeraVez}</strong><span>por primera vez</span></div>
      </div>
      {r.eventos.length > 1 && (
        <div className="cg-meta">{r.eventos.map(({ ev, n }) => <span key={ev.id} className="cg-chip">{ev.name || 'Evento'}: {n}</span>)}</div>
      )}
    </section>
  );
}

export default function Asistencia() {
  const ctx = useCongrega();
  const { people, familias, marca, can, saveEvent, registrarVisita, listo, sinTipo } = ctx;
  const navigate = useNavigate();
  const { ev, opciones, setEventId, hoy } = useEvento();
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [visita, setVisita] = useState(null);
  const [abierta, setAbierta] = useState('');
  const [tipoAbierto, setTipoAbierto] = useState('');
  const [error, setError] = useState('');

  if (!marca) {
    return <div className="card"><p>Para marcar asistencia, pide al Administrador que te habilite en <strong>Congrega → Ajustes</strong>.</p></div>;
  }

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
      <div className="page-head">
        <h1>Asistencia</h1>
        <Link className="btn" to="/congrega/estacion">Abrir estación</Link>
      </div>
      <ResumenJornada />
      {!ctx.events?.some((e) => e.date === hoy) && (ctx.asisAdmin || can?.events) && (
        <button type="button" className="btn primary" onClick={() => setEventId(saveEvent({ name: 'Culto dominical', date: hoy, time: '', items: [] }))}>
          Abrir registro de hoy
        </button>
      )}
      {!ev ? (
        <div className="card muted">Todavía no hay eventos. {(ctx.asisAdmin || can?.events) ? 'Abre el registro de hoy para empezar.' : 'Un Administrador debe crear el evento.'}</div>
      ) : (
        <>
          <section className="card cg-evento">
            <div className="cg-evento-head">
              <div>
                <h2>{ev.name || 'Evento'}</h2>
                <div className="muted">{formatLong(ev.date)}</div>
              </div>
              <Contador m={m} />
            </div>
            <select value={ev.id} onChange={(e) => setEventId(e.target.value)} aria-label="Evento">
              {opciones.map((e) => <option key={e.id} value={e.id}>{fechaCorta(e.date)} · {e.name || 'Evento'}</option>)}
            </select>
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
          <button type="button" className="btn primary cg-agregar-visita" onClick={() => { setVisita({ nombre: '', apellido: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ Agregar visita</button>
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
