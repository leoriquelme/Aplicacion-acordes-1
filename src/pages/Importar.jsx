import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { analyzeSong, buildSong } from '../lib/importar.js';
import SectionAdjuster from '../components/SectionAdjuster.jsx';
import { parseSong } from '../lib/chordpro.js';
import SongView from '../components/SongView.jsx';

const EJEMPLO = `Intro: G  D  Em  C

Verso 1
G                D
Escribe o pega aquí la letra
Em               C
con los acordes en la línea de arriba

Coro
C          G
Así se ve un coro
D               Em
y la app lo reconoce`;

export default function Importar() {
  const navigate = useNavigate();
  const { settings } = useStore();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [raw, setRaw] = useState('');
  const [state, setState] = useState(null); // secciones detectadas, se pueden ajustar a mano

  const onPaste = (text) => {
    setRaw(text);
    setState(text.trim() ? analyzeSong(text) : null);
  };
  const result = state ? { ...buildSong(state.sections, state.order), key: state.key } : null;
  const sections = result ? parseSong(result.content) : [];

  const usar = () => {
    navigate('/canciones/nueva', {
      state: {
        imported: {
          title: title.trim(),
          author: author.trim(),
          key: result.key || 'G',
          content: result.content,
          order: result.order,
        },
      },
    });
  };

  return (
    <div className="page wide">
      <Link to="/canciones/nueva" className="back">← Volver</Link>
      <h1>Importar alabanza</h1>
      <div className="card import-steps">
        <ol>
          <li>Abre la canción en la página web (por ejemplo LaCuerda o Cifra Club).</li>
          <li>Selecciona la letra con los acordes, cópiala (Ctrl+C) y pégala abajo (Ctrl+V).</li>
          <li>La app pone los acordes entre corchetes y detecta intro, versos, coros y puentes. Revisa la vista previa y pulsa <strong>Usar esta canción</strong>.</li>
        </ol>
      </div>

      <div className="editor">
        <div className="editor-fields">
          <div className="row gap wrap">
            <label className="grow">
              Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la alabanza" />
            </label>
            <label className="grow">
              Autor
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Opcional" />
            </label>
          </div>
          <label>
            Pega aquí la canción
            <textarea
              className="mono"
              rows={20}
              value={raw}
              onChange={(e) => onPaste(e.target.value)}
              placeholder={EJEMPLO}
              spellCheck={false}
            />
          </label>
          {state && (
            <details className="card adjust-card" open>
              <summary><strong>Ajustar secciones</strong></summary>
              <SectionAdjuster state={state} onChange={setState} />
            </details>
          )}
          <div className="row gap wrap">
            <button className="btn primary" disabled={!result || !result.content} onClick={usar}>
              Usar esta canción
            </button>
            {raw && <button className="btn ghost" onClick={() => onPaste('')}>Borrar</button>}
          </div>
          <p className="muted small">
            Después podrás corregir cualquier detalle en el editor antes de guardar.
          </p>
        </div>

        <div className="editor-preview">
          <div className="muted small">Vista previa</div>
          <h2>{title || 'Sin título'}</h2>
          {result ? (
            <>
              <p className="muted small">
                {sections.length} secciones detectadas{result.key ? ` · Tono ${result.key}` : ''}
                {result.order && <> · Orden: {result.order.join(' → ')}</>}
              </p>
              <SongView content={result.content} songKey={result.key} order={result.order} settings={settings} fontSize={18} />
            </>
          ) : (
            <p className="muted">Aquí verás cómo queda la canción.</p>
          )}
        </div>
      </div>
    </div>
  );
}
