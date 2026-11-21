import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import Icon from './Icon.jsx';

/** Compartir (o dejar de compartir) una canción en la biblioteca de todas las iglesias. */
export default function CompartirCancion({ song }) {
  const { can, myShares, shareSong, unshareSong } = useStore();
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState('');
  if (!shareSong || !can.edit) return null;
  const shared = myShares.find((x) => x.songId === song.id);
  const outdated = shared && (shared.content !== song.content || shared.title !== song.title || shared.key !== (song.key || ''));

  const run = async (fn, done) => {
    try { await fn(); setMsg(done); } catch (e) { setMsg(`No se pudo: ${e.message}`); }
  };

  if (shared) {
    return (
      <div className="share-box card">
        <span><Icon name="globe" /> <strong>Compartida</strong> con otras iglesias.</span>
        {outdated && (
          <button className="btn small" onClick={() => run(() => shareSong(song), '✓ Copia compartida actualizada.')}>
            ⟳ Actualizar la copia compartida
          </button>
        )}
        <button className="btn small ghost danger" onClick={() => run(() => unshareSong(song.id), 'Ya no está compartida.')}>
          Dejar de compartir
        </button>
        {msg && <span className="small muted">{msg}</span>}
      </div>
    );
  }

  return (
    <div className="share-box">
      {!open ? (
        <button className="btn small ghost" onClick={() => setOpen(true)}><Icon name="globe" /> Compartir con otras iglesias</button>
      ) : (
        <div className="card">
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            Es de dominio público o tenemos permiso del autor.
          </label>
          <div className="row gap">
            <button
              className="btn primary small"
              disabled={!ok}
              onClick={() => run(async () => { await shareSong(song); setOpen(false); setOk(false); }, '✓ Compartida.')}
            >
              Compartir
            </button>
            <button className="btn small ghost" onClick={() => { setOpen(false); setOk(false); }}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <span className="small muted">{msg}</span>}
    </div>
  );
}
