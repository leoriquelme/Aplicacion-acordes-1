// Inicio del hermano: lo que ve en Congrega quien no administra personas (Miembro, Colaborador,
// Encargado de asistencia). Avisos, música, próximos eventos, cumpleaños y versículo, en una sola pantalla.
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { formatLong, relativeDay, sortEvents, todayISO } from '../lib/dates.js';
import AvisosIglesia from '../components/AvisosIglesia.jsx';
import MusicaCard from '../components/MusicaCard.jsx';
import Cumpleanos from '../components/Cumpleanos.jsx';
import VersiculoDelDia from '../components/VersiculoDelDia.jsx';
import { Avatar } from '../components/Avatares.jsx';
import { etiquetaTipo, tipoEvento } from './eventos.js';
import { nombreDe, useCongrega } from './datos.jsx';
import { AccesoOracion } from './Accesos.jsx';

const MAX_EVENTOS = 4;

export default function InicioHermano() {
  const { church } = useStore();
  const { people, events = [], myUid } = useCongrega();
  const yo = people.find((p) => p.key === myUid);
  const nombre = (yo?.nombre || yo?.name || '').split(' ')[0];
  const hoy = todayISO();
  const proximos = sortEvents(events.filter((e) => e.date >= hoy)).slice(0, MAX_EVENTOS);
  return (
    <div className="cg-stack inicio-hermano">
      <div className="page-head"><div><h1>{nombre ? `Hola, ${nombre}` : 'Hola'}</h1><p className="muted">{church?.name}</p></div></div>

      <AvisosIglesia />
      <MusicaCard />

      <section className="card musica-bloque">
        <h2>Próximos eventos</h2>
        {proximos.length === 0 ? <p className="muted">No hay eventos próximos.</p> : (
          <ul className="hermano-eventos">
            {proximos.map((e) => {
              const rel = relativeDay(e.date);
              return (
                <li key={e.id}>
                  <Link to={`/eventos/${e.id}`}>
                    <strong>{e.name}</strong>
                    <span className="muted small">{rel ? `${rel} · ` : ''}{formatLong(e.date)}{e.time ? ` · ${e.time}` : ''} · {etiquetaTipo(tipoEvento(e))}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link className="btn small" to="/congrega/agenda">Ver la agenda completa ›</Link>
      </section>

      <AccesoOracion />

      <Cumpleanos />

      {yo && (
        <Link to="/congrega/mificha" className="card bloque-musica">
          <Avatar name={nombreDe(yo)} personKey={yo.key} photo={yo.photo || ''} size="md" />
          <span className="grow"><strong>Mi ficha</strong><span className="muted small">Tus datos, tu foto y tu familia</span></span>
          <span className="fila-flecha" aria-hidden="true">›</span>
        </Link>
      )}

      <VersiculoDelDia />
    </div>
  );
}
