import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cancionesEjemplo, eventosEjemplo } from '../data/ejemplos.js';

// Todo se guarda en este equipo (localStorage del navegador).
const STORAGE_KEY = 'cancionero-v1';

export const DEFAULT_SETTINGS = {
  fontSize: 22,
  notation: 'americano', // 'americano' (C D E) o 'latino' (Do Re Mi)
  showChords: true,
  theme: 'claro',
  sectionButtons: ['Intro', 'Final'], // botones propios del editor
};

function initialData() {
  return { songs: cancionesEjemplo, events: eventosEjemplo(), settings: DEFAULT_SETTINGS };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData();
    const data = JSON.parse(raw);
    return {
      songs: Array.isArray(data.songs) ? data.songs : [],
      events: Array.isArray(data.events) ? data.events : [],
      settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    };
  } catch {
    return initialData();
  }
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [data, setData] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* sin espacio o almacenamiento bloqueado */
    }
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  const saveSong = useCallback((song) => {
    const id = song.id || newId();
    setData((d) => {
      const exists = d.songs.some((s) => s.id === id);
      const s = { ...song, id, updatedAt: Date.now() };
      return { ...d, songs: exists ? d.songs.map((x) => (x.id === id ? s : x)) : [...d.songs, s] };
    });
    return id;
  }, []);

  const deleteSong = useCallback((id) => {
    setData((d) => ({
      ...d,
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

  const updateSettings = useCallback((patch) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const importData = useCallback((incoming) => {
    if (!incoming || !Array.isArray(incoming.songs)) throw new Error('Archivo no válido');
    setData({
      songs: incoming.songs,
      events: Array.isArray(incoming.events) ? incoming.events : [],
      settings: { ...DEFAULT_SETTINGS, ...(incoming.settings || {}) },
    });
  }, []);

  const restoreExamples = useCallback(() => {
    setData((d) => {
      const ids = new Set(d.songs.map((s) => s.id));
      return { ...d, songs: [...d.songs, ...cancionesEjemplo.filter((s) => !ids.has(s.id))] };
    });
  }, []);

  const deleteAll = useCallback(() => {
    setData((d) => ({ songs: [], events: [], settings: d.settings }));
  }, []);

  const value = useMemo(
    () => ({ ...data, saveSong, deleteSong, saveEvent, deleteEvent, updateSettings, importData, restoreExamples, deleteAll }),
    [data, saveSong, deleteSong, saveEvent, deleteEvent, updateSettings, importData, restoreExamples, deleteAll]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
