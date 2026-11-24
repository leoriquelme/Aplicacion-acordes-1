import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { todayISO, formatLong, sortEvents } from '../lib/dates.js';
import { activo, asistenciaId, nombreDe, norm, useCongrega } from './datos.jsx';
import { TIPOS_ASISTENCIA, tipoPorDefecto } from './unir.js';
import { Avatar } from '../components/Avatares.jsx';

export default function Asistencia() {
  const { events = [], people, familias, asistencia, marca, can, saveEvent, marcar, registrarVisita, listo, participations = [], sinTipo } = useCongrega();
  const navigate = useNavigate();
  const hoy = todayISO();
  const lista = useMemo(() => sortEvents(events.filter((e) => e.date && e.date <= hoy), -1).slice(0, 30), [events, hoy]);
  const [eventId, setEventId] = useState(null);
  const ev = events.find((e) => e.id === eventId) || events.find((e) => e.date === hoy) || lista[0] || null;
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [visita, setVisita] = useState(null);
  const [error, setError] = useState('');

  if (!marca) {
    return <div className="card"><p>Para marcar asistencia, pide al Administrador que te habilite en <strong>Congrega → Ajustes</strong>.</p></div>;
  }

  const presentes = new Map();
  if (ev) asistencia.forEach((a) => { if (a.eventId === ev.id) presentes.set(a.personKey, a); });
  const quien = (uid) => people.find((p) => p.key === uid)?.name || 'otro voluntario';
  const q = norm(buscar);
  const filas = people.filter((p) => {
    const fam = p.familiaId && familias.get(p.familiaId);
    if (q) return norm(`${nombreDe(p)} ${p.apodo || ''} ${fam?.name || ''}`).includes(q);
    if (!activo(p) && !presentes.has(p.key)) return false;
    if (filtro === 'faltan') return !presentes.has(p.key);
    if (filtro === 'presentes') return presentes.has(p.key);
    return true;
  }).sort((a, b) => (filtro === 'presentes' ? (presentes.get(b.key).at - presentes.get(a.key).at) : norm(nombreDe(a)).localeCompare(norm(nombreDe(b)))));

  // Tipo por defecto: colaborador si sirve en este evento; visita sus 3 primeras veces; después, regular.
  const tipoDe = (p) => {
    const a = presentes.get(p.key);
    if (a?.tipo) return a.tipo;
    const sirve = participations.some((x) => x.eventId === ev.id && x.personKey === p.key && !x.estado);
    let anteriores = 0; asistencia.forEach((x) => { if (x.personKey === p.key && x.date && x.date < ev.date) anteriores++; });
    return tipoPorDefecto(p, { sirve, anteriores });
  };
  const persona = (k) => people.find((p) => p.key === k);
  const toggle = (p) => marcar(ev, p.key, !presentes.has(p.key), tipoDe(p)).catch(() => setError('No se pudo guardar. Revisa la conexión.'));
  const cambiarTipo = (p, tipo) => marcar(ev, p.key, true, tipo, presentes.get(p.key)?.at).catch(() => setError('No se pudo guardar. Revisa la conexión.'));
  const marcarFamilia = async (ids) => { for (const k of ids) await marcar(ev, k, true, tipoDe(persona(k))).catch(() => setError('No se pudo guardar.')); };
  const cuenta = { regular: 0, visita: 0, colaborador: 0 };
  presentes.forEach((a, k) => { const p = persona(k); if (p) cuenta[tipoDe(p)]++; });
  const visitas = cuenta.visita;

  return (
    <div className="cg-stack">
      <div className="page-head"><h1>Asistencia</h1></div>
      {!events.some((e) => e.date === hoy) && can?.events && (
        <button type="button" className="btn primary" onClick={() => setEventId(saveEvent({ name: 'Culto dominical', date: hoy, time: '', items: [] }))}>
          Abrir registro de hoy
        </button>
      )}
      {!ev ? (
        <div className="card muted">Todavía no hay eventos. {can?.events ? 'Abre el registro de hoy para empezar.' : 'Un Administrador o Director debe crear el evento.'}</div>
      ) : (
        <>
          <section className="card cg-evento">
            <div className="cg-evento-head">
              <div>
                <h2>{ev.name || 'Evento'}</h2>
                <div className="muted">{formatLong(ev.date)}</div>
              </div>
              <div className="cg-contador" aria-live="polite">{presentes.size}<small>{presentes.size === 1 ? 'presente' : 'presentes'}{cuenta.colaborador ? ` · ${cuenta.colaborador} ${cuenta.colaborador === 1 ? 'colaborador' : 'colaboradores'}` : ''}{visitas ? ` · ${visitas} ${visitas === 1 ? 'visita' : 'visitas'}` : ''}</small></div>
            </div>
            <select value={ev.id} onChange={(e) => setEventId(e.target.value)} aria-label="Evento">
              {(lista.some((e) => e.id === ev.id) ? lista : [ev, ...lista]).map((e) => <option key={e.id} value={e.id}>{e.date} · {e.name || 'Evento'}</option>)}
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
          {sinTipo && <div className="cg-aviso">La asistencia se guarda, pero falta publicar las reglas nuevas en Firebase para guardar si vino como regular, visita o colaborador.</div>}
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
                const faltanFam = fam ? people.filter((m) => m.familiaId === p.familiaId && !presentes.has(m.key)).map((m) => m.key) : [];
                const t = a && new Date(a.at);
                return (
                  <div key={p.key} className={`cg-item${a ? ' presente' : ''}`} role="listitem">
                    <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="lg" />
                    <button type="button" className="cg-quien" onClick={() => navigate(`/congrega/personas/${p.key}`)}>
                      <span className="cg-nombre">{nombreDe(p)}</span>
                      <span className="cg-meta">
                        {!a && p.tipo === 'Visita' && <span className="cg-chip visita">Visita</span>}
                        {fam && <span>{fam.name}</span>}
                        {a && <span>{String(t.getHours()).padStart(2, '0')}:{String(t.getMinutes()).padStart(2, '0')} · por {quien(a.por)}</span>}
                      </span>
                    </button>
                    {a && (
                      <div className="cg-seg cg-tipo" role="group" aria-label={`Cómo vino ${nombreDe(p)}`}>
                        {TIPOS_ASISTENCIA.map(([k, l]) => <button key={k} type="button" aria-pressed={tipoDe(p) === k} disabled={sinTipo} onClick={() => cambiarTipo(p, k)}>{l}</button>)}
                      </div>
                    )}
                    {a && faltanFam.length > 0 && <button type="button" className="btn small" onClick={() => marcarFamilia(faltanFam)}>+ familia ({faltanFam.length})</button>}
                    <button type="button" className="cg-check" aria-pressed={Boolean(a)} aria-label={`${a ? 'Quitar' : 'Marcar'} asistencia de ${nombreDe(p)}`} onClick={() => toggle(p)}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

export { asistenciaId };
