import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { cleanCode, randomCode } from '../lib/cloud.jsx';
import Icon from './Icon.jsx';
import { descargar } from '../lib/descargar.js';

/** Código de acceso para entrar a la iglesia (solo el Administrador lo ve y lo cambia). */
export function CodigoAcceso() {
  const { can, getAccessCode, setAccessCode } = useStore();
  const [actual, setActual] = useState(null);
  const [nuevo, setNuevo] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!getAccessCode) return;
    getAccessCode().then((c) => { setActual(c); setNuevo(c); }).catch(() => setActual(''));
  }, [getAccessCode]);
  if (!can.users || !setAccessCode) return null;

  const guardar = async (code) => {
    try {
      await setAccessCode(code);
      setActual(code);
      setNuevo(code);
      setMsg(code ? '✓ Código guardado. Compártelo con los hermanos de tu iglesia. Quienes ya se unieron siguen dentro.' : '✓ Código quitado: nadie nuevo puede unirse hasta que pongas uno.');
    } catch (e) {
      setMsg(`No se pudo guardar: ${e.message.includes('permission') ? 'falta pegar las reglas nuevas en Firebase.' : e.message}`);
    }
  };

  return (
    <section className="card">
      <h2>Código de acceso</h2>
      <p className="muted small">
        Para unirse a la iglesia, cada hermano entra con su cuenta y escribe este código (o abre el link de invitación, que ya lo trae).
        Si lo cambias, quienes ya se unieron siguen dentro.
      </p>
      <p>Código actual: <strong className="codigo">{actual === null ? '…' : actual || 'sin código'}</strong></p>
      <div className="row gap wrap">
        <input className="code-input" value={nuevo} onChange={(e) => { setNuevo(cleanCode(e.target.value)); setMsg(''); }} placeholder="Ej. KXMPRT" maxLength={12} style={{ width: '10rem' }} aria-label="Nuevo código" />
        <button className="btn" onClick={() => { setNuevo(randomCode()); setMsg(''); }}>Generar al azar</button>
        <button className="btn primary" disabled={nuevo.length < 4 || nuevo === actual} onClick={() => guardar(nuevo)}>Guardar</button>
        {actual && <button className="btn ghost" onClick={() => guardar('')}>Quitar código (cerrar la iglesia)</button>}
      </div>
      {nuevo && nuevo.length < 4 && <p className="muted small">Mínimo 4 letras o números.</p>}
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}

/** Respaldo de la iglesia: descargar a un archivo y restaurarlo (solo el Administrador). */
export function Respaldo() {
  const { can, songs, events, church, restoreBackup } = useStore();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!can.users) return null;

  const descargar = () => {
    const data = { app: 'cancionero', version: 1, church: church?.name, fecha: new Date().toISOString(), songs, events };
    descargar(`respaldo-${(church?.name || 'iglesia').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    setMsg(`✓ Descargado: ${songs.length} canciones y ${events.length} eventos.`);
  };

  const restaurar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!window.confirm(`¿Restaurar ${data.songs?.length || 0} canciones y ${data.events?.length || 0} eventos de este respaldo? Las que tengan el mismo id se reemplazan; las demás no se tocan.`)) return;
      setBusy(true);
      const r = await restoreBackup(data);
      setMsg(`✓ Restaurado: ${r.songs} canciones y ${r.events} eventos.`);
    } catch (err) {
      setMsg(`No se pudo restaurar: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Respaldo</h2>
      <p className="muted small">
        Descarga un archivo con todas las canciones y eventos de la iglesia. Guárdalo en tu computador, en Google Drive o en tu correo.
        Si algo se borra por error, con "Restaurar" lo vuelves a subir.
      </p>
      <div className="row gap wrap">
        <button className="btn" onClick={descargar}><Icon name="download" /> Descargar respaldo</button>
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="upload" /> {busy ? 'Restaurando…' : 'Restaurar respaldo'}</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restaurar} />
      </div>
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
