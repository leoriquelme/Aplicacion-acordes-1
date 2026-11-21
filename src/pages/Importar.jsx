import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { analyzeSong, buildSong } from '../lib/importar.js';
import SectionAdjuster from '../components/SectionAdjuster.jsx';
import { parseSong } from '../lib/chordpro.js';
import SongView from '../components/SongView.jsx';
import { importFromLink } from '../lib/importarLink.js';

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
  const { settings, can } = useStore();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [raw, setRaw] = useState('');
  const [state, setState] = useState(null); // secciones detectadas, se pueden ajustar a mano
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkMsg, setLinkMsg] = useState(null); // { ok, text }

  const traer = async () => {
    setLoading(true);
    setLinkMsg(null);
    try {
      const song = await importFromLink(link);
      if (song.title && !title.trim()) setTitle(song.title);
      if (song.author && !author.trim()) setAuthor(song.author);
      onPaste(song.text);
      setLinkMsg({ ok: true, text: 'Listo. Revisa la vista previa y corrige lo que haga falta.' });
    } catch (e) {
      setLinkMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pegarLink = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setLink(t.trim());
    } catch {
      setLinkMsg({ ok: false, text: 'Tu navegador no dejó pegar automáticamente. Mantén presionado el cuadro y elige Pegar.' });
    }
  };

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

  if (!can.edit) {
    return <div className="page"><p>Tu perfil no permite agregar canciones.</p><Link to="/canciones">← Volver</Link></div>;
  }

  return (
    <div className="page wide">
      <Link to="/canciones/nueva" className="back">← Volver</Link>
      <h1>Importar alabanza</h1>
      <div className="card import-link">
        <strong>Desde un link de LaCuerda</strong>
        <p className="muted small">
          Abre la alabanza en LaCuerda, copia el link (botón Compartir → Copiar, o desde la barra de direcciones) y pégalo aquí.
          La app trae solo la letra con los acordes.
        </p>
        <div className="row gap wrap">
          <input
            className="grow"
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && link.trim() && !loading) traer(); }}
            placeholder="https://acordes.lacuerda.net/…"
          />
          {!link && navigator.clipboard?.readText && (
            <button className="btn ghost" type="button" onClick={pegarLink}>Pegar</button>
          )}
          <button className="btn primary" type="button" disabled={!link.trim() || loading} onClick={traer}>
            {loading ? 'Buscando…' : 'Traer letra'}
          </button>
        </div>
        {linkMsg && <p className={`small ${linkMsg.ok ? 'ok' : 'error'}`}>{linkMsg.text}</p>}
      </div>

      <details className="card import-steps">
        <summary><strong>O copia y pega el texto</strong></summary>
        <ol>
          <li>Abre la canción en la página web (por ejemplo LaCuerda o Cifra Club).</li>
          <li>Selecciona la letra con los acordes, cópiala (Ctrl+C) y pégala abajo (Ctrl+V).</li>
          <li>La app pone los acordes entre corchetes y detecta intro, versos, coros y puentes. Revisa la vista previa y pulsa <strong>Usar esta canción</strong>.</li>
        </ol>
      </details>

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
