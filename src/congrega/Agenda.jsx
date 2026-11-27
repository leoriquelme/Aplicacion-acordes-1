// Agenda de la iglesia: cultos, oración, jóvenes y escuela dominical de los próximos 3 meses,
// con "Agregar a mi calendario" (Google Calendar o archivo para iPhone y otros).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { relativeDay, todayISO } from '../lib/dates.js';
import { agendaPorMes, linkGoogle } from '../lib/calendario.js';
import { descargarRecordatorio } from '../lib/recordatorio.js';
import Icon from '../components/Icon.jsx';
import { TIPOS_EVENTO, etiquetaTipo, tipoEvento } from './eventos.js';

export default function Agenda() {
  const { events = [], church } = useStore();
  const [tipo, setTipo] = useState('todos');
  const hoy = todayISO();
  const todos = events.filter((e) => e.date >= hoy);
  const hay = new Set(todos.map(tipoEvento));
  const grupos = agendaPorMes(tipo === 'todos' ? todos : todos.filter((e) => tipoEvento(e) === tipo), hoy);
  return (
    <div className="cg-stack agenda">
      <div className="page-head"><div><h1>Agenda</h1><p className="muted">Lo que viene en la iglesia, los próximos 3 meses</p></div></div>
      {hay.size > 1 && (
        <div className="agenda-filtros" role="group" aria-label="Tipo de evento">
          <button type="button" className={`filtro-chip${tipo === 'todos' ? ' activo' : ''}`} onClick={() => setTipo('todos')}>Todos</button>
          {TIPOS_EVENTO.filter((t) => hay.has(t.k)).map((t) => (
            <button type="button" key={t.k} className={`filtro-chip${tipo === t.k ? ' activo' : ''}`} onClick={() => setTipo(t.k)}>{t.l}</button>
          ))}
        </div>
      )}
      {!grupos.length && <div className="card muted">No hay eventos en la agenda todavía.</div>}
      {grupos.map((g) => (
        <section key={g.k} className="agenda-mes">
          <h2 className="agenda-mes-titulo">{g.mes}</h2>
          {g.eventos.map((e) => <EventoAgenda key={e.id} e={e} iglesia={church?.name} />)}
        </section>
      ))}
    </div>
  );
}

function EventoAgenda({ e, iglesia }) {
  const [abierto, setAbierto] = useState(false);
  const [y, m, d] = e.date.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  const rel = relativeDay(e.date);
  return (
    <article className="card agenda-evento">
      <div className="agenda-fila">
        <span className="cg-dia"><b>{d}</b><small>{f.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}</small></span>
        <Link to={`/eventos/${e.id}`} className="grow agenda-quien">
          <strong>{e.name || 'Evento'}</strong>
          <span className="muted small">{[rel, e.time, etiquetaTipo(tipoEvento(e))].filter(Boolean).join(' · ')}</span>
        </Link>
        <button type="button" className="btn small ghost" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} title="Agregar a mi calendario"><Icon name="bell" /> Agendar</button>
      </div>
      {abierto && (
        <div className="row gap wrap agenda-agendar">
          <a className="btn small" href={linkGoogle(e, { iglesia })} target="_blank" rel="noreferrer"><Icon name="calendar" /> Google Calendar</a>
          <button type="button" className="btn small" onClick={() => descargarRecordatorio({ ...e, name: `${e.name || 'Evento'}${iglesia ? ` · ${iglesia}` : ''}` })}><Icon name="download" /> iPhone u otro calendario</button>
          <span className="muted small">Te avisa un día antes y una hora antes.</span>
        </div>
      )}
    </article>
  );
}
