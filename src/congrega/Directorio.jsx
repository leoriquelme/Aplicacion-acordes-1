// Directorio de hermanos: solo quienes aceptaron aparecer (en Mi ficha), con su celular y correo.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatares.jsx';
import Icon from '../components/Icon.jsx';
import { useDirectorio } from '../lib/directorio.jsx';
import { linkWhatsApp, numeroWhatsApp } from '../lib/saludos.js';
import { activo, nombreDe, norm, useCongrega } from './datos.jsx';

export default function Directorio() {
  const { churchId, people, familias, myUid } = useCongrega();
  const dir = useDirectorio(churchId);
  const [q, setQ] = useState('');
  const lista = people.filter((p) => dir.has(p.key) && activo(p) && norm(nombreDe(p)).includes(norm(q.trim())))
    .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es'));
  return (
    <div className="cg-stack">
      <div className="page-head"><div><h1>Directorio</h1><p className="muted">Hermanos que decidieron compartir su contacto</p></div></div>
      {!dir.has(myUid) && <div className="card small">¿Quieres aparecer? Actívalo en <Link to="/congrega/mificha">Mi ficha</Link>. Es voluntario.</div>}
      {dir.size > 6 && <input type="search" placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en el directorio" />}
      {!lista.length && <div className="card muted">{q ? 'Nadie con ese nombre.' : 'Todavía nadie aparece en el directorio.'}</div>}
      {lista.map((p) => {
        const c = dir.get(p.key);
        const fam = p.familiaId && familias.get(p.familiaId);
        return (
          <article key={p.key} className="card cg-item directorio-item">
            <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="md" />
            <span className="cg-quien"><span className="cg-nombre">{nombreDe(p)}{p.key === myUid ? ' (tú)' : ''}</span><span className="cg-meta">{[fam && `Familia ${fam.name}`, c.telefono].filter(Boolean).join(' · ')}</span></span>
            <span className="cg-row directorio-acciones">
              {c.telefono && <a className="btn small" href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`} aria-label={`Llamar a ${nombreDe(p)}`}><Icon name="phone" /></a>}
              {numeroWhatsApp(c.telefono) && <a className="btn small" href={linkWhatsApp(c.telefono, '')} target="_blank" rel="noreferrer">WhatsApp</a>}
              {c.email && <a className="btn small ghost" href={`mailto:${c.email}`}>Correo</a>}
            </span>
          </article>
        );
      })}
    </div>
  );
}
