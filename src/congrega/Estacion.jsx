// Estación de asistencia: pantalla completa para un teléfono o tablet en la entrada.
// Se abre desde la pestaña Estación con el botón "Iniciar" (/congrega/estacion/marcar?ev=ID).
// Letra grande, fotos y un toque para marcar. Si la persona tiene familia, se abre su familia.
// Avisa los cumpleaños y aniversarios de la semana.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fechaCorta, formatLong, todayISO } from '../lib/dates.js';
import { activo, nombreDe, norm, useCongrega } from './datos.jsx';
import { celebraciones, coincide, marcadoDe } from './marcado.js';
import { Contador, Familia, useEvento } from './Asistencia.jsx';
import { Avatar } from '../components/Avatares.jsx';

export default function Estacion() {
  const ctx = useCongrega();
  const { people, familias, marca, registrarVisita, sinTipo } = ctx;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const elegido = ctx.events?.find((e) => e.id === params.get('ev'));
  const porDefecto = useEvento();
  const ev = elegido || (ctx.asisAdmin ? porDefecto.ev : null);
  const { opciones, setEventId } = porDefecto;
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
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
    return <div className="cg-estacion"><div className="card"><p>Para marcar asistencia necesitas estar en el equipo de estación.</p><Link className="btn" to="/congrega">Volver</Link></div></div>;
  }
  if (!ev) {
    return <div className="cg-estacion"><div className="card"><p>Elige el evento y toca <strong>Iniciar</strong> en la pestaña Estación.</p><Link className="btn" to="/congrega/estacion">Ir a Estación</Link></div></div>;
  }

  const m = marcadoDe(ctx, ev, setError);
  const q = norm(buscar);
  const base = people.filter((p) => (q ? coincide(p, q, familias) : activo(p) || m.presentes.has(p.key)));
  const nPresentes = base.filter((p) => m.presentes.has(p.key)).length;
  const lista = base.filter((p) => (filtro === 'presentes' ? m.presentes.has(p.key) : filtro === 'ausentes' ? !m.presentes.has(p.key) : true))
    .sort((a, b) => norm(nombreDe(a)).localeCompare(norm(nombreDe(b))));
  // Un toque marca a la persona y a toda su familia; después se puede quitar a quien no vino.
  const tocar = (p) => {
    const parientes = m.familiaDe(p);
    if (!m.presentes.has(p.key) && parientes.length) { m.marcarVarios([p.key, ...parientes.map((x) => x.key)]); setFamilia(p); return; }
    m.toggle(p);
  };
  const hoy = todayISO();
  const fiesta = (p) => celebraciones(p, ev.date || hoy);
  const festejados = people.filter((p) => activo(p) && fiesta(p).length);
  const pantallaCompleta = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {});

  return (
    <div className="cg-estacion">
      <header className="cg-estacion-head">
        <Link className="btn ghost" to="/congrega/estacion" onClick={() => document.fullscreenElement && document.exitFullscreen().catch(() => {})}>← Salir</Link>
        <div className="cg-grow">
          {ctx.asisAdmin && !elegido ? (
            <select value={ev.id} onChange={(e) => setEventId(e.target.value)} aria-label="Evento">
              {opciones.map((e) => <option key={e.id} value={e.id}>{fechaCorta(e.date)} · {e.name || 'Evento'}</option>)}
            </select>
          ) : <strong className="cg-estacion-evento">{ev.name || 'Evento'}</strong>}
          <div className="muted">{formatLong(ev.date)}</div>
        </div>
        <Contador m={m} />
      </header>
      <div className="cg-estacion-buscar">
        <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Escribe tu nombre o apellido…" aria-label="Buscar persona" autoFocus />
        <button type="button" className="btn" onClick={() => setVisita({ nombre: '', apellido: '' })}>+ Visita</button>
        {document.documentElement.requestFullscreen && <button type="button" className="btn ghost" onClick={pantallaCompleta}>{completa ? 'Salir de pantalla completa' : 'Pantalla completa'}</button>}
        <div className="cg-seg cg-estacion-filtros" role="group" aria-label="Mostrar">
          {[['todos', 'Todos', base.length], ['ausentes', 'Ausentes', base.length - nPresentes], ['presentes', 'Presentes', nPresentes]].map(([k, l, n]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l} <span className="cg-filtro-n">{n}</span></button>
          ))}
        </div>
      </div>
      {festejados.length > 0 && (
        <div className="cg-fiestas" aria-label="Cumpleaños y aniversarios de la semana">
          {festejados.map((p) => fiesta(p).map((f) => (
            <button key={p.key + f.tipo} type="button" className={`cg-fiesta${f.dias === 0 ? ' hoy' : ''}`} onClick={() => setBuscar(nombreDe(p))}>
              {f.icono} <strong>{nombreDe(p)}</strong> · {f.cuando}
            </button>
          )))}
        </div>
      )}
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
              {fiesta(p).map((f) => <span key={f.tipo} className={`cg-tarjeta-fiesta${f.dias === 0 ? ' hoy' : ''}`}>{f.icono} {f.texto}</span>)}
            </button>
          );
        })}
        {!lista.length && <div className="card muted cg-vacio">{filtro === 'presentes' && !q ? 'Todavía no hay nadie marcado.' : filtro === 'ausentes' && !q ? '¡Llegaron todos!' : 'Nadie coincide. Si es su primera vez, toca “Agregar visita”.'}</div>}
      </div>
      <div className="cg-barra-final">
        <button type="button" className="btn cg-agregar-visita" onClick={() => setVisita({ nombre: '', apellido: '' })}>+ Agregar visita</button>
        <button type="button" className="btn primary cg-cerrar-asistencia" onClick={() => {
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          navigate('/congrega/estacion', { state: { cerrado: { nombre: ev.name || 'Evento', n: m.presentes.size } } });
        }}>✓ Terminar y cerrar</button>
      </div>

      {familia && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Familia" onClick={(e) => e.target === e.currentTarget && setFamilia(null)}>
          <div className="modal cg-stack cg-estacion-modal">
            <h2>¡Hola, {familia.nombre || nombreDe(familia)}!</h2>
            {[familia, ...m.familiaDe(familia)].flatMap((x) => fiesta(x).map((f) => <div key={x.key + f.tipo} className="cg-aviso info">{f.icono} {nombreDe(x)}: {f.texto}</div>))}
            <p className="muted">Marcamos a la familia {familias.get(familia.familiaId)?.name || ''}. Si alguien no vino, tócalo para quitarlo.</p>
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
