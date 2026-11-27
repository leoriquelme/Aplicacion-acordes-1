import { useRef, useState } from 'react';
import { readLocalData, useStore } from '../lib/store.jsx';
import SongView from '../components/SongView.jsx';
import AgregarEjemplos from '../components/AgregarEjemplos.jsx';
import { AjustesFinal, FilaAbre, Grupo, IglesiaTarjeta, PerfilCard } from '../components/Comunicacion.jsx';
import InstalarCard from '../components/InstalarCard.jsx';
import IglesiaPrueba from '../components/IglesiaPrueba.jsx';
import ProbarPedalera from '../components/ProbarPedalera.jsx';
import { Respaldo } from '../components/Administracion.jsx';
import Icon from '../components/Icon.jsx';
import { VistaComoAjustes } from '../components/VistaComo.jsx';
import { descargar } from '../lib/descargar.js';

const MUESTRA = '[G]Cuán grande es [C]Él, [G]cuán grande es [D]Él';

export default function Ajustes() {
  const store = useStore();
  const { settings, updateSettings, songs, events } = store;
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');

  const exportar = () => {
    descargar(`cancionero-respaldo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ songs, events, settings }, null, 2));
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
      setMsg('No se pudo leer el archivo. ¿Es un respaldo de la app?');
    }
    e.target.value = '';
  };

  return (
    <div className="page ajustes">
      <h1>Ajustes</h1>
      <PerfilCard />
      <IglesiaTarjeta />

      <Grupo titulo="Personal">
        <div className="fila">
          <span className="fila-label"><Icon name="text" /> Letra</span>
          <input
            className="grow" type="range" min="14" max="40" value={settings.fontSize} aria-label="Tamaño de letra"
            onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
          />
          <span className="fila-valor fija">{settings.fontSize}</span>
        </div>
        <label className="fila">
          <span className="fila-label"><Icon name="music" /> Acordes</span>
          <input
            type="checkbox" className="interruptor" checked={settings.showChords}
            onChange={(e) => updateSettings({ showChords: e.target.checked })}
          />
        </label>
        <label className="fila">
          <span className="fila-label"><Icon name="note" /> Notación</span>
          <select className="fila-select" value={settings.notation} onChange={(e) => updateSettings({ notation: e.target.value })}>
            <option value="americano">C, D, E</option>
            <option value="latino">Do, Re, Mi</option>
          </select>
        </label>
        <label className="fila">
          <span className="fila-label"><Icon name="moon" /> Modo oscuro</span>
          <select className="fila-select" value={settings.tema} onChange={(e) => updateSettings({ tema: e.target.value })}>
            <option value="auto">Automático</option>
            <option value="oscuro">Siempre</option>
            <option value="claro">Nunca</option>
          </select>
        </label>
        <div className="fila fila-muestra">
          <SongView content={MUESTRA} songKey="G" settings={settings} />
        </div>
      </Grupo>

      {store.mode === 'local' && (
        <Grupo titulo="Datos">
          <FilaAbre label="Respaldo">
            <div className="row gap wrap">
              <button className="btn" onClick={exportar}><Icon name="download" /> Descargar</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Cargar</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importar} />
              <button className="btn" onClick={() => { store.restoreExamples(); setMsg('Canciones de ejemplo restauradas.'); }}>
                Himnos de ejemplo
              </button>
              <button
                className="btn danger ghost"
                onClick={() => {
                  if (window.confirm('¿Borrar TODAS las canciones y eventos de este equipo? No se puede deshacer.')) {
                    store.deleteAll();
                    setMsg('Se borraron todos los datos.');
                  }
                }}
              >
                Borrar todo
              </button>
            </div>
            {msg && <p className="ok">{msg}</p>}
          </FilaAbre>
        </Grupo>
      )}

      <VistaComoAjustes />

      <Grupo titulo="App">
          {store.mode === 'cloud' && store.can.users && (
            <FilaAbre label={<><Icon name="download" /> Respaldo</>}>
              <Respaldo />
            </FilaAbre>
          )}
          {store.mode === 'cloud' && store.can.edit && (
            <FilaAbre label={<><Icon name="book" /> Himnos de ejemplo</>}>
              <div className="row gap wrap">
                <AgregarEjemplos />
                <UploadLocal onDone={setMsg} />
              </div>
              {msg && <p className="ok">{msg}</p>}
            </FilaAbre>
          )}
          {store.mode === 'cloud' && (store.can.users || store.can.edit) && <IglesiaPrueba />}
        <FilaAbre label={<><Icon name="music" /> Probar pedalera</>}>
          <ProbarPedalera />
        </FilaAbre>
        <FilaAbre label={<><Icon name="phone" /> Instalar la app</>}>
          <InstalarCard bare />
        </FilaAbre>
      </Grupo>

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
      <Icon name="upload" /> Subir las de este equipo ({local.songs.length})
    </button>
  );
}
