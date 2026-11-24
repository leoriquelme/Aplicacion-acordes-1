// Pestaña Estación: se entra aquí primero y se toca "Iniciar" para abrir la pantalla de marcar.
// El Administrador y el Administrativo de asistencia eligen el equipo de estación (hasta 8),
// aprueban a quien se ofrece para un servicio y pueden iniciar cualquier evento.
// Quien está en el equipo se ofrece para los próximos servicios e inicia la estación en su turno aprobado.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fechaCorta, formatLong, sortEvents, todayISO } from '../lib/dates.js';
import { Avatar } from '../components/Avatares.jsx';
import { nombreDe, norm, useCongrega } from './datos.jsx';
import { estacion, proximosEventos, turnoId, useTurnos } from './estacion.jsx';
import { MAX_EQUIPO_ESTACION } from './permisos.js';

const cerca = (date, hoy) => Math.abs((new Date(`${date}T12:00:00`) - new Date(`${hoy}T12:00:00`)) / 86400000) <= 1;

export default function EstacionInicio() {
  const c = useCongrega();
  const { churchId, myUid, me, events = [], people, equipo, asisAdmin, marca, saveEvent, anotar } = c;
  const turnos = useTurnos(churchId, myUid, asisAdmin);
  const navigate = useNavigate();
  const hoy = todayISO();
  const [error, setError] = useState('');
  const falla = (e) => setError(`No se pudo: ${e.message}`);
  const proximos = useMemo(() => proximosEventos(events, hoy), [events, hoy]);
  const iniciar = (ev) => {
    document.documentElement.requestFullscreen?.().catch?.(() => {});
    navigate(`/congrega/estacion/marcar?ev=${encodeURIComponent(ev.id)}`);
  };
  const mio = equipo.get(myUid);

  return (
    <div className="cg-stack">
      <div className="page-head"><h1>Estación</h1></div>
      {error && <div className="cg-aviso" role="alert">{error}</div>}
      {mio?.estado === 'invitado' && <div className="cg-aviso info">Acepta la invitación de arriba para ser parte del equipo de estación.</div>}
      {marca && (asisAdmin ? <IniciarAdmin events={events} hoy={hoy} iniciar={iniciar} saveEvent={saveEvent} /> : <IniciarTurno turnos={turnos} events={events} hoy={hoy} myUid={myUid} iniciar={iniciar} />)}
      {!asisAdmin && mio?.estado === 'aceptado' && <MisTurnos proximos={proximos} turnos={turnos} c={c} falla={falla} />}
      {asisAdmin && <Aprobar proximos={proximos} turnos={turnos} c={c} falla={falla} />}
      {asisAdmin && <Equipo equipo={equipo} people={people} c={c} falla={falla} me={me} anotar={anotar} />}
    </div>
  );
}

/** Administrador / Administrativo: elegir cualquier evento reciente o de hoy e iniciar. */
function IniciarAdmin({ events, hoy, iniciar, saveEvent }) {
  const lista = useMemo(() => sortEvents(events.filter((e) => e.date && e.date <= hoy), -1).slice(0, 20), [events, hoy]);
  const deHoy = events.filter((e) => e.date === hoy);
  const [id, setId] = useState('');
  const ev = events.find((e) => e.id === id) || deHoy[0] || lista[0];
  return (
    <section className="card cg-stack cg-iniciar">
      <h2>Iniciar estación</h2>
      {!deHoy.length && (
        <button type="button" className="btn" onClick={() => setId(saveEvent({ name: 'Culto dominical', date: hoy, time: '', items: [] }))}>+ Abrir registro de hoy</button>
      )}
      {ev ? (
        <>
          <select value={ev.id} onChange={(e) => setId(e.target.value)} aria-label="Evento">
            {[...deHoy, ...lista.filter((e) => e.date !== hoy)].map((e) => <option key={e.id} value={e.id}>{fechaCorta(e.date)} · {e.name || 'Evento'}</option>)}
          </select>
          <button type="button" className="btn primary cg-boton-iniciar" onClick={() => iniciar(ev)}>▶ Iniciar</button>
        </>
      ) : <p className="muted">Todavía no hay eventos.</p>}
    </section>
  );
}

