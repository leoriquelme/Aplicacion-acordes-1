import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { KEYS, customBases, parseMeta, parseSong, syncOrder } from '../lib/chordpro.js';
import SectionButtons from '../components/SectionButtons.jsx';
import { autodetect } from '../lib/importar.js';
import SongView from '../components/SongView.jsx';
import Icon from '../components/Icon.jsx';
import { esLinkSpotify } from '../lib/spotify.js';
import { esLinkYouTube } from '../lib/youtube.js';
import SpotifyLogo from '../components/SpotifyLogo.jsx';
import YouTubeLogo from '../components/YouTubeLogo.jsx';

const BORRADOR = 'cancionero-borrador';
const pick = (f) => ({ title: f.title, author: f.author, key: f.key, content: f.content, bpm: f.bpm || '', compas: f.compas || '', spotify: f.spotify || '', youtube: f.youtube || '' });
function leerBorrador() {
  try {
    const b = JSON.parse(localStorage.getItem(BORRADOR));
    return b && b.content ? b : null;
  } catch {
    return null;
  }
}
function guardarBorrador(f) {
  try { localStorage.setItem(BORRADOR, JSON.stringify(pick(f))); } catch { /* sin espacio */ }
}
function borrarBorrador() {
  try { localStorage.removeItem(BORRADOR); } catch { /* nada */ }
}

const PLANTILLA = `[VERSO]
[G]Escribe aquí la [C]letra con los [G]acordes
[D]entre corchetes, justo antes de la [G]sílaba.

[CORO]
[C]Este es el [G]coro`;

