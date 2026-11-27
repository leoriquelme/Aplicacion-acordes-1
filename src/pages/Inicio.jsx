import { Link } from 'react-router-dom';
import { APP_NOMBRE } from '../lib/marca.js';
import { conCuenta, useStore } from '../lib/store.jsx';
import { formatLong, relativeDay, sortEvents, todayISO } from '../lib/dates.js';
import Avatares from '../components/Avatares.jsx';
import Icon from '../components/Icon.jsx';
import VersiculoDelDia from '../components/VersiculoDelDia.jsx';
import IglesiaLogo from '../components/IglesiaLogo.jsx';
import { TuPropuesta } from '../components/Participacion.jsx';
import Cumpleanos from '../components/Cumpleanos.jsx';
import Consejos from '../components/Consejos.jsx';
import { AvisosEstacion } from '../congrega/estacion.jsx';
import MusicaCard from '../components/MusicaCard.jsx';
import AvisosIglesia from '../components/AvisosIglesia.jsx';

const MAX_EVENTOS = 4;

export default function Inicio() {
  const { events, songs, mode, church, people = [], participations = [], propuestas = [], me, joinEvent, rechazarPropuesta, can, isTest } = useStore();
  const today = todayISO();
  const upcoming = sortEvents(events.filter((e) => e.date >= today)).slice(0, MAX_EVENTOS);
  const misPropuestas = propuestas
    .filter((p) => me && p.personKey === me.key && p.estado === 'propuesta')
    .map((p) => ({ p, ev: events.find((e) => e.id === p.eventId) }))
    .filter(({ ev }) => ev && ev.date >= today)
    .sort((a, b) => a.ev.date.localeCompare(b.ev.date));

  return (
    <div className="page inicio">
      {/* Bloque 1: la iglesia */}
      <section className="card bloque-iglesia">
        <IglesiaLogo />
        <div>
          <h1>{mode === 'cloud' ? church?.name : APP_NOMBRE}</h1>
          <p className="muted">
            {mode === 'cloud'
              ? `${conCuenta(people, isTest).length} ${conCuenta(people, isTest).length === 1 ? 'persona usa la app' : 'personas usan la app'}`
              : `${songs.length} canciones en este equipo`}
          </p>
        </div>
      </section>

      {/* Propuestas del líder para servir (la persona acepta o dice que no puede) */}
      {misPropuestas.length > 0 && (
        <section className="card bloque-propuestas">
          <h2>{misPropuestas.length === 1 ? 'Te proponen servir' : 'Te proponen servir en estos servicios'}</h2>
          {misPropuestas.map(({ p, ev }) => (
            <div key={p.id}>
              <Link className="small" to={`/eventos/${ev.id}`}>{ev.name} · {formatLong(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</Link>
              <TuPropuesta p={p} onAcepto={() => joinEvent(ev, p.role, me)} onNoPuedo={() => rechazarPropuesta(p)} />
            </div>
          ))}
        </section>
      )}

      {/* Avisos de la iglesia (los publica el Pastor o el Administrador) */}
      <AvisosIglesia />

      {/* Música de la iglesia: las canciones del próximo culto, para escucharlas en la semana */}
      {mode === 'cloud' && <MusicaCard />}

      {/* Equipo de estación: invitación, ofrecerse para tomar asistencia o aprobar ofrecimientos */}
      <AvisosEstacion />

      {/* Bloque 2: próximos eventos */}
      <h2 className="bloque-titulo">Próximos eventos</h2>
      {upcoming.length === 0 ? (
        <div className="empty card">
          <p>No hay eventos próximos.</p>
          {can.events && <Link className="btn primary" to="/eventos/nuevo">+ Crear un evento</Link>}
        </div>
      ) : (
        <div className="bloques-eventos">
          {upcoming.map((e, i) => {
            const vol = participations.filter((p) => p.eventId === e.id);
            const rel = relativeDay(e.date);
            return (
              <Link key={e.id} to={`/eventos/${e.id}`} className={`card bloque-evento ${i === 0 ? 'proximo' : ''}`}>
                <div className="grow">
                  {i === 0 && <span className="badge-dorado">Próximo</span>}
                  <h3>{e.name}</h3>
                  <p className="muted small">{rel ? `${rel} · ` : ''}{formatLong(e.date)}{e.time ? ` · ${e.time}` : ''}</p>
                </div>
                <div className="voluntarios">
                  <Avatares people={vol} max={5} />
                  <span className="muted small">
                    {mode === 'cloud' ? (vol.length ? `${vol.length} ${vol.length === 1 ? 'voluntario' : 'voluntarios'}` : 'Sin voluntarios aún') : ''}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Cumpleanos />

      <Consejos />

      <VersiculoDelDia />
    </div>
  );
}
