import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { KEYS, parseMeta } from '../lib/chordpro.js';
import SongView from '../components/SongView.jsx';

const PLANTILLA = `{c: Estrofa 1}
[G]Escribe aquí la [C]letra con los [G]acordes
[D]entre corchetes, justo antes de la [G]sílaba.

{soc}
[C]Este es el [G]coro
{eoc}`;

export default function EditarCancion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs, settings, saveSong } = useStore();
  const existing = songs.find((s) => s.id === id);
  const [form, setForm] = useState(
    existing || { title: '', author: '', key: 'G', content: PLANTILLA }
  );
  const [error, setError] = useState('');

  if (id && !existing) {
    return (
      <div className="page">
        <p>No se encontró la canción.</p>
        <Link to="/canciones">← Volver a canciones</Link>
      </div>
    );
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

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
          <label>
            Letra y acordes (formato ChordPro)
            <textarea value={form.content} onChange={onContent} rows={18} spellCheck={false} />
          </label>
          <details className="help">
            <summary>¿Cómo escribir los acordes?</summary>
            <ul>
              <li>Pon el acorde entre corchetes justo antes de la sílaba: <code>[G]Cuán grande es [C]Él</code></li>
              <li>Deja una línea en blanco para separar estrofas.</li>
              <li>Marca el coro con <code>{'{soc}'}</code> al inicio y <code>{'{eoc}'}</code> al final.</li>
              <li>Agrega un título de sección con <code>{'{c: Estrofa 2}'}</code></li>
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