export default function EditarCancion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { songs, settings, saveSong, can } = useStore();
  const textRef = useRef(null);
  const pendingCursor = useRef(null);
  const existing = songs.find((s) => s.id === id);
  const [form, setForm] = useState(
    () => existing || location.state?.imported || (!id && leerBorrador()) || { title: '', author: '', key: 'G', content: PLANTILLA }
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [detectMsg, setDetectMsg] = useState('');
  const [verMultimedia, setVerMultimedia] = useState(false);
  const lastSaved = useRef(existing ? JSON.stringify(pick(existing)) : null);

  // Canción existente: los cambios se guardan solos, un momento después de dejar de escribir.
  // Canción nueva: se guarda un borrador en este equipo hasta pulsar "Guardar".
  useEffect(() => {
    if (!can.edit) return undefined;
    if (!existing) {
      if (!id) guardarBorrador(form);
      return undefined;
    }
    const now = JSON.stringify(pick(form));
    if (now === lastSaved.current) return undefined;
    setSaved('Cambios sin guardar…');
    const t = setTimeout(() => {
      if (!form.title.trim()) {
        setSaved('Escribe un título para guardar.');
        return;
      }
      saveSong({ ...existing, ...pick(form), order: syncOrder(existing.order, existing.content, form.content), title: form.title.trim(), author: form.author.trim() });
      lastSaved.current = now;
      setSaved('✓ Guardado');
    }, 900);
    return () => clearTimeout(t);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Inserta "[NOMBRE]" donde está el cursor, empezando una sección nueva.
  const insertSection = (name) => {
    const ta = textRef.current;
    const v = form.content;
    const pos = ta ? ta.selectionStart : v.length;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    const at = pos > lineStart && v.slice(lineStart, pos).trim() ? v.indexOf('\n', pos) === -1 ? v.length : v.indexOf('\n', pos) : lineStart;
    const before = v.slice(0, at);
    const after = v.slice(at).replace(/^\n/, '');
    const prefix = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const insert = `${prefix}[${name}]\n`;
    const content = before + insert + after;
    setForm((f) => ({ ...f, content }));
    pendingCursor.current = before.length + insert.length;
  };

  // Después de insertar, deja el cursor listo para escribir la nueva sección.
  useLayoutEffect(() => {
    const ta = textRef.current;
    if (pendingCursor.current === null || !ta) return;
    ta.focus();
    ta.setSelectionRange(pendingCursor.current, pendingCursor.current);
    pendingCursor.current = null;
  }, [form.content]);

  const sectionNames = parseSong(form.content).map((s) => s.name);

  if (!can.edit) {
    return <div className="page"><p>Tu perfil no permite editar canciones.</p><Link to="/canciones">← Volver</Link></div>;
  }

  if (id && !existing) {
    return (
      <div className="page">
        <p>No se encontró la canción.</p>
        <Link to="/canciones">← Volver a canciones</Link>
      </div>
    );
  }


  const onContent = (e) => {
    const content = e.target.value;
    // Si se pega una canción con {title:}, {artist:} o {key:}, se usan esos datos.
    const meta = parseMeta(content);
    setForm((f) => ({
      ...f,
      content,
      title: f.title || meta.title || '',
      author: f.author || meta.author || '',
      key: meta.key && !f.key ? meta.key : f.key,
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('La canción necesita un título.');
      return;
    }
    const newId = saveSong({ ...(existing || {}), ...form, ...(existing ? { order: syncOrder(existing.order, existing.content, form.content) } : {}), title: form.title.trim(), author: form.author.trim() });
    if (!existing) borrarBorrador();
    navigate(`/canciones/${newId}`);
  };

  return (
    <div className="page wide">
      <div className="editor-barra">
        <Link to={existing ? `/canciones/${existing.id}` : '/canciones'} className="barra-btn atras" aria-label="Volver">‹</Link>
        <div className="editor-barra-titulo">
          <span className="muted small">{existing ? 'Editar canción' : 'Nueva canción'}</span>
          <strong>{form.title.trim() || 'Sin título'}</strong>
        </div>
        <button type="submit" form="editor-cancion" className="btn primary">{existing ? 'Listo' : 'Crear'}</button>
      </div>
      <form id="editor-cancion" onSubmit={submit} className="editor">
        <div className="editor-fields">
          <label>
            Título
            <input value={form.title} onChange={set('title')} placeholder="Ej. Cuán grande es Él" />
          </label>
          <div className="row gap">
            <label className="grow">
              Autor
              <input value={form.author} onChange={set('author')} placeholder="Opcional" />
            </label>
            <label>
              Tono
              <select value={form.key} onChange={set('key')}>
                <option value="">—</option>
                {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
          <div className="row gap">
            <label>
              Tempo (BPM)
              <input
                type="number" min="30" max="260" inputMode="numeric" style={{ width: '7rem' }}
                value={form.bpm || ''}
                onChange={(e) => setForm((f) => ({ ...f, bpm: e.target.value ? Math.min(260, Math.max(0, Number(e.target.value))) : '' }))}
                placeholder="Ej. 72"
              />
            </label>
            <label className="grow">
              Compás / estilo
              <input list="compases" value={form.compas || ''} onChange={(e) => setForm((f) => ({ ...f, compas: e.target.value.slice(0, 30) }))} placeholder="Ej. 4/4 balada" />
              <datalist id="compases">
                {['4/4', '3/4', '6/8', '2/4', '4/4 balada', '4/4 rápido', '6/8 vals', 'Rock', 'Pop', 'Ranchera', 'Cumbia'].map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
          </div>
          <div className="multimedia">
            <button type="button" className={`btn small multimedia-btn ${verMultimedia ? 'activo' : ''}`} onClick={() => setVerMultimedia((v) => !v)} aria-expanded={verMultimedia}>
              <Icon name="play" /> Multimedia
              {(form.spotify || form.youtube) && (
                <span className="multimedia-logos">
                  {form.spotify && <SpotifyLogo size={16} />}
                  {form.youtube && <YouTubeLogo size={16} />}
                </span>
              )}
              <span className="multimedia-flecha" aria-hidden="true">{verMultimedia ? '▴' : '▾'}</span>
            </button>
            {verMultimedia && (
              <div className="multimedia-panel">
                <label>
                  <span className="multimedia-label"><SpotifyLogo size={16} /> Link de Spotify</span>
                  <input
                    type="url" inputMode="url"
                    value={form.spotify || ''}
                    onChange={(e) => setForm((f) => ({ ...f, spotify: e.target.value.trim().slice(0, 300) }))}
                    placeholder="Spotify → Compartir → Copiar enlace"
                  />
                  {!esLinkSpotify(form.spotify) && <span className="error small">Ese link no parece de Spotify. Debe empezar con https://open.spotify.com/…</span>}
                </label>
                <label>
                  <span className="multimedia-label"><YouTubeLogo size={16} /> Link de YouTube</span>
                  <input
                    type="url" inputMode="url"
                    value={form.youtube || ''}
                    onChange={(e) => setForm((f) => ({ ...f, youtube: e.target.value.trim().slice(0, 300) }))}
                    placeholder="YouTube → Compartir → Copiar enlace"
                  />
                  {!esLinkYouTube(form.youtube) && <span className="error small">Ese link no parece de un video de YouTube.</span>}
                </label>
                <p className="muted small">Los dos son opcionales. Aparecen como botones en la canción y en el servicio.</p>
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="letra" className="field-label">Letra y acordes</label>
            <div className="row gap wrap between">
              <SectionButtons existingNames={sectionNames} customBases={customBases(form.content)} onInsert={insertSection} />
              <button
                type="button"
                className="btn small"
                title="Convierte acordes escritos arriba de la letra (sin corchetes) al formato [G]"
                onClick={() => {
                  const r = autodetect(form.content);
                  if (!r.chords && !r.headers) {
                    setDetectMsg('No encontré acordes sin corchetes. La canción ya está lista.');
                  } else {
                    setForm((f) => ({ ...f, content: r.content }));
                    const partes = [];
                    if (r.chords) partes.push(`${r.chords} ${r.chords === 1 ? 'línea de acordes' : 'líneas de acordes'}`);
                    if (r.headers) partes.push(`${r.headers} ${r.headers === 1 ? 'título de sección' : 'títulos de sección'}`);
                    setDetectMsg(`✓ Listo: convertí ${partes.join(' y ')}. Revisa la vista previa.`);
                  }
                }}
              >
                <Icon name="guitar" /> Autodetectar acordes
              </button>
              {!existing && (
                <Link className="btn small primary" to="/canciones/importar">⤓ Importar desde la web</Link>
              )}
            </div>
            {detectMsg && <p className={`small ${detectMsg.startsWith('✓') ? 'ok' : 'muted'}`} style={{ margin: 0 }}>{detectMsg}</p>}
            <textarea id="letra" ref={textRef} value={form.content} onChange={onContent} rows={18} spellCheck={false} />
          </div>
          <details className="help">
            <summary>Ayuda</summary>
            <ul>
              <li>Sección: <code>[CORO]</code> sola en una línea; termina con una línea vacía.</li>
              <li>Acorde antes de la sílaba: <code>[G]Cuán grande es [C]Él</code></li>
              <li>Cada sección una vez; el orden se elige después.</li>
            </ul>
          </details>
          {error && <p className="error">{error}</p>}
          {(!existing || saved) && (
            <div className="row gap">
              {!existing && <Link className="btn" to="/canciones" onClick={borrarBorrador}>Cancelar</Link>}
              {saved && <span className={`small ${saved.startsWith('✓') ? 'ok' : 'muted'}`}>{saved}</span>}
            </div>
          )}
        </div>
        <div className="editor-preview">
          <div className="muted small">Vista previa</div>
          <h2>{form.title || 'Sin título'}</h2>
          <SongView content={form.content} songKey={form.key} settings={settings} fontSize={18} />
        </div>
      </form>
    </div>
  );
}