/** Equipo de estación: inicia solo el evento de su turno aprobado (hoy o mañana). */
function IniciarTurno({ turnos, events, hoy, myUid, iniciar }) {
  const hoyMios = [...turnos.values()].filter((t) => t.uid === myUid && t.estado === 'aprobado' && cerca(t.date || '', hoy))
    .map((t) => events.find((e) => e.id === t.eventId)).filter(Boolean);
  return (
    <section className="card cg-stack cg-iniciar">
      <h2>Iniciar estación</h2>
      {hoyMios.length ? hoyMios.map((ev) => (
        <div key={ev.id} className="cg-stack">
          <div><strong>{ev.name || 'Servicio'}</strong><div className="muted">{formatLong(ev.date)}</div></div>
          <button type="button" className="btn primary cg-boton-iniciar" onClick={() => iniciar(ev)}>▶ Iniciar</button>
        </div>
      )) : <p className="muted">No tienes un turno aprobado para hoy. Ofrécete para un servicio abajo; cuando lo aprueben, aquí aparece el botón Iniciar.</p>}
    </section>
  );
}

const ESTADO = { ofrecido: 'Esperando aprobación', aprobado: 'Aprobado ✓' };

function MisTurnos({ proximos, turnos, c, falla }) {
  const { churchId, myUid, me } = c;
  return (
    <section className="card cg-stack">
      <h2>Próximos servicios</h2>
      <p className="muted">Ofrécete para tomar asistencia. El Administrador o el Administrativo de asistencia lo aprueba.</p>
      {!proximos.length && <p className="muted">No hay servicios programados en las próximas semanas.</p>}
      <div className="card cg-lista">
        {proximos.map((ev) => {
          const t = turnos.get(turnoId(ev.id, myUid));
          return (
            <div key={ev.id} className="cg-item">
              <span className="cg-quien"><span className="cg-nombre">{ev.name || 'Servicio'}</span><span className="cg-meta">{formatLong(ev.date)}{t ? ` · ${ESTADO[t.estado]}` : ''}</span></span>
              {t ? <button type="button" className="btn small ghost" onClick={() => estacion.quitarTurno(churchId, t.id).catch(falla)}>{t.estado === 'aprobado' ? 'Ya no puedo' : 'Cancelar'}</button>
                : <button type="button" className="btn small primary" onClick={() => estacion.ofrecer(churchId, ev, myUid, me?.name).catch(falla)}>Me ofrezco</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Ofrecimientos por aprobar y turnos de los próximos servicios. */
function Aprobar({ proximos, turnos, c, falla }) {
  const { churchId, myUid, equipo, anotar } = c;
  const lista = [...turnos.values()];
  const pendientes = lista.filter((t) => t.estado === 'ofrecido' && (t.date || '') >= todayISO()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const enEquipo = [...equipo.entries()].filter(([, x]) => x.estado === 'aceptado');
  const evDe = (id) => c.events.find((e) => e.id === id);
  return (
    <section className="card cg-stack">
      <h2>Turnos de estación</h2>
      {pendientes.length > 0 && (
        <div className="cg-stack">
          <h3 className="cg-h3">Por aprobar</h3>
          <div className="card cg-lista">
            {pendientes.map((t) => (
              <div key={t.id} className="cg-item">
                <span className="cg-quien"><span className="cg-nombre">{t.nombre}</span><span className="cg-meta">{evDe(t.eventId)?.name || 'Servicio'} · {formatLong(t.date)}</span></span>
                <button type="button" className="btn small primary" onClick={() => estacion.aprobar(churchId, t.id, myUid).then(() => anotar('Aprobó un turno de estación', t.nombre, t.date)).catch(falla)}>Aprobar</button>
                <button type="button" className="btn small ghost" onClick={() => estacion.quitarTurno(churchId, t.id).catch(falla)}>No</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {!proximos.length && <p className="muted">No hay servicios programados en las próximas semanas.</p>}
      {proximos.map((ev) => {
        const aprobados = lista.filter((t) => t.eventId === ev.id && t.estado === 'aprobado');
        const libres = enEquipo.filter(([uid]) => !turnos.has(turnoId(ev.id, uid)));
        return (
          <div key={ev.id} className="cg-dato full">
            <span>{ev.name || 'Servicio'} · {formatLong(ev.date)}</span>
            <div className="cg-tags">
              {aprobados.map((t) => <button key={t.id} type="button" className="cg-tag" aria-pressed="true" title="Quitar" onClick={() => estacion.quitarTurno(churchId, t.id).catch(falla)}>{t.nombre} ✕</button>)}
              {!aprobados.length && <span className="muted">Nadie aprobado todavía.</span>}
              {libres.length > 0 && (
                <select className="cg-tag" value="" aria-label="Asignar a alguien del equipo" onChange={(e) => { const uid = e.target.value; const x = equipo.get(uid); if (uid) estacion.ofrecer(churchId, ev, uid, x?.nombre, 'aprobado', myUid).catch(falla); }}>
                  <option value="">+ Asignar…</option>
                  {libres.map(([uid, x]) => <option key={uid} value={uid}>{x.nombre || 'Sin nombre'}</option>)}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Equipo de estación: hasta 8 personas con cuenta. Se invitan y ellas aceptan desde su Inicio. */
function Equipo({ equipo, people, c, falla, me, anotar }) {
  const { churchId, myUid } = c;
  const [elegido, setElegido] = useState('');
  const lleno = equipo.size >= MAX_EQUIPO_ESTACION;
  const conCuenta = people.filter((p) => p.uid && !equipo.has(p.key)).sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const persona = (uid) => people.find((p) => p.key === uid);
  return (
    <section className="card cg-stack">
      <h2>Equipo de estación <span className="muted">· {equipo.size} de {MAX_EQUIPO_ESTACION}</span></h2>
      <p className="muted">Quienes pueden tomar la estación. Reciben una invitación en su Inicio; cuando aceptan, se ofrecen para los servicios y tú apruebas. No ven teléfonos, direcciones ni notas.</p>
      <div className="card cg-lista">
        {[...equipo.entries()].map(([uid, x]) => {
          const p = persona(uid);
          return (
            <div key={uid} className="cg-item">
              <Avatar name={p ? nombreDe(p) : x.nombre} personKey={uid} photo={p?.photo || ''} size="md" />
              <span className="cg-quien"><span className="cg-nombre">{p ? nombreDe(p) : x.nombre}</span><span className="cg-meta">{x.estado === 'aceptado' ? 'En el equipo' : 'Invitación enviada'}</span></span>
              <button type="button" className="btn small ghost" onClick={() => estacion.quitar(churchId, uid).then(() => anotar('Quitó del equipo de estación', x.nombre)).catch(falla)}>Quitar</button>
            </div>
          );
        })}
        {!equipo.size && <div className="muted cg-vacio">Todavía no hay nadie. Invita a quienes ayudan en la entrada.</div>}
      </div>
      {lleno ? <p className="muted">El equipo está completo ({MAX_EQUIPO_ESTACION}). Quita a alguien para invitar a otra persona.</p> : (
        <div className="cg-row">
          <select className="cg-grow" value={elegido} onChange={(e) => setElegido(e.target.value)} aria-label="Persona para invitar">
            <option value="">Elige a alguien con cuenta en la app…</option>
            {conCuenta.map((p) => <option key={p.key} value={p.key}>{nombreDe(p)}</option>)}
          </select>
          <button type="button" className="btn primary" disabled={!elegido} onClick={() => {
            const p = persona(elegido);
            estacion.invitar(churchId, elegido, nombreDe(p), myUid).then(() => { anotar('Invitó al equipo de estación', nombreDe(p)); setElegido(''); }).catch(falla);
          }}>Invitar</button>
        </div>
      )}
      {!conCuenta.length && !lleno && <p className="muted small">Solo se puede invitar a quien ya entró a la app con su cuenta{me?.name ? '' : ''}.</p>}
    </section>
  );
}
