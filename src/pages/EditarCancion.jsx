import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { KEYS, parseMeta, parseSong } from '../lib/chordpro.js';
import SectionButtons, { nextSectionName } from '../components/SectionButtons.jsx';
import SongView from '../components/SongView.jsx';

const PLANTILLA = `{c: Verso 1}
[G]Escribe aquí la [C]letra con los [G]acordes
[D]entre corchetes, justo antes de la [G]sílaba.

{soc}
[C]Este es el [G]coro
{eoc}`;

export default function EditarCancion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs, settings, saveSong, updateSettings } = useStore();
  const textRef = useRef(null);
  const pendingCursor = useRef(null);
  const existing = songs.find((s) => s.id === id);
  const [form, setForm] = useState(
    existing || { title: '', author: '', key: 'G', content: PLANTILLA }
  );
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Inserta "{c: Nombre}" donde está el cursor, empezando una sección nueva.
  const insertSection = (label) => {
    const ta = textRef.current;
    const v = form.content;
    const pos = ta ? ta.selectionStart : v.length;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    const at = pos > lineStart && v.slice(lineStart, pos).trim() ? v.indexOf('\n', pos) === -1 ? v.length : v.indexOf('\n', pos) : lineStart;
    const before = v.slice(0, at);
    const after = v.slice(at).replace(/^\n/, '');
    const name = nextSectionName(label, parseSong(v).map((s) => s.name));
    const prefix = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const insert = `${prefix}{c: ${name}}\n`;
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

  const customButtons = settings.sectionButtons || [];

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
    const newId = saveSong({ ...form, title: form.title.trim(), author: form.author.trim() });
    navigate(`/canciones/${newId}`);
  };

  return (
    <div className="page wide">
      <Link to={existing ? `/canciones/${existing.id}` : '/canciones'} className="back">← Volver</Link>
      <h1>{existing ? 'Editar canción' : 'Nueva canción'}</h1>
      <form onSubmit={submit} className="editor">
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
          <div className="field">
            <label htmlFor="letra" className="field-label">Letra y acordes</label>
            <SectionButtons
              custom={customButtons}
              onInsert={insertSection}
              onAddCustom={(n) => updateSettings({ sectionButtons: [...customButtons, n] })}
              onRemoveCustom={(n) => updateSettings({ sectionButtons: customButtons.filter((x) => x !== n) })}
            />
            <textarea id="letra" ref={textRef} value={form.content} onChange={onContent} rows={18} spellCheck={false} />
          </div>
          <details className="help">
            <summary>¿Cómo escribir los acordes?</summary>
            <ul>
              <li>Pon el acorde entre corchetes justo antes de la sílaba: <code>[G]Cuán grande es [C]Él</code></li>
              <li>Deja una línea en blanco para separar secciones. Se llaman solas "Verso 1", "Verso 2"…</li>
              <li>Usa los botones <strong>+ Verso</strong>, <strong>+ Coro</strong>, <strong>+ Puente</strong> para empezar una sección nueva donde está el cursor. Con <strong>+ Nuevo botón…</strong> creas los tuyos.</li>
              <li>También puedes escribir el nombre a mano al inicio de la sección <code>{'{c: Verso 2}'}</code>, <code>{'{c: Coro}'}</code> o <code>{'{c: Puente}'}</code></li>
              <li>Si el coro tiene líneas en blanco, enciérralo entre <code>{'{soc}'}</code> y <code>{'{eoc}'}</code>.</li>
              <li>Escribe cada sección una sola vez. El orden y las repeticiones se eligen después en "Orden de las secciones".</li>
              <li>Puedes escribir acordes como <code>[Am]</code>, <code>[D7]</code>, <code>[G/B]</code> o en latino: <code>[Sol]</code>, <code>[Lam]</code>.</li>
            </ul>
          </details>
          {error && <p className="error">{error}</p>}
          <div className="row gap">
            <button type="submit" className="btn primary">Guardar</button>
            <Link className="btn" to={existing ? `/canciones/${existing.id}` : '/canciones'}>Cancelar</Link>
          </div>
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
