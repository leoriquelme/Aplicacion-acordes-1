import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { enviarSugerencia } from '../lib/cloud.jsx';
import Icon from '../components/Icon.jsx';

/** Sugerir mejoras: le llegan solo al encargado del Cancionero (Super Admin), no a la iglesia. */
export default function Sugerencias() {
  const { mode, me, church } = useStore();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await enviarSugerencia({ text, name: me?.name || '', churchId: church?.id || '', churchName: church?.name || '' });
      setText('');
      setMsg('✓ Enviada al equipo del Cancionero. ¡Gracias!');
    } catch {
      setMsg('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
    }
    setSending(false);
  };

  return (
    <div className="page">
      <Link to="/ajustes" className="back">← Ajustes</Link>
      <h1><Icon name="bulb" /> Sugerir mejoras</h1>
      {mode !== 'cloud' && mode !== 'personal' ? (
        <p className="card muted">Para enviar sugerencias, entra con tu cuenta.</p>
      ) : (
        <section className="card">
          <p className="muted small" style={{ marginTop: 0 }}>Tu sugerencia le llega al equipo que hace el Cancionero (por ejemplo, una idea para la app o algo que no funciona bien). No la ven los administradores de tu iglesia.</p>
          <textarea rows={5} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setMsg(''); }} placeholder="Tu idea o problema…" aria-label="Tu sugerencia" />
          <div className="row gap wrap" style={{ marginTop: '0.6rem' }}>
            <button className="btn primary" disabled={!text.trim() || sending} onClick={send}>{sending ? 'Enviando…' : 'Enviar sugerencia'}</button>
            {msg && <span className="muted small">{msg}</span>}
          </div>
        </section>
      )}
    </div>
  );
}
