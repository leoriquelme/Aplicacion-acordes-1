import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { leerMusicaPublica } from '../lib/musicaPublica.jsx';
import { lineasPublicas } from '../lib/musica.js';
import { formatLong, relativeDay } from '../lib/dates.js';
import EscucharCulto from '../components/EscucharCulto.jsx';
import Icon from '../components/Icon.jsx';
import { APP_NOMBRE } from '../lib/marca.js';

/** Página pública (sin cuenta): la música de la iglesia, para mandar por WhatsApp. */
export default function EscucharPublico() {
  const { id } = useParams();
  const [d, setD] = useState(undefined);
  useEffect(() => {
    leerMusicaPublica(id).then(setD).catch(() => setD(null));
  }, [id]);
  if (d === undefined) return <div className="loading">Cargando…</div>;
  if (!d) {
    return (
      <div className="welcome"><div className="welcome-card card">
        <h1>Música no disponible</h1>
        <p className="muted">Este link ya no está activo. Pide el link nuevo a tu iglesia.</p>
        <Link className="btn" to="/">Ir a {APP_NOMBRE}</Link>
      </div></div>
    );
  }
  const c = d.culto;
  const rel = c?.fecha ? relativeDay(c.fecha) : '';
  return (
    <div className="page musica publica">
      <div className="page-head">
        <div>
          <p className="muted small">{d.nombre}</p>
          <h1>Música de la iglesia</h1>
        </div>
      </div>
      {c && c.canciones?.length > 0 && (
        <section className="card musica-bloque destacado">
          <span className="badge-dorado">Próximo culto</span>
          <h2>{c.nombre}</h2>
          <p className="muted small">{rel ? `${rel} · ` : ''}{formatLong(c.fecha)}{c.hora ? ` · ${c.hora}` : ''}</p>
          <EscucharCulto event={{ id: 'publico', name: c.nombre, date: c.fecha, spotify: c.spotify }} lines={lineasPublicas(c.canciones)} />
          <ol className="musica-canciones">
            {c.canciones.map((s, i) => <li key={i}>{s.t}{s.a && <span className="muted small"> · {s.a}</span>}</li>)}
          </ol>
        </section>
      )}
      {d.repertorio?.length > 0 && (
        <section className="card musica-bloque">
          <h2>Las que más cantamos</h2>
          <EscucharCulto event={{ id: 'repertorio', name: `Repertorio de ${d.nombre}`, date: c?.fecha || '' }} lines={lineasPublicas(d.repertorio)} />
          <ol className="musica-canciones">
            {d.repertorio.map((s, i) => <li key={i}>{s.t}{s.a && <span className="muted small"> · {s.a}</span>}</li>)}
          </ol>
        </section>
      )}
      <section className="card musica-bloque">
        <p className="small"><Icon name="church" /> ¿Eres de la iglesia? En {APP_NOMBRE} ves también la letra de cada canción, los servicios y tu ficha.</p>
        <Link className="btn" to="/">Entrar a {APP_NOMBRE}</Link>
      </section>
    </div>
  );
}
