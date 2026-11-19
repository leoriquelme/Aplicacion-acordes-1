import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { sortEvents, todayISO } from '../lib/dates.js';
import Avatares from '../components/Avatares.jsx';
import ResumenEquipos from '../components/MisEquipos.jsx';
import SongRanking from '../components/SongRanking.jsx';
import HistorialParticipacion from '../components/HistorialParticipacion.jsx';
import Icon from '../components/Icon.jsx';

/** Pestaña "Mi iglesia": datos de la iglesia, mis equipos, canciones más usadas e historial. */
export default function MiIglesia() {
  const { mode, church, people = [], songs, events, participations = [], can } = useStore();
  const today = todayISO();
  const proximos = events.filter((e) => e.date >= today).length;
  const pasados = sortEvents(events.filter((e) => e.date < today)).length;
  return (
    <div className="page">
      <section className="card bloque-iglesia">
        <div className="bloque-icono"><Icon name="church" /></div>
        <div className="grow">
          <h1>{mode === 'cloud' ? church?.name : 'Mi iglesia'}</h1>
          {mode === 'cloud' && <Avatares people={people} max={8} size="sm" />}
        </div>
      </section>

      <div className="datos-grid">
        {mode === 'cloud' && (
          <Link className="card dato" to="/mi-iglesia/miembros">
            <strong>{people.length}</strong><span>miembros ›</span>
          </Link>
        )}
        <Link className="card dato" to="/canciones"><strong>{songs.length}</strong><span>canciones</span></Link>
        <Link className="card dato" to="/eventos"><strong>{proximos}</strong><span>eventos próximos</span></Link>
        <div className="card dato"><strong>{pasados}</strong><span>eventos realizados</span></div>
      </div>

      {mode === 'cloud' && <ResumenEquipos />}
      <SongRanking songs={songs} events={events} />
      {can.events && mode === 'cloud' && <HistorialParticipacion participations={participations} events={events} />}
    </div>
  );
}
