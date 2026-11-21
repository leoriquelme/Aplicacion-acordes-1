import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MAX_IGLESIAS, abrirIglesia, cleanCode, crearIglesia, olvidarIglesia, unirseAIglesia, useAuth,
} from '../lib/cloud.jsx';
import { keyOf } from '../lib/claves.js';
import Icon from './Icon.jsx';

/**
 * Mis iglesias: cambiar de iglesia, unirme con un código o crear una.
 * Máximo MAX_IGLESIAS en total (creadas + unidas).
 */
export default function MisIglesias({ actual = null }) {
  const { profile, user, setSession } = useAuth();
  const navigate = useNavigate();
  const name = profile?.name || user.displayName || '';
  const mias = Object.entries(profile?.churches || {}).map(([id, c]) => ({ id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  const lleno = mias.length >= MAX_IGLESIAS;
  const [abierto, setAbierto] = useState(mias.length ? '' : 'unirse');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alerta, setAlerta] = useState(false);
  // Al intentar unirse o crear una 4ª iglesia, se avisa del límite.
  const elegir = (que) => {
    setError('');
    if (lleno && abierto !== que) { setAlerta(true); setAbierto(''); return; }
    setAlerta(false);
    setAbierto(abierto === que ? '' : que);
  };

  const abrir = (r) => { setSession({ churchId: r.churchId, churchName: r.churchName, at: Date.now() }); navigate('/'); };
  const hacer = (fn) => async (...args) => {
    setBusy(true);
    setError('');
    try {
      abrir(await fn(...args));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Mis iglesias</h2>
      {mias.length === 0 && <p className="muted">Únete con un código o crea tu iglesia.</p>}
      {mias.length > 0 && (
        <div className="stack">
          {mias.map((c) => (c.id === actual ? (
            <div key={c.id} className="row gap iglesia-actual"><Icon name="church" /> <strong className="grow">{c.name}</strong> <span className="etiqueta bien">Abierta ahora</span></div>
          ) : (
            <div key={c.id} className="row gap">
              <button className="btn grow" disabled={busy} onClick={hacer(() => abrirIglesia(c.id, name))}>
                <Icon name="church" /> {actual ? `Cambiar a ${c.name}` : `Abrir ${c.name}`}
              </button>
              <button className="btn ghost small" title="Quitar de esta lista (no te saca de la iglesia)" onClick={() => olvidarIglesia(c.id)}>✕</button>
            </div>
          )))}
        </div>
      )}

      <div className="row gap wrap" style={{ marginTop: '0.8rem' }}>
        <button className={`btn ${abierto === 'unirse' ? 'primary' : ''}`} onClick={() => elegir('unirse')}>
          <Icon name="users" /> Unirme con un código
        </button>
        <button className={`btn ${abierto === 'crear' ? 'primary' : ''}`} onClick={() => elegir('crear')}>
          + Crear una iglesia
        </button>
      </div>
      {alerta && (
        <div className="alerta-limite" role="alert">
          <strong>Llegaste al límite de {MAX_IGLESIAS} iglesias.</strong> Para unirte o crear otra, primero sal de una
          (ábrela y ve a Ajustes → Salir de la iglesia).
          <button className="btn small ghost" onClick={() => setAlerta(false)}>Entendido</button>
        </div>
      )}
      {!lleno && abierto === 'unirse' && <Unirse busy={busy} onSubmit={hacer((code) => unirseAIglesia({ code, name, cuantas: mias.length }))} />}
      {!lleno && abierto === 'crear' && <Crear busy={busy} onSubmit={hacer((d) => crearIglesia({ ...d, name, cuantas: mias.length }))} />}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function Unirse({ busy, onSubmit }) {
  const [code, setCode] = useState('');
  return (
    <form className="nueva-iglesia" onSubmit={(e) => { e.preventDefault(); onSubmit(code); }}>
      <label>
        Código de acceso <span className="muted small">(pídeselo al Administrador de tu iglesia)</span>
        <input value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="Ej. KXMPRT" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="code-input" autoFocus />
      </label>
      <button className="btn primary" disabled={busy || code.length < 4}>{busy ? 'Uniéndote…' : 'Unirme'}</button>
    </form>
  );
}

function Crear({ busy, onSubmit }) {
  const [church, setChurch] = useState('');
  const [city, setCity] = useState('');
  const id = keyOf(church);
  return (
    <form className="nueva-iglesia" onSubmit={(e) => { e.preventDefault(); onSubmit({ church, city }); }}>
      <label>
        Nombre de la iglesia
        <input value={church} onChange={(e) => setChurch(e.target.value)} maxLength={60} placeholder="Ej. Iglesia Bautista Gracia" autoFocus />
      </label>
      {id && <p className="muted small" style={{ margin: 0 }}>Se llamará <strong>{church.trim().replace(/\s+/g, ' ').toUpperCase()}</strong>.</p>}
      <label>
        Ciudad o comuna <span className="muted small">(opcional)</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="Ej. Santiago" />
      </label>
      <button className="btn primary" disabled={busy || id.length < 3}>{busy ? 'Creando…' : 'Crear iglesia'}</button>
    </form>
  );
}
