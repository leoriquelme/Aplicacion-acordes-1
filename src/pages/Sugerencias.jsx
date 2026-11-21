import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import ConfirmX from '../components/ConfirmX.jsx';
import Icon from '../components/Icon.jsx';

/** Sugerencias para la iglesia: le llegan solo al Administrador de la iglesia. */
export default function Sugerencias() {
  const { mode, can, people = [], suggestions = [], sendSuggestion, resolveSuggestion } = useStore();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendSuggestion({ text });
      setText('');
      setMsg('✓ Enviada al Administrador de tu iglesia. ¡Gracias!');
    } catch {
      setMsg('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
    }
    setSending(false);
  };

  return (
    <div className="page">
      <Link to="/ajustes" className="back">← Ajustes</Link>
      <h1><Icon name="bulb" /> Sugerencias para la iglesia</h1>
      {mode !== 'cloud' ? (
        <p className="card muted">Para enviar sugerencias, entra con tu iglesia.</p>
      ) : (
        <section className="card">
          <p className="muted small" style={{ marginTop: 0 }}>Tu sugerencia le llega al Administrador de tu iglesia (por ejemplo, una corrección en una canción o una idea para los servicios).</p>
          <textarea rows={5} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setMsg(''); }} placeholder="Tu idea o problema…" aria-label="Tu sugerencia" />
          <div className="row gap wrap" style={{ marginTop: '0.6rem' }}>
            <button className="btn primary" disabled={!text.trim() || sending} onClick={send}>{sending ? 'Enviando…' : 'Enviar sugerencia'}</button>
            {msg && <span className="muted small">{msg}</span>}
          </div>
        </section>
      )}

      {can.users && mode === 'cloud' && (
        <section className="card sugerencias">
          <h2>Sugerencias recibidas {suggestions.length > 0 && <span className="badge">{suggestions.length}</span>}</h2>
          {suggestions.length === 0 ? (
            <p className="muted small">No hay sugerencias pendientes.</p>
          ) : (
            <ul>
              {suggestions.map((s) => (
                <li key={s.id}>
                  <div className="grow">
                    <div className="small muted">
                      {people.find((p) => p.key === s.personKey)?.name || s.name || 'Alguien'} · {new Date(s.at).toLocaleDateString('es')}
                      {s.songTitle && <> · {s.songTitle}</>}
                    </div>
                    <div className="sug-text">{s.text}</div>
                  </div>
                  <ConfirmX className="btn small" label="Marcar como resuelta" text="✓ Resuelta" armedText="¿Confirmar?" onConfirm={() => resolveSuggestion(s.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
