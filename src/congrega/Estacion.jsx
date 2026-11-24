// Estación de asistencia: pantalla completa para un teléfono o tablet en la entrada.
// Letra grande, fotos y un toque para marcar. Si la persona tiene familia, se abre su familia.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatLong } from '../lib/dates.js';
import { activo, nombreDe, norm, useCongrega } from './datos.jsx';
import { coincide, marcadoDe } from './marcado.js';
import { Contador, Familia, useEvento } from './Asistencia.jsx';
import { Avatar } from '../components/Avatares.jsx';

export default function Estacion() {
  const ctx = useCongrega();
  const { people, familias, marca, registrarVisita, sinTipo } = ctx;
  const { ev, opciones, setEventId } = useEvento();
  const [buscar, setBuscar] = useState('');
  const [familia, setFamilia] = useState(null);
  const [visita, setVisita] = useState(null);
  const [error, setError] = useState('');
  const [completa, setCompleta] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const f = () => setCompleta(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);

  if (!marca) {
    return <div className="cg-estacion"><div className="card"><p>Para marcar asistencia, pide al Administrador que te habilite en <strong>Congrega → Ajustes</strong>.</p><Link className="btn" to="/congrega">Volver</Link></div></div>;
  }
  if (!ev) {
    return <div className="cg-estacion"><div className="card"><p>Todavía no hay un evento para hoy. Ábrelo desde Asistencia.</p><Link className="btn" to="/congrega/asistencia">Ir a Asistencia</Link></div></div>;
  }

  const m = marcadoDe(ctx, ev, setError);
  const q = norm(buscar);
  const lista = people.filter((p) => (q ? coincide(p, q, familias) : activo(p)))
    .sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  const tocar = (p) => {
    if (!m.presentes.has(p.key) && m.familiaDe(p).length) { m.toggle(p); setFamilia(p); return; }
    m.toggle(p);
  };
  const pantallaCompleta = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {});

  return (
    <div className="cg-estacion">
      <header className="cg-estacion-head">
        <Link className="btn ghost" to="/congrega/asistencia">← Salir</Link>
        <div className="cg-grow">
          <select value={ev.id} onChange={(e) => setEventId(e.target.value)} aria-label="Evento">
            {opciones.map((e) => <option key={e.id} value={e.id}>{e.name || 'Evento'} · {e.date}</option>)}
          </select>
          <div className="muted">{formatLong(ev.date)}</div>
        </div>
        <Contador m={m} />
      </header>
      <div className="cg-estacion-buscar">
        <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Escribe tu nombre o apellido…" aria-label="Buscar persona" autoFocus />
        <button type="button" className="btn" onClick={() => setVisita({ nombre: '', apellido: '' })}>+ Visita</button>
        {document.documentElement.requestFullscreen && <button type="button" className="btn ghost" onClick={pantallaCompleta}>{completa ? 'Salir de pantalla completa' : 'Pantalla completa'}</button>}
      </div>
      {error && <div className="cg-aviso" role="alert">{error}</div>}
      {sinTipo && <div className="cg-aviso">Falta publicar las reglas nuevas en Firebase (tipo de asistencia). Si ya las publicaste, recarga la app.</div>}
      <div className="cg-estacion-grid">
        {lista.map((p) => {
          const presente = m.presentes.has(p.key);
          const fam = p.familiaId && familias.get(p.familiaId);
          return (
            <button key={p.key} type="button" className={`cg-tarjeta${presente ? ' presente' : ''}`} aria-pressed={presente} onClick={() => tocar(p)}>
              <Avatar name={nombreDe(p)} personKey={p.key} photo={p.photo || ''} size="xl" />
              <span className="cg-tarjeta-nombre">{nombreDe(p)}</span>
              <span className="cg-tarjeta-meta">{presente ? '✓ Presente' : fam ? fam.name : ' '}</span>
            </button>
          );
        })}
        {!lista.length && <div className="card muted cg-vacio">Nadie coincide. Si es su primera vez, toca “+ Visita”.</div>}
      </div>

      {familia && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Familia" onClick={(e) => e.target === e.currentTarget && setFamilia(null)}>
          <div className="modal cg-stack cg-estacion-modal">
            <h2>¡Hola, {familia.nombre || nombreDe(familia)}!</h2>
            <p className="muted">¿Quién más de la familia {familias.get(familia.familiaId)?.name || ''} vino hoy?</p>
            <Familia p={familia} m={m} />
            <button type="button" className="btn primary" onClick={() => { setFamilia(null); setBuscar(''); }}>Listo</button>
          </div>
        </div>
      )}
      {visita && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Visita nueva">
          <form className="modal cg-stack cg-estacion-modal" onSubmit={async (e) => {
            e.preventDefault();
            if (!visita.nombre.trim()) return;
            try { await registrarVisita({ nombre: visita.nombre.trim(), apellido: visita.apellido.trim() }, ev); setVisita(null); setBuscar(''); } catch { setError('No se pudo registrar la visita.'); }
          }}>
            <h2>¡Bienvenido!</h2>
            <input autoFocus placeholder="Nombre" value={visita.nombre} onChange={(e) => setVisita({ ...visita, nombre: e.target.value })} />
            <input placeholder="Apellido" value={visita.apellido} onChange={(e) => setVisita({ ...visita, apellido: e.target.value })} />
            <button className="btn primary" type="submit">Agregar y marcar presente</button>
            <button className="btn ghost" type="button" onClick={() => setVisita(null)}>Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
}
