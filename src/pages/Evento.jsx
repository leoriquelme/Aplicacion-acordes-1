import { useRef, useState } from 'react';
import { MAX_FUTUROS, cabeOtroFuturo, esFuturo, sePuedeEditar } from '../lib/limitesEventos.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { displayKey, normalize } from '../lib/chordpro.js';
import { formatLong, todayISO } from '../lib/dates.js';
import { songKey } from '../lib/importar.js';
import { PARTES, eventLines } from '../lib/evento.js';
import { descargarRecordatorio } from '../lib/recordatorio.js';

// Botón "Recordarme" (archivo de calendario). Escondido por ahora; poner true para volver a mostrarlo.
const MOSTRAR_RECORDATORIO = false;
import TransposeControls from '../components/TransposeControls.jsx';
import ArrangementEditor from '../components/ArrangementEditor.jsx';
import Participacion from '../components/Participacion.jsx';
import ConfirmX from '../components/ConfirmX.jsx';
import ConfirmarEliminar from '../components/ConfirmarEliminar.jsx';
import Icon from '../components/Icon.jsx';
import EscucharCulto from '../components/EscucharCulto.jsx';
import { esLinkSpotify } from '../lib/spotify.js';

export default function Evento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, songs, settings, saveEvent, deleteEvent, can, mode } = useStore();
  const [q, setQ] = useState('');
  const [openOrder, setOpenOrder] = useState(null);
  const [mas, setMas] = useState(false);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const listRef = useRef(null);
  const drag = useRef(null);
  const [otra, setOtra] = useState('');
  // Evento nuevo: se arma aquí y solo se guarda al pulsar "Crear evento".
  const isNew = id === 'nuevo';
  const [draft, setDraft] = useState(() => ({ name: 'Servicio de Adoración', date: todayISO(), time: '11:00', notes: '', items: [] }));
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const event = isNew ? draft : events.find((e) => e.id === id);

  const editable = isNew || sePuedeEditar(event);
  const lleno = isNew && !cabeOtroFuturo(events);

  if (isNew && !can.events) {
    return (
      <div className="page">
        <p>Tu perfil no permite crear eventos.</p>
        <Link to="/eventos">← Volver a eventos</Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page">
        <p>No se encontró el evento.</p>
        <Link to="/eventos">← Volver a eventos</Link>
      </div>
    );
  }

  const lines = eventLines(event, songs);
  const hasSongs = lines.some((l) => l.song);
  const when = `${formatLong(event.date)}${event.time ? ` · ${event.time}` : ''}`;

  // Vista de lectura (la de siempre durante el servicio). Quien puede editar ve el botón "Editar".
  if (lleno) {
    return (
      <div className="page">
        <p>Máximo {MAX_FUTUROS} eventos próximos.</p>
        <Link to="/eventos">← Volver a eventos</Link>
      </div>
    );
  }

  if (!can.events || !editable || (!isNew && !editing)) {
    return (
      <div className="page">
        <Link to="/eventos" className="back">← Eventos</Link>
        <div className="page-head">
          <div>
            <h1>{event.name}</h1>
            <p className="muted">{when}</p>
          </div>
          <div className="head-actions">
            {hasSongs && <Link className="btn primary" to={`/presentar/evento/${event.id}`}><Icon name="play" /> Presentar</Link>}
            <button
              className={`btn ${mas ? 'activo' : ''}`}
              onClick={() => setMas((m) => !m)}
              aria-expanded={mas}
              title="PDF del servicio, Spotify y videos"
            >
              Más <span className={`flecha-mas ${mas ? 'abierta' : ''}`} aria-hidden="true">▾</span>
            </button>
            {can.events && editable && (
              <button className="btn round editar-lapiz" onClick={() => setEditing(true)} aria-label="Editar" title="Editar">
                <Icon name="edit" />
              </button>
            )}
          </div>
        </div>
        {mas && (
          <div className="event-mas">
            <div className="event-tools">
              <Link className="btn small" to={`/imprimir/evento/${event.id}`}><Icon name="print" /> PDF del servicio</Link>
              {MOSTRAR_RECORDATORIO && <button className="btn small" onClick={() => descargarRecordatorio(event)}><Icon name="bell" /> Recordarme</button>}
            </div>
            <EscucharCulto event={event} lines={lines} />
          </div>
        )}
        {event.notes && <p className="card">{event.notes}</p>}
        <section className="card orden-culto">
        <h2>Orden del servicio</h2>
        {lines.length === 0 && <p className="muted">Vacío.</p>}
        <ol className="setlist">
          {lines.map(({ item, index, song }, n) => (
            <li key={index} className={`setlist-item ${song ? '' : 'parte'}`}>
              <span className="setlist-num">{n + 1}</span>
              {song ? (
                <>
                  <Link className="grow" to={`/canciones/${song.id}?t=${item.transpose || 0}&ev=${event.id}`}>
                    <strong>{song.title}</strong>
                  </Link>
                  {songKey(song) && <span className="key-pill">{displayKey(songKey(song), item.transpose || 0, settings.notation)}</span>}
                </>
              ) : (
                <span className="grow">
                  <strong>{item.label}</strong>
                  {item.detail && <span className="muted"> · {item.detail}</span>}
                </span>
              )}
            </li>
          ))}
        </ol>
        </section>
        <Participacion event={event} />
      </div>
    );
  }

  const update = (patch) => {
    // Mover un evento pasado a una fecha próxima cuenta para el máximo de 10.
    if (patch.date && !esFuturo(event) && esFuturo({ date: patch.date }) && !cabeOtroFuturo(events, event.id)) {
      setError(`Ya hay ${MAX_FUTUROS} eventos próximos (el máximo).`);
      return;
    }
    setError('');
    return isNew ? setDraft((d) => ({ ...d, ...patch })) : saveEvent({ ...event, ...patch });
  };
  const setItems = (items) => update({ items });
  const setItem = (i, patch) => setItems(event.items.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  // Mover arrastrando (mouse o dedo), igual que las secciones de una canción.
  // `from` y `over` son posiciones en la lista que se ve; se pasan a índices de event.items.
  const move = (from, over) => {
    if (from === null || over === null || from === over || from + 1 === over) return;
    const items = [...event.items];
    const fromIdx = lines[from].index;
    const toIdx = over < lines.length ? lines[over].index : items.length;
    const [item] = items.splice(fromIdx, 1);
    items.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, item);
    setItems(items);
    setOpenOrder(null);
  };
  const overIndex = (y) => {
    const els = [...(listRef.current?.querySelectorAll('.setlist-item') || [])];
    const k = els.findIndex((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return k === -1 ? els.length : k;
  };
  const endDrag = () => { drag.current = null; setDragFrom(null); setDragOver(null); };
  const dragProps = (n) => ({
    onPointerDown: (e) => {
      if (e.button > 0 || e.target.closest('button, input, select, a, .setlist-order')) return;
      if (e.pointerType !== 'mouse' && !e.target.closest('.grip')) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current = { from: n, over: n };
      setDragFrom(n);
      setDragOver(n);
    },
    onPointerMove: (e) => {
      if (!drag.current) return;
      const over = overIndex(e.clientY);
      if (over !== drag.current.over) { drag.current.over = over; setDragOver(over); }
    },
    onPointerUp: () => {
      if (!drag.current) return;
      const { from, over } = drag.current;
      endDrag();
      move(from, over);
    },
    onPointerCancel: endDrag,
  });
  const marca = (n) => (dragOver === n && dragFrom !== null && dragFrom !== n && dragFrom + 1 !== n ? 'drop-before' : '');

  const query = normalize(q.trim());
  const results = query
    ? songs.filter((s) => normalize(s.title).includes(query) || normalize(s.author).includes(query)).slice(0, 8)
    : [];

  const addParte = (label) => {
    const l = label.trim();
    if (!l) return;
    setItems([...event.items, { type: 'text', label: l.slice(0, 40), detail: '' }]);
    setOtra('');
  };

  return (
    <div className="page">
      <Link to="/eventos" className="back">← Eventos</Link>
      <div className="page-head">
        <div>
          <h1>{isNew ? 'Nuevo evento' : event.name}</h1>
          <p className="muted">
            {isNew ? null : when}
          </p>
        </div>
        {!isNew && (
          <button className="btn primary" onClick={() => { setEditing(false); }}>✓ Listo</button>
        )}
      </div>

      <div className="card">
        <div className="row gap wrap">
          <label className="grow">
            Nombre
            <input value={event.name} onChange={(e) => update({ name: e.target.value })} />
          </label>
          <label>
            Fecha
            <input type="date" value={event.date} onChange={(e) => e.target.value && update({ date: e.target.value })} />
          </label>
          <label>
            Hora
            <input type="time" value={event.time || ''} onChange={(e) => update({ time: e.target.value })} />
          </label>
        </div>
        {!isNew && error && <p className="error">{error}</p>}
        <label>
          Notas
          <textarea rows={2} value={event.notes || ''} onChange={(e) => update({ notes: e.target.value })} placeholder="Ej. Cena del Señor, bautismo…" />
        </label>
        <label>
          Playlist de Spotify <span className="muted small">(opcional)</span>
          <input
            type="url" inputMode="url"
            value={event.spotify || ''}
            onChange={(e) => update({ spotify: e.target.value.trim().slice(0, 300) })}
            placeholder="Si armaste la playlist en Spotify, pega aquí su link"
          />
          {!esLinkSpotify(event.spotify) && <span className="error small">Ese link no parece de Spotify.</span>}
        </label>
      </div>

      <section className="card orden-culto">
      <h2>Orden del servicio</h2>
      {lines.length === 0 ? (
        <p className="muted">Vacío.</p>
      ) : (
        <ol className={`setlist setlist-drag ${dragFrom !== null ? 'is-dragging' : ''}`} ref={listRef}>
          {lines.map(({ item, index: i, song: s }, n) => (
            <li
              key={i}
              className={`setlist-item ${s ? '' : 'parte'} ${dragFrom === n ? 'dragging' : ''} ${marca(n)}`}
              {...dragProps(n)}
            >
              <span className="grip" aria-hidden="true" title="Arrastra para mover">⠿</span>
              <span className="setlist-num">{n + 1}</span>
              {s ? (
                <div className="setlist-main">
                  <Link to={`/canciones/${s.id}`}><strong>{s.title}</strong></Link>
                  <div className="setlist-controls">
                    <TransposeControls
                      compact
                      songKey={songKey(s)}
                      steps={item.transpose || 0}
                      notation={settings.notation}
                      onChange={(t) => setItem(i, { transpose: t })}
                    />
                    <button
                      className={`btn small ${item.order?.length ? 'primary' : ''}`}
                      onClick={() => setOpenOrder(openOrder === i ? null : i)}
                      title="Elegir el orden de las secciones solo para este evento"
                    >
                      Orden{item.order?.length ? ' ✓' : ''}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="setlist-main parte-edit">
                  <strong>{item.label}</strong>
                  <input
                    value={item.detail || ''}
                    placeholder={item.label === 'Predicación' ? 'Ej. Juan Pérez · Juan 3:16' : item.label === 'Lectura bíblica' ? 'Ej. Salmo 23' : 'Detalle (opcional)'}
                    onChange={(e) => setItem(i, { detail: e.target.value.slice(0, 80) })}
                  />
                </div>
              )}
              <ConfirmX className="btn ghost small" label={`Quitar ${s ? s.title : item.label}`} onConfirm={() => { setItems(event.items.filter((_, k) => k !== i)); setOpenOrder(null); }} />
              {s && openOrder === i && (
                <div className="setlist-order">
                  <p className="muted small">
                    Orden de "{s.title}" solo para este servicio. En Canciones se sigue viendo normal.
                    {!item.order?.length && ' Ahora usa el orden de la canción.'}
                  </p>
                  <ArrangementEditor
                    content={s.content}
                    order={item.order}
                    fallbackOrder={s.order}
                    resetLabel="Usar orden de la canción"
                    onChange={(order) => setItem(i, { order })}
                  />
                </div>
              )}
            </li>
          ))}
          <li className={`setlist-end ${marca(lines.length)}`} />
        </ol>
      )}
      </section>

      <div className="card">
        <label>
          Agregar canción
          <input type="search" placeholder="Buscar por título o autor…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {results.length > 0 && (
          <ul className="picker">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  className="picker-row"
                  onClick={() => {
                    setItems([...event.items, { songId: s.id, transpose: 0 }]);
                    setQ('');
                  }}
                >
                  <span>+ {s.title} {s.author && <span className="muted">· {s.author}</span>}</span>
                  {songKey(s) && <span className="key-pill">{displayKey(songKey(s), 0, settings.notation)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && results.length === 0 && <p className="muted">No se encontraron canciones.</p>}

        <div className="field-label" style={{ marginTop: '0.6rem' }}>Agregar parte del servicio</div>
        <div className="row gap wrap partes">
          {PARTES.map((p) => (
            <button key={p} className="btn small" onClick={() => addParte(p)}>+ {p}</button>
          ))}
        </div>
        <div className="row gap" style={{ marginTop: '0.5rem' }}>
          <input
            className="grow"
            value={otra}
            placeholder="Otra parte (texto propio)…"
            onChange={(e) => setOtra(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addParte(otra)}
          />
          <button className="btn small" disabled={!otra.trim()} onClick={() => addParte(otra)}>Agregar</button>
        </div>
      </div>

      {!isNew && <Participacion event={event} />}

      {isNew ? (
        <div className="create-bar">
          {error && <p className="error">{error}</p>}
          <div className="row gap">
            <button
              className="btn primary big-inline"
              onClick={() => {
                if (!draft.name.trim() || !draft.date) {
                  setError('El evento necesita nombre y fecha.');
                  return;
                }
                saveEvent({ ...draft, name: draft.name.trim() });
                navigate('/eventos');
              }}
            >
              ✓ Crear evento
            </button>
            <Link className="btn" to="/eventos">Cancelar</Link>
          </div>
        </div>
      ) : (
        <ConfirmarEliminar text="Eliminar evento" question={`¿Eliminar el evento "${event.name}"?`}
          onConfirm={() => deleteEvent(event.id)} onDone={() => navigate('/eventos')} />
      )}
    </div>
  );
}
