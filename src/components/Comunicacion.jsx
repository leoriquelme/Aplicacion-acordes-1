import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLES, useStore } from '../lib/store.jsx';
import { APP_VERSION } from '../lib/version.js';
import ConfirmX from './ConfirmX.jsx';

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Estado: conexión, perfil, iglesia, si funciona sin internet y versión. */
export function EstadoCard() {
  const { mode, church, me, role, songs } = useStore();
  const online = useOnline();
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    navigator.serviceWorker?.getRegistration?.().then((r) => setOfflineReady(Boolean(r?.active))).catch(() => {});
  }, []);
  return (
    <section className="card estado">
      <h2>Estado</h2>
      <ul className="estado-list">
        <li><span className={`dot-status ${online ? 'ok' : 'off'}`} /> {online ? 'Con internet' : 'Sin internet: puedes seguir viendo tus canciones'}</li>
        {mode === 'cloud' ? (
          <>
            <li>⛪ Iglesia: <strong>{church?.name}</strong></li>
            <li>👤 {me?.name || '—'} · <strong>{ROLES[role]?.label || 'Colaborador'}</strong></li>
          </>
        ) : (
          <li>💻 Usando la app solo en este equipo</li>
        )}
        <li>🎵 {songs.length} {songs.length === 1 ? 'canción' : 'canciones'} {offlineReady ? 'guardadas para usar sin internet' : ''}</li>
        <li>📱 {instalada() ? 'Instalada como app' : 'Puedes instalarla como app (ver abajo)'}</li>
        <li className="muted small">Versión {APP_VERSION}</li>
      </ul>
      <Link className="btn apoyo-btn" to="/apoyo">🙏 Apoyo: orar y donar</Link>
    </section>
  );
}

/** Sugerir una corrección (todos) y revisar las sugerencias (Administrador y Director). */
export function SugerenciasCard() {
  const { mode, songs, can, suggestions = [], sendSuggestion, resolveSuggestion } = useStore();
  const [text, setText] = useState('');
  const [songId, setSongId] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  if (mode !== 'cloud') {
    return (
      <section className="card">
        <h2>Sugerir una corrección</h2>
        <p className="muted">Para enviar sugerencias a los directores, entra con tu iglesia.</p>
      </section>
    );
  }
  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const song = songs.find((s) => s.id === songId);
      await sendSuggestion({ text, songId, songTitle: song?.title || '' });
      setText('');
      setSongId('');
      setMsg('✓ Enviada. Gracias, los directores la revisarán.');
    } catch {
      setMsg('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
    }
    setSending(false);
  };
  const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  return (
    <section className="card">
      <h2>Sugerir una corrección</h2>
      <p className="muted small">¿Un acorde mal puesto, una letra con error o una idea para la app? Escríbelo aquí y le llega al Administrador y a los Directores.</p>
      <label>
        Canción (opcional)
        <select value={songId} onChange={(e) => setSongId(e.target.value)}>
          <option value="">— Sobre la app en general —</option>
          {sorted.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </label>
      <label>
        Tu mensaje
        <textarea rows={3} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setMsg(''); }} placeholder="Ej. En el coro, el segundo acorde es Em, no G." />
      </label>
      <div className="row gap">
        <button className="btn primary" disabled={!text.trim() || sending} onClick={send}>{sending ? 'Enviando…' : 'Enviar sugerencia'}</button>
        {msg && <span className="muted small">{msg}</span>}
      </div>

      {can.edit && (
        <div className="sugerencias">
          <h3>Sugerencias recibidas {suggestions.length > 0 && <span className="badge">{suggestions.length}</span>}</h3>
          {suggestions.length === 0 ? (
            <p className="muted small">No hay sugerencias pendientes.</p>
          ) : (
            <ul>
              {suggestions.map((s) => (
                <li key={s.id}>
                  <div className="grow">
                    <div className="small muted">
                      {s.name || 'Alguien'} · {new Date(s.at).toLocaleDateString('es')}
                      {s.songTitle && <> · {songs.some((x) => x.id === s.songId) ? <Link to={`/canciones/${s.songId}`}>{s.songTitle}</Link> : s.songTitle}</>}
                    </div>
                    <div className="sug-text">{s.text}</div>
                  </div>
                  <ConfirmX className="btn small" label="Marcar como resuelta" text="✓ Resuelta" armedText="¿Confirmar?" onConfirm={() => resolveSuggestion(s.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
