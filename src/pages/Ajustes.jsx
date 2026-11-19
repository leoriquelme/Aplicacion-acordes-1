import { useRef, useState } from 'react';
import { readLocalData, useStore } from '../lib/store.jsx';
import SongView from '../components/SongView.jsx';
import AgregarEjemplos from '../components/AgregarEjemplos.jsx';
import { AjustesFinal, IglesiaBoton, PerfilCard } from '../components/Comunicacion.jsx';
import InstalarCard from '../components/InstalarCard.jsx';

const MUESTRA = '[G]Cuán grande es [C]Él, [G]cuán grande es [D]Él';

export default function Ajustes() {
  const store = useStore();
  const { settings, updateSettings, songs, events } = store;
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ songs, events, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cancionero-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Respaldo descargado.');
  };

  const importar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (window.confirm('Esto reemplazará las canciones y eventos actuales por los del respaldo. ¿Continuar?')) {
        store.importData(data);
        setMsg('Respaldo cargado correctamente.');
      }
    } catch {
      setMsg('No se pudo leer el archivo. ¿Es un respaldo del Cancionero?');
    }
    e.target.value = '';
  };

  return (
    <div className="page">
      <PerfilCard />
      <IglesiaBoton />

      <section className="card">
        <h2>Lectura</h2>
        <label>
          Tamaño de letra: {settings.fontSize}px
          <input
            type="range" min="14" max="40" value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.showChords} onChange={(e) => updateSettings({ showChords: e.target.checked })} />
          Mostrar acordes (desmárcalo para ver solo la letra)
        </label>
        <div className="row gap wrap">
          <label>
            Notación de acordes
            <select value={settings.notation} onChange={(e) => updateSettings({ notation: e.target.value })}>
              <option value="americano">Americana (C, D, E…)</option>
              <option value="latino">Latina (Do, Re, Mi…)</option>
            </select>
          </label>
          <label>
            Tema
            <select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}>
              <option value="claro">Claro</option>
              <option value="oscuro">Oscuro</option>
            </select>
          </label>
        </div>
        <div className="preview-box">
          <div className="muted small">Vista previa</div>
          <SongView content={MUESTRA} songKey="G" settings={settings} />
        </div>
      </section>

      {store.mode === 'cloud' ? (
        <>
          <section className="card">
            <h2>Datos</h2>
            <p className="muted">
              La iglesia tiene {songs.length} canciones y {events.length} eventos, guardados en internet y compartidos con todos sus miembros.
            </p>
            <div className="row gap wrap">
              <button className="btn" onClick={exportar}>⬇ Descargar respaldo</button>
              {store.can.edit && <UploadLocal onDone={setMsg} />}
            </div>
            {store.can.edit && (
              <div style={{ marginTop: '0.8rem' }}>
                <p className="muted small" style={{ margin: '0 0 0.4rem' }}>Himnos clásicos de dominio público (sin derechos de autor), como ejemplo para la iglesia:</p>
                <AgregarEjemplos />
              </div>
            )}
            {msg && <p className="ok">{msg}</p>}
          </section>
        </>
      ) : (
      <section className="card">
          <h2>Datos</h2>
          <p className="muted">
            Tienes {songs.length} canciones y {events.length} eventos guardados en este equipo.
            Descarga un respaldo de vez en cuando para no perderlos.
          </p>
          <div className="row gap wrap">
            <button className="btn" onClick={exportar}>⬇ Descargar respaldo</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Cargar respaldo</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importar} />
            <button className="btn" onClick={() => { store.restoreExamples(); setMsg('Canciones de ejemplo restauradas.'); }}>
              Restaurar canciones de ejemplo
            </button>
          </div>
          {msg && <p className="ok">{msg}</p>}
          <div className="danger-zone">
            <button
              className="btn danger ghost"
              onClick={() => {
                if (window.confirm('¿Borrar TODAS las canciones y eventos de este equipo? No se puede deshacer.')) {
                  store.deleteAll();
                  setMsg('Se borraron todos los datos.');
                }
              }}
            >
              Borrar todos los datos
            </button>
          </div>
        </section>
      )}

      <InstalarCard />
      <AjustesFinal />
    </div>
  );
}

function UploadLocal({ onDone }) {
  const { uploadLocal } = useStore();
  const [busy, setBusy] = useState(false);
  const local = readLocalData();
  if (!local.songs.length) return null;
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`¿Subir las ${local.songs.length} canciones guardadas en este equipo a la iglesia? Las que ya existen con el mismo título se saltan.`)) return;
        setBusy(true);
        try {
          const n = await uploadLocal({ songs: local.songs, events: [] });
          onDone(`Se subieron ${n} canciones a la iglesia.`);
        } catch (e) {
          onDone(`No se pudo subir: ${e.message}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      ⬆ Subir canciones de este equipo ({local.songs.length})
    </button>
  );
}
