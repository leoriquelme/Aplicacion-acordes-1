import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { formatLong, relativeDay, todayISO } from '../lib/dates.js';
import { DIAS_REPERTORIO, hayMusica, lineasRepertorio, linkMusica, proximoCulto, repertorio, ultimoCulto } from '../lib/musica.js';
import { activarMusicaPublica, quitarMusicaPublica, useDatosMusica, useMusicaPublica } from '../lib/musicaPublica.jsx';
import EscucharCulto from '../components/EscucharCulto.jsx';
import Qr from '../components/Qr.jsx';
import Icon from '../components/Icon.jsx';

/**
 * Música de la iglesia: para que todos los hermanos (aunque no sirvan ni hayan ido al culto)
 * escuchen durante la semana las canciones del próximo culto, las del último y las que más se cantan.
 */
export default function Musica() {
  const { events = [], songs = [], mode } = useStore();
  const datos = useMemo(() => {
    const now = new Date();
    return { proximo: proximoCulto(events, songs, now), ultimo: ultimoCulto(events, songs, now), rep: repertorio(songs, events, { now }) };
  }, [events, songs]);
  const { proximo, ultimo, rep } = datos;
  const repEvento = { id: 'repertorio', name: 'Repertorio de la iglesia', date: todayISO() };

  return (
    <div className="page musica">
      <div className="page-head">
        <div>
          <h1>Música de la iglesia</h1>
          <p className="muted">Escucha durante la semana lo que cantamos juntos.</p>
        </div>
      </div>

      {!proximo && !ultimo && rep.length === 0 && (
        <div className="card empty"><p>Todavía no hay canciones en los servicios. Cuando el director arme el próximo culto, aparecen aquí.</p></div>
      )}

      {proximo && <Culto titulo="Próximo culto" destacado {...proximo} />}
      {ultimo && ultimo.event.id !== proximo?.event.id && <Culto titulo="Lo que cantamos la última vez" {...ultimo} />}

      {rep.length > 0 && (
        <section className="card musica-bloque">
          <h2>Repertorio de la iglesia</h2>
          <p className="muted small">Las canciones que más cantamos en los últimos {Math.round(DIAS_REPERTORIO / 30)} meses.</p>
          {hayMusica(lineasRepertorio(rep)) && <EscucharCulto event={repEvento} lines={lineasRepertorio(rep)} />}
          <ol className="lista-tarjetas">
            {rep.map((u, i) => (
              <li key={u.song.id}>
                <Link to={`/canciones/${u.song.id}`} className="tarjeta-fila tf-cabeza">
                  <span className="tf-puesto">{i + 1}</span>
                  <span className="grow"><strong>{u.song.title}</strong>{u.song.author && <span className="muted small">{u.song.author}</span>}</span>
                  <span className="tf-numero"><strong>{u.count}</strong><span className="muted small">{u.count === 1 ? 'vez' : 'veces'}</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {mode === 'cloud' && <Compartir />}
    </div>
  );
}

function Culto({ titulo, event, lines, destacado = false }) {
  const rel = relativeDay(event.date);
  return (
    <section className={`card musica-bloque${destacado ? ' destacado' : ''}`}>
      <span className="badge-dorado">{titulo}</span>
      <h2><Link to={`/eventos/${event.id}`}>{event.name}</Link></h2>
      <p className="muted small">{rel ? `${rel} · ` : ''}{formatLong(event.date)}{event.time ? ` · ${event.time}` : ''}</p>
      <EscucharCulto event={event} lines={lines} />
      <ol className="musica-canciones">
        {lines.map(({ song, index, item }) => (
          <li key={`${index}-${song.id}`}>
            <Link to={`/canciones/${song.id}?t=${item.transpose || 0}&ev=${event.id}`}>{song.title}</Link>
            {song.author && <span className="muted small"> · {song.author}</span>}
          </li>
        ))}
      </ol>
      <p className="muted small">Toca una canción para ver la letra.</p>
    </section>
  );
}

/** Link público (sin cuenta) para mandar por WhatsApp a quien no está en la app. */
function Compartir() {
  const { churchId, church, can } = useStore();
  const publico = useMusicaPublica(churchId);
  const datos = useDatosMusica();
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  if (publico === undefined) return null;
  const link = linkMusica(churchId);
  const texto = `Escucha la música de ${church?.name || 'la iglesia'}: las canciones del próximo culto y las que más cantamos.\n${link}`;
  const activar = async () => {
    setOcupado(true); setMsg('');
    try { await activarMusicaPublica(churchId, datos); } catch (e) { setMsg(`No se pudo activar: ${e.message}`); }
    setOcupado(false);
  };
  const quitar = async () => {
    setOcupado(true); setMsg('');
    try { await quitarMusicaPublica(churchId); } catch (e) { setMsg(`No se pudo desactivar: ${e.message}`); }
    setOcupado(false);
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setMsg('✓ Link copiado.'); } catch { window.prompt('Copia este link:', link); }
  };

  if (!publico) {
    if (!can.events) return null;
    return (
      <section className="card musica-bloque">
        <h2><Icon name="globe" /> Compartir con quien no tiene la app</h2>
        <p className="small">Activa un link que abre la música sin pedir cuenta: sirve para hermanos que no tienen la app, visitas o familiares. Solo muestra los títulos y los links de Spotify y YouTube (ni letras, ni personas).</p>
        <button className="btn primary" disabled={ocupado} onClick={activar}>{ocupado ? 'Activando…' : 'Activar link público'}</button>
        {msg && <p className="error small">{msg}</p>}
      </section>
    );
  }
  return (
    <section className="card musica-bloque">
      <h2><Icon name="globe" /> Compartir la música</h2>
      <p className="small">Este link abre la música sin pedir cuenta y se actualiza solo cuando cambia el culto.</p>
      <div className="row gap wrap">
        <a className="btn primary" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"><Icon name="phone" /> Enviar por WhatsApp</a>
        <button className="btn" onClick={copiar}>Copiar link</button>
        <Link className="btn" to="/imprimir/afiche/musica"><Icon name="print" /> Afiche con QR</Link>
      </div>
      <div className="invitar-qr"><Qr texto={link} size={150} titulo="QR de la música de la iglesia" /></div>
      {can.events && <button className="btn small ghost" disabled={ocupado} onClick={quitar}>Desactivar el link público</button>}
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
