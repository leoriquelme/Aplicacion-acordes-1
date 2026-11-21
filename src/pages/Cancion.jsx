import { songKey } from '../lib/importar.js';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getCapo, getPersonalKey, setCapo as saveCapo, setPersonalKey, useStore } from '../lib/store.jsx';
import { chordOptions, displayKey, guessKey } from '../lib/chordpro.js';
import { sortEvents, todayISO, formatLong } from '../lib/dates.js';
import SongView from '../components/SongView.jsx';
import TransposeControls from '../components/TransposeControls.jsx';
import CompartirCancion from '../components/CompartirCancion.jsx';
import ArrangementEditor from '../components/ArrangementEditor.jsx';
import DiagramasGuitarra from '../components/DiagramasGuitarra.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmarEliminar from '../components/ConfirmarEliminar.jsx';
import { ElegirNota } from '../components/NotasCancion.jsx';
import { alternarNota, notasPorSeccion } from '../lib/notas.js';

export default function Cancion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { songs, events, settings, deleteSong, saveEvent, saveSong, can, favorites = [], toggleFavorite, myNotes = {}, setMyNotes } = useStore();
  // Si se abrió desde un evento, el tono lo fijó quien armó el culto.
  const fromEvent = params.get('ev') ? events.find((e) => e.id === params.get('ev')) : null;
  // Tono personal: cada músico guarda su propio tono en su equipo.
  const [personalSteps, setStepsState] = useState(() => getPersonalKey(id));
  const setSteps = (n) => {
    setStepsState(n);
    setPersonalKey(id, n);
  };
  useEffect(() => setStepsState(getPersonalKey(id)), [id]);
  const steps = fromEvent ? Number(params.get('t')) || 0 : personalSteps;
  // Capo personal: el tono suena igual, pero los acordes se muestran con formas más fáciles.
  const [capo, setCapoState] = useState(() => getCapo(id));
  useEffect(() => setCapoState(getCapo(id)), [id]);
  const setCapo = (n) => {
    setCapoState(n);
    saveCapo(id, n);
  };
  const [added, setAdded] = useState('');
  const [editOrder, setEditOrder] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [noteFor, setNoteFor] = useState(null);
  const song = songs.find((s) => s.id === id);

  if (!song) {
    return (
      <div className="page">
        <p>No se encontró la canción.</p>
        <Link to="/canciones">← Volver a canciones</Link>
      </div>
    );
  }

  const shownOrder = fromEvent?.items.find((i) => i.songId === song.id && i.order?.length)?.order || song.order;
  const directorNotes = song.notes || [];
  const misNotas = myNotes[song.id] || [];
  const saveDirector = (list) => saveSong({ ...song, notes: list });
  const saveMias = (list) => setMyNotes?.(song.id, list);
  const removeNote = (section, n) => (n.mine ? saveMias(alternarNota(misNotas, section, n.id)) : saveDirector(alternarNota(directorNotes, section, n.id)));

  // Solo los próximos eventos (nunca los pasados).
  const upcoming = sortEvents(events.filter((e) => e.date >= todayISO()));


  const addToEvent = (eventId) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    saveEvent({ ...ev, items: [...ev.items, { songId: song.id, transpose: steps }] });
    setAdded(`Agregada a "${ev.name}"`);
  };

  return (
    <div className="page">
      <div className="cancion-arriba">
        <Link to="/canciones" className="back">← Canciones</Link>
        {can.edit && <Link className="btn small ghost editar-discreto" to={`/canciones/${song.id}/editar`}><Icon name="edit" /> Editar</Link>}
      </div>
      <div className="page-head">
        <div>
          <h1>
            {song.title}{' '}
            {toggleFavorite && (
              <button
                className={`fav-star ${favorites.includes(song.id) ? 'on' : ''}`}
                onClick={() => toggleFavorite(song.id)}
                aria-pressed={favorites.includes(song.id)}
                title={favorites.includes(song.id) ? 'Quitar de mis favoritas' : 'Agregar a mis favoritas (solo tú las ves)'}
              >
                {favorites.includes(song.id) ? '★' : '☆'}
              </button>
            )}
          </h1>
          {song.author && <p className="muted">{song.author}</p>}
          {(song.bpm || song.compas) && (
            <p className="song-meta">
              {song.bpm && <span>{song.bpm} BPM</span>}
              {song.compas && <span>{song.compas}</span>}
            </p>
          )}
        </div>
      </div>

      <section className="cancion-controles">
        <div className="control-fila">
        {fromEvent ? (
          <div className="event-key">
            <span className="transpose-title">Tono del culto</span>
            <strong className="key-pill big">{displayKey(songKey(song), steps, settings.notation) || (steps ? `${steps > 0 ? '+' : ''}${steps}` : 'Original')}</strong>
            <Link className="muted small" to={`/eventos/${fromEvent.id}`}>de "{fromEvent.name}"</Link>
          </div>
        ) : (
          <TransposeControls songKey={songKey(song)} steps={steps} onChange={setSteps} notation={settings.notation} />
        )}
        </div>
        <div className="control-fila">
          <ElegirCapo capo={capo} onChange={setCapo} tono={songKey(song)} steps={steps} notation={settings.notation} />
        </div>
      </section>

      <div className="cancion-acciones">
        <Link className="btn primary" to={`/presentar/cancion/${song.id}?t=${steps}`}><Icon name="play" /> Presentar</Link>
        {setMyNotes && (
          <button className={`btn ${editNotes ? 'primary' : ''}`} onClick={() => setEditNotes(!editNotes)} aria-pressed={editNotes}>
            {editNotes ? '✓ Listo' : <><Icon name="note" /> Notas</>}
          </button>
        )}
        {can.events && upcoming.length > 0 && (
          <select value="" onChange={(e) => addToEvent(e.target.value)} aria-label="Agregar a un evento">
            <option value="">+ Agregar a un evento…</option>
            {upcoming.map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {formatLong(e.date)}</option>
            ))}
          </select>
        )}
      </div>
      {added && <p className="ok cancion-agregada">✓ {added}</p>}

      <div className={`song-layout ${editOrder ? '' : 'con-riel'}`}>
        <div className="grow-col">
          <DiagramasGuitarra
            content={song.content}
            steps={steps - capo}
            opts={chordOptions(songKey(song) || guessKey(song.content), steps - capo, settings.notation)}
          />
          {editNotes && <p className="muted small notas-ayuda">Toca “+ Nota” en una parte.</p>}
          <SongView content={song.content} songKey={songKey(song)} steps={steps - capo} order={shownOrder} settings={settings}
            notes={notasPorSeccion(directorNotes, misNotas)}
            onAddNote={editNotes ? setNoteFor : undefined}
            onRemoveNote={editNotes ? removeNote : undefined}
            canEditDirector={can.edit}
          />
          {noteFor && (
            <ElegirNota
              section={noteFor}
              canDirector={can.edit}
              director={directorNotes}
              mias={misNotas}
              onDirector={saveDirector}
              onMia={saveMias}
              onClose={() => setNoteFor(null)}
            />
          )}
        </div>
        {editOrder ? (
          <aside className="order-panel">
            <div className="row between">
              <h3>Orden</h3>
              <button className="btn small primary" onClick={() => setEditOrder(false)}>✓ Listo</button>
            </div>
            <p className="muted small">Arrastra ⠿ para mover · + repite</p>
            <ArrangementEditor
              content={song.content}
              order={song.order}
              onChange={(order) => saveSong({ ...song, order })}
            />
          </aside>
        ) : (
          <aside className="order-rail" aria-label="Orden de la canción">
            <ArrangementEditor
              content={song.content}
              order={shownOrder}
              readOnly
              compact
              onPick={(i) => document.getElementById(`seccion-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
            {can.edit && (
              <button className="btn small ghost rail-edit" onClick={() => setEditOrder(true)} title="Editar el orden" aria-label="Editar el orden">
                <Icon name="edit" />
              </button>
            )}
          </aside>
        )}
      </div>

      <CompartirCancion song={song} />

      {can.delete && <ConfirmarEliminar text="Eliminar canción" question={`¿Eliminar "${song.title}"?`}
        onConfirm={() => deleteSong(song.id)} onDone={() => navigate('/canciones')} />}
    </div>
  );
}

/** "½ tono", "1 tono", "1½ tonos"… a partir de semitonos. */
function enTonos(semitonos) {
  const enteros = Math.floor(semitonos / 2);
  const medio = semitonos % 2 === 1;
  if (!enteros) return '½ tono';
  return `${enteros}${medio ? '½' : ''} ${enteros === 1 && !medio ? 'tono' : 'tonos'}`;
}

/** Botón de capo: muestra cada traste con el tono en que se toca. */
function ElegirCapo({ capo, onChange, tono, steps, notation }) {
  const [abierto, setAbierto] = useState(false);
  const forma = (n) => (tono ? displayKey(tono, steps - n, notation) : '');
  return (
    <>
      <span className="transpose-title">Capo</span>
      <button type="button" className={`btn capo-boton ${capo ? 'activo' : ''}`} onClick={() => setAbierto(true)}>
        {capo ? `Traste ${capo}` : 'Sin capo'}{capo && tono ? <span className="capo-forma"> · {forma(capo)}</span> : null}
      </button>
      {capo > 0 && (
        <span className="muted small capo-nota">
          {tono ? `Tocas como en ${forma(capo)}, suena en ${forma(0)} · ` : ''}{enTonos(capo)} más abajo
        </span>
      )}
      {abierto && createPortal(
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Elegir capo" onClick={() => setAbierto(false)}>
          <div className="modal capo-hoja" onClick={(e) => e.stopPropagation()}>
            <h2>Capo</h2>
            <div className="capo-lista">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" className={`capo-opcion ${n === capo ? 'elegido' : ''}`}
                  onClick={() => { onChange(n); setAbierto(false); }}>
                  <span>{n ? `Traste ${n}` : 'Sin capo'}</span>
                  {tono && <strong>{forma(n)}</strong>}
                  {n > 0 && <span className="muted small">{enTonos(n)} ↓</span>}
                </button>
              ))}
            </div>
            <button type="button" className="btn ghost" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
