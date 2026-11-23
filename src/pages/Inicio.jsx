import { Link } from 'react-router-dom';
import { APP_NOMBRE } from '../lib/marca.js';
import { useStore } from '../lib/store.jsx';
import { formatLong, relativeDay, sortEvents, todayISO } from '../lib/dates.js';
import Avatares from '../components/Avatares.jsx';
import Icon from '../components/Icon.jsx';
import VersiculoDelDia from '../components/VersiculoDelDia.jsx';
import IglesiaLogo from '../components/IglesiaLogo.jsx';

const MAX_EVENTOS = 4;

export default function Inicio() {
  const { events, songs, mode, church, people = [], participations = [], can } = useStore();
  const today = todayISO();
  const upcoming = sortEvents(events.filter((e) => e.date >= today)).slice(0, MAX_EVENTOS);

  return (
    <div className="page inicio">
      {/* Bloque 1: la iglesia */}
      <section className="card bloque-iglesia">
        <IglesiaLogo />
        <div>
          <h1>{mode === 'cloud' ? church?.name : APP_NOMBRE}</h1>
          <p className="muted">
            {mode === 'cloud'
              ? `${people.length} ${people.length === 1 ? 'miembro participando' : 'miembros participando'}`
              : `${songs.length} canciones en este equipo`}
          </p>
        </div>
      </section>

      <VersiculoDelDia />

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
    </div>
  );
}
