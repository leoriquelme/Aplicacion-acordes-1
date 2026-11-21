import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, deleteDoc, doc, getDocs, increment, onSnapshot, setDoc, writeBatch,
} from 'firebase/firestore';
import { cancionesEjemplo } from '../data/ejemplos.js';
import { db } from './firebase.js';
import { DataContext } from './store.jsx';
import { normalize } from './chordpro.js';
import { guardarMiFoto, useAuth } from './cloud.jsx';

// Vista personal (sin iglesia): mis canciones (users/{uid}/songs), himnos de ejemplo y la
// biblioteca que comparten las iglesias. Sin eventos ni miembros.

const PERSONAL_CAN = { edit: true, delete: true, events: false, users: false };
const sinId = ({ id, ...rest }) => rest; // eslint-disable-line no-unused-vars

export function PersonalStoreProvider({ children }) {
  const { user, profile } = useAuth();
  const uid = user.uid;
  const [songs, setSongs] = useState([]);
  const [songsLoaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const report = useCallback((e) => setError(`No se pudo guardar: ${e.message}`), []);
  const col = useMemo(() => collection(db, 'users', uid, 'songs'), [uid]);

  useEffect(() => onSnapshot(col, (s) => { setSongs(s.docs.map((d) => ({ ...d.data(), id: d.id }))); setLoaded(true); }, (e) => setError(e.message)), [col]);

  const saveSong = useCallback((song) => {
    const ref = song.id ? doc(col, song.id) : doc(col);
    setDoc(ref, { ...sinId(song), updatedAt: Date.now(), ...(song.id || song.createdAt ? {} : { createdAt: Date.now() }) }).catch(report);
    return ref.id;
  }, [col, report]);
  const deleteSong = useCallback((id) => deleteDoc(doc(col, id)), [col]);

  const addExamples = useCallback(async () => {
    const titles = new Set(songs.map((s) => normalize(s.title)));
    const b = writeBatch(db);
    let added = 0;
    for (const s of cancionesEjemplo) {
      if (titles.has(normalize(s.title))) continue;
      b.set(doc(col, s.id), { ...sinId(s), updatedAt: Date.now(), createdAt: s.createdAt || Date.now() });
      added++;
    }
    if (added) await b.commit();
    return added;
  }, [songs, col]);

  const loadLibrary = useCallback(async () => {
    const snap = await getDocs(collection(db, 'library'));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  }, []);

  // Favoritas y notas propias, en mi perfil.
  const favorites = profile?.favorites || [];
  const myNotes = profile?.notes || {};
  const userDoc = useMemo(() => doc(db, 'users', uid), [uid]);
  const toggleFavorite = useCallback((songId) => {
    const next = favorites.includes(songId) ? favorites.filter((x) => x !== songId) : [...favorites, songId];
    setDoc(userDoc, { favorites: next.slice(-500) }, { merge: true }).catch(report);
  }, [favorites, userDoc, report]);
  const setMyNotes = useCallback((songId, list) => {
    setDoc(userDoc, { notes: { [songId]: list.slice(0, 40) } }, { merge: true }).catch(report);
  }, [userDoc, report]);

  const [prayers, setPrayers] = useState(null);
  useEffect(() => onSnapshot(doc(db, 'stats', 'oracion'), (s) => setPrayers(s.data()?.count || 0), () => setPrayers(null)), []);
  const pray = useCallback(() => {
    setDoc(doc(db, 'stats', 'oracion'), { count: increment(1) }, { merge: true }).catch(report);
  }, [report]);

  const updateMyName = useCallback((name) => setDoc(userDoc, { name: name.trim().slice(0, 60) }, { merge: true }), [userDoc]);

  const me = { name: profile?.name || user.displayName || '', key: uid, teams: [], photo: profile?.photo || '' };
  const value = useMemo(() => ({
    mode: 'personal', church: null, me, role: 'personal', can: PERSONAL_CAN, people: [], songs, songsLoaded, events: [], participations: [], suggestions: [],
    error, clearError: () => setError(''), saveSong, deleteSong, saveEvent: () => null, deleteEvent: () => {}, addExamples, loadLibrary,
    favorites, toggleFavorite, myNotes, setMyNotes, prayers, pray, updateMyName, setMyPhoto: guardarMiFoto,
  }), [me.name, me.photo, songs, songsLoaded, error, saveSong, deleteSong, addExamples, loadLibrary, favorites, toggleFavorite, myNotes, setMyNotes, prayers, pray, updateMyName]); // eslint-disable-line react-hooks/exhaustive-deps

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
