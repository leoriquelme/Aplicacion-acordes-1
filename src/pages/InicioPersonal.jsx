import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  abrirIglesia, cleanCode, crearIglesia, olvidarIglesia, soySuperAdmin, unirseAIglesia, useAuth,
} from '../lib/cloud.jsx';
import { useStore } from '../lib/store.jsx';
import { keyOf } from '../lib/claves.js';
import Icon from '../components/Icon.jsx';
import VersiculoDelDia from '../components/VersiculoDelDia.jsx';

/** Inicio sin iglesia abierta: mis iglesias, unirme con código, crear una iglesia y mis canciones. */
export default function InicioPersonal() {
  const { profile, setSession, user } = useAuth();
  const { songs, songsLoaded } = useStore();
  const name = profile?.name || user.displayName || '';
  const mias = Object.entries(profile?.churches || {}).map(([id, c]) => ({ id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  const [abierto, setAbierto] = useState(mias.length ? '' : 'unirse');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [esSuper, setEsSuper] = useState(false);
  useEffect(() => { soySuperAdmin().then(setEsSuper); }, []);

  const abrir = (r) => setSession({ churchId: r.churchId, churchName: r.churchName, at: Date.now() });
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
    <div className="page">
      <section className="card bloque-iglesia"><div className="bloque-icono"><Icon name="user" /></div><div>
        <h1>Hola{name ? `, ${name.split(' ')[0]}` : ''}</h1>
        <p className="muted">Aquí tienes tus canciones. Para ver los eventos y el equipo de tu iglesia, únete con el código que te dé su Administrador.</p>
      </div></section>
      <VersiculoDelDia />

      {mias.length > 0 && (
        <section className="card">
          <h2>Mis iglesias</h2>
          <div className="stack">
            {mias.map((c) => (
              <div key={c.id} className="row gap">
                <button className="btn primary grow" disabled={busy} onClick={hacer(() => abrirIglesia(c.id, name))}>
                  <Icon name="church" /> Entrar a {c.name}
                </button>
                <button className="btn ghost small" title="Quitar de esta lista" onClick={() => olvidarIglesia(c.id)}>✕</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="row gap wrap">
          <button className={`btn ${abierto === 'unirse' ? 'primary' : ''}`} onClick={() => setAbierto(abierto === 'unirse' ? '' : 'unirse')}>
            <Icon name="users" /> Unirme a una iglesia
          </button>
          <button className={`btn ${abierto === 'crear' ? 'primary' : ''}`} onClick={() => setAbierto(abierto === 'crear' ? '' : 'crear')}>
            + Crear una iglesia
          </button>
        </div>
        {abierto === 'unirse' && <Unirse busy={busy} onSubmit={hacer((d) => unirseAIglesia({ ...d, name }))} />}
        {abierto === 'crear' && <Crear busy={busy} onSubmit={hacer((d) => crearIglesia({ ...d, name }))} />}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Mis canciones</h2>
        <p className="muted">
          {!songsLoaded ? 'Cargando…' : songs.length ? `Tienes ${songs.length} ${songs.length === 1 ? 'canción guardada' : 'canciones guardadas'} en tu cuenta.` : 'Todavía no tienes canciones. Agrega himnos de ejemplo, copia de las que comparten las iglesias, o escribe la tuya.'}
        </p>
        <div className="row gap wrap">
          <Link className="btn" to="/canciones"><Icon name="music" /> Ver mis canciones</Link>
          <Link className="btn" to="/canciones/biblioteca"><Icon name="globe" /> Canciones de las iglesias</Link>
        </div>
      </section>

      {esSuper && <Link className="btn" to="/super"><Icon name="sliders" /> Super Admin</Link>}
    </div>
  );
}

function Unirse({ busy, onSubmit }) {
  const [church, setChurch] = useState('');
  const [code, setCode] = useState('');
  return (
    <form className="nueva-iglesia" onSubmit={(e) => { e.preventDefault(); onSubmit({ church, code }); }}>
      <label>
        Nombre de la iglesia
        <input value={church} onChange={(e) => setChurch(e.target.value)} maxLength={60} placeholder="Ej. Iglesia Bautista Gracia" autoFocus />
      </label>
      <label>
        Código de acceso <span className="muted small">(pídeselo al Administrador de tu iglesia)</span>
        <input value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="Ej. KXMPRT" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="code-input" />
      </label>
      <button className="btn primary" disabled={busy || !keyOf(church) || code.length < 4}>{busy ? 'Uniéndote…' : 'Unirme'}</button>
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
      {id && <p className="muted small" style={{ margin: 0 }}>Se llamará <strong>{church.trim().replace(/\s+/g, ' ').toUpperCase()}</strong>. No puede haber dos iglesias con el mismo nombre (no importan mayúsculas ni tildes).</p>}
      <label>
        Ciudad o comuna <span className="muted small">(opcional)</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="Ej. Santiago" />
      </label>
      <p className="muted small" style={{ margin: 0 }}>Serás su Administrador. Te daremos un código para que los hermanos se unan.</p>
      <button className="btn primary" disabled={busy || id.length < 3}>{busy ? 'Creando…' : 'Crear iglesia'}</button>
    </form>
  );
}
