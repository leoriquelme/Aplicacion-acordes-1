import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { todayISO } from '../lib/dates.js';
import Avatares from '../components/Avatares.jsx';
import ResumenEquipos from '../components/MisEquipos.jsx';
import SongRanking from '../components/SongRanking.jsx';
import HistorialParticipacion from '../components/HistorialParticipacion.jsx';
import Icon from '../components/Icon.jsx';
import MisIglesias from '../components/MisIglesias.jsx';
import InvitarCard from '../components/InvitarCard.jsx';
import { CodigoAcceso } from '../components/Administracion.jsx';
import { FilaAbre, Grupo, SalirIglesia } from '../components/Comunicacion.jsx';
import IglesiaLogo from '../components/IglesiaLogo.jsx';

/** Pestaña "Iglesia": datos de la iglesia, mis equipos, top repertorio e historial. */
export default function MiIglesia() {
  const { mode, church, people = [], songs, events, participations = [], can } = useStore();
  const today = todayISO();
  const proximos = events.filter((e) => e.date >= today).length;
  const pasados = events.filter((e) => !e.soloAsistencia && e.date < today).length;
  // Sin iglesia abierta: elegir una, unirse con código o crear una.
  if (mode === 'personal') {
    return (
      <div className="page">
        <Link to="/ajustes" className="back">← Ajustes</Link>
        <MisIglesias />
      </div>
    );
  }
  return (
    <div className="page">
      <section className="card bloque-iglesia">
        <IglesiaLogo />
        <div className="grow">
          <h1>{mode === 'cloud' ? church?.name : 'Iglesia'}</h1>
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

      <Grupo>
        {mode === 'cloud' && <InvitarCard />}
        {mode === 'cloud' && <CodigoAcceso />}
        {mode === 'cloud' && <FilaAbre label={<><Icon name="users" /> Equipos</>}><ResumenEquipos /></FilaAbre>}
        <FilaAbre label={<><Icon name="music" /> Top repertorio</>}><SongRanking songs={songs} events={events} /></FilaAbre>
        {can.events && mode === 'cloud' && (
          <FilaAbre label={<><Icon name="hand" /> Participación</>}><HistorialParticipacion participations={participations} events={events} /></FilaAbre>
        )}
      </Grupo>
      {mode === 'cloud' && <MisIglesias actual={church?.id} />}
      <SalirIglesia />
    </div>
  );
}
