import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { proximoCulto, ultimoCulto } from '../lib/musica.js';
import { relativeDay } from '../lib/dates.js';
import Icon from './Icon.jsx';

/** Acceso a la Música de la iglesia desde Inicio: cuántas canciones tiene el próximo culto. */
export default function MusicaCard() {
  const { events = [], songs = [] } = useStore();
  const { culto, cual } = useMemo(() => {
    const now = new Date();
    const p = proximoCulto(events, songs, now);
    return p ? { culto: p, cual: 'proximo' } : { culto: ultimoCulto(events, songs, now), cual: 'ultimo' };
  }, [events, songs]);
  if (!culto) return null;
  const n = culto.lines.length;
  const rel = cual === 'proximo' ? relativeDay(culto.event.date) : '';
  return (
    <Link to="/musica" className="card bloque-musica">
      <span className="bloque-musica-icono" aria-hidden="true"><Icon name="music" size="1.6rem" /></span>
      <span className="grow">
        <strong>Música de la iglesia</strong>
        <span className="muted small">
          {cual === 'proximo' ? `${n} ${n === 1 ? 'canción' : 'canciones'} para ${culto.event.name}${rel ? ` (${rel.toLowerCase()})` : ''}` : `Lo que cantamos en ${culto.event.name}`}
          {' · escúchalas en Spotify o YouTube'}
        </span>
      </span>
      <span className="fila-flecha" aria-hidden="true">›</span>
    </Link>
  );
}
