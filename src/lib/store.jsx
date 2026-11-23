import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cancionesEjemplo, eventosEjemplo } from '../data/ejemplos.js';

// Datos guardados solo en este equipo (modo sin iglesia) y ajustes personales.
export const STORAGE_KEY = 'cancionero-v1';
const SETTINGS_KEY = 'cancionero-ajustes';
const FAV_KEY = 'cancionero-favoritas';
const NOTES_KEY = 'cancionero-notas';

export const DEFAULT_SETTINGS = {
  fontSize: 22,
  notation: 'americano', // 'americano' (C D E) o 'latino' (Do Re Mi)
  showChords: true,
  tema: 'auto', // 'auto' (como el teléfono o el computador), 'oscuro' o 'claro'
};

/** Permisos por perfil (tabla de control de acceso). */
export const ROLES = {
  admin: { label: 'Administrador', edit: true, delete: true, events: true, users: true },
  director: { label: 'Director musical', edit: true, delete: false, events: true, users: false },
  colaborador: { label: 'Colaborador', edit: false, delete: false, events: false, users: false },
};
const LOCAL_CAN = { edit: true, delete: true, events: true, users: false };

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin espacio o almacenamiento bloqueado */
  }
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Canciones y eventos guardados en este equipo (para subirlos a una iglesia). */
export function readLocalData() {
  const d = readJSON(STORAGE_KEY);
  return { songs: Array.isArray(d?.songs) ? d.songs : [], events: Array.isArray(d?.events) ? d.events : [] };
}

// ---------- Ajustes personales ----------

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const s = { ...DEFAULT_SETTINGS, ...(readJSON(STORAGE_KEY)?.settings || {}), ...(readJSON(SETTINGS_KEY) || {}) };
    // Antes había solo un interruptor (theme): quien lo tenía encendido sigue en oscuro; el resto pasa a automático.
    if (!readJSON(SETTINGS_KEY)?.tema) s.tema = s.theme === 'oscuro' ? 'oscuro' : 'auto';
    delete s.theme;
    return s;
  });

  useEffect(() => writeJSON(SETTINGS_KEY, settings), [settings]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const aplicar = () => {
      const oscuro = settings.tema === 'oscuro' || (settings.tema === 'auto' && mq?.matches);
      document.documentElement.dataset.theme = oscuro ? 'oscuro' : 'claro';
    };
    aplicar();
    if (settings.tema !== 'auto' || !mq) return undefined;
    mq.addEventListener?.('change', aplicar);
    return () => mq.removeEventListener?.('change', aplicar);
  }, [settings.tema]);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// ---------- Datos (canciones y eventos) ----------

export const DataContext = createContext(null);

/** Modo local: todo en el navegador de este equipo. */
export function LocalStoreProvider({ children }) {
  const [data, setData] = useState(() => {
    const d = readJSON(STORAGE_KEY);
    if (!d) return { songs: cancionesEjemplo, events: eventosEjemplo() };
    return { songs: Array.isArray(d.songs) ? d.songs : [], events: Array.isArray(d.events) ? d.events : [] };
  });

  useEffect(() => {
    const prev = readJSON(STORAGE_KEY) || {};
    writeJSON(STORAGE_KEY, { ...prev, songs: data.songs, events: data.events });
  }, [data]);

  const saveSong = useCallback((song) => {
    const id = song.id || newId();
    setData((d) => {
      const exists = d.songs.some((s) => s.id === id);
      const ahora = Date.now();
      const s = { ...song, id, updatedAt: ahora, ...(exists || song.createdAt ? {} : { createdAt: ahora }) };
      return { ...d, songs: exists ? d.songs.map((x) => (x.id === id ? s : x)) : [...d.songs, s] };
    });
    return id;
  }, []);

  const deleteSong = useCallback((id) => {
    setData((d) => ({
      songs: d.songs.filter((s) => s.id !== id),
      events: d.events.map((e) => ({ ...e, items: e.items.filter((i) => i.songId !== id) })),
    }));
  }, []);

  const saveEvent = useCallback((event) => {
    const id = event.id || newId();
    setData((d) => {
      const exists = d.events.some((e) => e.id === id);
      const e = { items: [], notes: '', ...event, id };
      return { ...d, events: exists ? d.events.map((x) => (x.id === id ? e : x)) : [...d.events, e] };
    });
    return id;
  }, []);

  const deleteEvent = useCallback((id) => {
    setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
  }, []);

  const importData = useCallback((incoming) => {
    if (!incoming || !Array.isArray(incoming.songs)) throw new Error('Archivo no válido');
    setData({ songs: incoming.songs, events: Array.isArray(incoming.events) ? incoming.events : [] });
  }, []);

  const restoreExamples = useCallback(() => {
    setData((d) => {
      const ids = new Set(d.songs.map((s) => s.id));
      return { ...d, songs: [...d.songs, ...cancionesEjemplo.filter((s) => !ids.has(s.id))] };
    });
  }, []);

  const deleteAll = useCallback(() => setData({ songs: [], events: [] }), []);

  // Favoritas en este equipo.
  const [favorites, setFavorites] = useState(() => readJSON(FAV_KEY) || []);
  const [myNotes, setMyNotesState] = useState(() => readJSON(NOTES_KEY) || {});
  const setMyNotes = useCallback((songId, list) => {
    setMyNotesState((n) => { const next = { ...n, [songId]: list }; writeJSON(NOTES_KEY, next); return next; });
  }, []);
  const toggleFavorite = useCallback((songId) => {
    setFavorites((f) => {
      const next = f.includes(songId) ? f.filter((x) => x !== songId) : [...f, songId];
      writeJSON(FAV_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ...data, participations: [], favorites, toggleFavorite, myNotes, setMyNotes, mode: 'local', can: LOCAL_CAN, saveSong, deleteSong, saveEvent, deleteEvent, importData, restoreExamples, deleteAll }),
    [data, favorites, toggleFavorite, myNotes, setMyNotes, saveSong, deleteSong, saveEvent, deleteEvent, importData, restoreExamples, deleteAll]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useStore() {
  return { ...useContext(DataContext), ...useContext(SettingsContext) };
}

// ---------- Tono personal (cada músico, en su equipo) ----------

const PERSONAL_KEY = 'cancionero-tonos';
export function getPersonalKey(songId) {
  return readJSON(PERSONAL_KEY)?.[songId] || 0;
}
export function setPersonalKey(songId, steps) {
  const all = readJSON(PERSONAL_KEY) || {};
  if (steps) all[songId] = steps;
  else delete all[songId];
  writeJSON(PERSONAL_KEY, all);
}

// ---------- Capo personal (cada músico, en su equipo) ----------

const CAPO_KEY = 'cancionero-capo';
export function getCapo(songId) {
  return readJSON(CAPO_KEY)?.[songId] || 0;
}
export function setCapo(songId, capo) {
  const all = readJSON(CAPO_KEY) || {};
  if (capo) all[songId] = capo;
  else delete all[songId];
  writeJSON(CAPO_KEY, all);
}
