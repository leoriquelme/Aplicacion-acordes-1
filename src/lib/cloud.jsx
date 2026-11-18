import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp,
  setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { DataContext, ROLES } from './store.jsx';
import { normalize } from './chordpro.js';

// ---------- Sesión y perfil ----------

const AuthContext = createContext(null);
const LAST_CHURCH = 'cancionero-iglesia';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [churchId, setChurchIdState] = useState(() => localStorage.getItem(LAST_CHURCH) || '');

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : { name: '', churches: [] });
    });
  }, [user]);

  const setChurchId = useCallback((id) => {
    setChurchIdState(id);
    if (id) localStorage.setItem(LAST_CHURCH, id);
    else localStorage.removeItem(LAST_CHURCH);
  }, []);

  const value = useMemo(() => ({ user, profile, churchId, setChurchId }), [user, profile, churchId, setChurchId]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

export async function logout() {
  localStorage.removeItem(LAST_CHURCH);
  await signOut(auth);
}

export async function saveMyName(uid, name) {
  await setDoc(doc(db, 'users', uid), { name }, { merge: true });
}

// ---------- Iglesias ----------

/** Código fácil de dictar: GRACIA-4821 */
export function makeChurchCode(name) {
  const word = normalize(name).replace(/^(iglesia|comunidad|centro|ministerio|mision|templo)\s+/, '')
    .replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/)[0] || 'IGLESIA';
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${word.slice(0, 10).toUpperCase()}-${num}`;
}

export function cleanCode(code) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export async function createChurch(user, myName, churchName) {
  let code = makeChurchCode(churchName);
  for (let i = 0; i < 5; i++) {
    const taken = await getDoc(doc(db, 'churchCodes', code));
    if (!taken.exists()) break;
    code = makeChurchCode(churchName);
  }
  const ref = doc(collection(db, 'churches'));
  const b = writeBatch(db);
  b.set(ref, { name: churchName, code, createdBy: user.uid, createdAt: serverTimestamp() });
  b.set(doc(db, 'churchCodes', code), { churchId: ref.id, name: churchName });
  b.set(doc(db, 'churches', ref.id, 'members', user.uid), {
    name: myName, email: user.email || '', role: 'admin', joinedAt: serverTimestamp(),
  });
  await b.commit();
  await setDoc(doc(db, 'users', user.uid), { name: myName, churches: arrayUnion({ id: ref.id, name: churchName }) }, { merge: true });
  return ref.id;
}

export async function joinChurch(user, myName, rawCode) {
  const code = cleanCode(rawCode);
  const snap = await getDoc(doc(db, 'churchCodes', code));
  if (!snap.exists()) throw new Error('No existe una iglesia con ese código. Revisa que esté bien escrito.');
  const { churchId, name } = snap.data();
  const memberRef = doc(db, 'churches', churchId, 'members', user.uid);
  let already = false;
  try {
    already = (await getDoc(memberRef)).exists();
  } catch {
    already = false; // todavía no es miembro, por eso no puede leer
  }
  if (!already) {
    await setDoc(memberRef, { name: myName, email: user.email || '', role: 'musico', code, joinedAt: serverTimestamp() });
  }
  await setDoc(doc(db, 'users', user.uid), { name: myName, churches: arrayUnion({ id: churchId, name }) }, { merge: true });
  return churchId;
}

export async function forgetChurch(uid, church) {
  await updateDoc(doc(db, 'users', uid), { churches: arrayRemove(church) });
}

// ---------- Datos de una iglesia ----------

const sinId = ({ id, ...rest }) => rest; // eslint-disable-line no-unused-vars

export function CloudStoreProvider({ churchId, children }) {
  const { user } = useAuth();
  const [church, setChurch] = useState(null);
  const [me, setMe] = useState(undefined);
  const [songs, setSongs] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const base = doc(db, 'churches', churchId);
    const fail = (e) => setError(e.message);
    const subs = [
      onSnapshot(base, (s) => setChurch(s.exists() ? { id: s.id, ...s.data() } : null), fail),
      onSnapshot(doc(base, 'members', user.uid), (s) => setMe(s.exists() ? s.data() : null), () => setMe(null)),
      onSnapshot(collection(base, 'songs'), (s) => setSongs(s.docs.map((d) => ({ ...d.data(), id: d.id }))), fail),
      onSnapshot(collection(base, 'events'), (s) => setEvents(s.docs.map((d) => ({ items: [], ...d.data(), id: d.id }))), fail),
      onSnapshot(collection(base, 'members'), (s) => setMembers(s.docs.map((d) => ({ ...d.data(), uid: d.id }))), fail),
    ];
    return () => subs.forEach((u) => u());
  }, [churchId, user.uid]);

  const col = useCallback((name) => collection(db, 'churches', churchId, name), [churchId]);
  const report = useCallback((e) => setError(`No se pudo guardar: ${e.message}`), []);

  const saveSong = useCallback((song) => {
    const ref = song.id ? doc(col('songs'), song.id) : doc(col('songs'));
    setDoc(ref, { ...sinId(song), updatedAt: Date.now() }).catch(report);
    return ref.id;
  }, [col, report]);

  const deleteSong = useCallback((id) => {
    deleteDoc(doc(col('songs'), id)).catch(report);
    // Quitarla también de los eventos.
    events.filter((e) => e.items.some((i) => i.songId === id)).forEach((e) => {
      setDoc(doc(col('events'), e.id), { ...sinId(e), items: e.items.filter((i) => i.songId !== id) }).catch(report);
    });
  }, [col, events, report]);

  const saveEvent = useCallback((event) => {
    const ref = event.id ? doc(col('events'), event.id) : doc(col('events'));
    setDoc(ref, { items: [], notes: '', ...sinId(event) }).catch(report);
    return ref.id;
  }, [col, report]);

  const deleteEvent = useCallback((id) => {
    deleteDoc(doc(col('events'), id)).catch(report);
  }, [col, report]);

  const setMemberRole = useCallback(
    (uid, role) => updateDoc(doc(db, 'churches', churchId, 'members', uid), { role }).catch(report),
    [churchId, report]
  );
  const removeMember = useCallback(
    (uid) => deleteDoc(doc(db, 'churches', churchId, 'members', uid)).catch(report),
    [churchId, report]
  );

  /** Sube canciones (y eventos) de este equipo a la iglesia, saltando títulos que ya existen. */
  const uploadLocal = useCallback(async ({ songs: localSongs, events: localEvents }) => {
    const existing = new Map(songs.map((s) => [normalize(s.title), s.id]));
    const idMap = new Map();
    let b = writeBatch(db);
    let n = 0;
    let added = 0;
    const flush = async () => {
      if (n) await b.commit();
      b = writeBatch(db);
      n = 0;
    };
    for (const s of localSongs) {
      const same = existing.get(normalize(s.title));
      if (same) {
        idMap.set(s.id, same);
        continue;
      }
      const ref = doc(col('songs'));
      idMap.set(s.id, ref.id);
      b.set(ref, { ...sinId(s), updatedAt: Date.now() });
      added++;
      if (++n >= 400) await flush();
    }
    for (const e of localEvents || []) {
      const ref = doc(col('events'));
      b.set(ref, { ...sinId(e), items: e.items.map((i) => ({ ...i, songId: idMap.get(i.songId) || i.songId })) });
      if (++n >= 400) await flush();
    }
    await flush();
    return added;
  }, [songs, col]);

  const role = me?.role;
  const can = ROLES[role] || ROLES.musico;

  const value = useMemo(() => ({
    mode: 'cloud', churchId, church, me, role, can, members, songs, events, error, clearError: () => setError(''),
    saveSong, deleteSong, saveEvent, deleteEvent, setMemberRole, removeMember, uploadLocal,
  }), [churchId, church, me, role, can, members, songs, events, error, saveSong, deleteSong, saveEvent, deleteEvent, setMemberRole, removeMember, uploadLocal]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
