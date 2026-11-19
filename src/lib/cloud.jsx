import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { grupoDe, participationId } from './participacion.js';
import { cancionesEjemplo } from '../data/ejemplos.js';
import { auth, db } from './firebase.js';
import { DataContext, ROLES } from './store.jsx';
import { normalize } from './chordpro.js';

// Se entra con Iglesia + Nombre. Por detrás, cada equipo tiene una sesión anónima de Firebase
// (invisible para la persona) que permite que las reglas de permisos funcionen.

const SESSION_KEY = 'cancionero-sesion';

/** "Leonardo  Riquelme" → "leonardo riquelme" (sin tildes ni mayúsculas) */
export function keyOf(text) {
  return normalize(text).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const AuthContext = createContext(null);

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando
  const [session, setSessionState] = useState(readSession); // { churchId, churchName }

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  const setSession = useCallback((s) => {
    setSessionState(s);
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo(() => ({ user, session, setSession }), [user, session, setSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

const sessionRef = (churchId, uid) => doc(db, 'churches', churchId, 'sessions', uid);
const personRef = (churchId, key) => doc(db, 'churches', churchId, 'people', key);

/**
 * Entrar a una iglesia. Con PIN intenta Administrador y luego Director.
 * Devuelve { churchId, churchName, needsPin } (needsPin = perfil que pide PIN).
 */
export async function enterChurch({ church, name, pin }) {
  const churchId = keyOf(church);
  const key = keyOf(name);
  if (!churchId) throw new Error('Escribe el nombre de la iglesia.');
  if (!key) throw new Error('Escribe tu nombre.');
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  const base = { key, name: name.trim(), churchName: church.trim().toUpperCase() };
  const now = Date.now();

  if (pin) {
    const clean = String(pin).trim();
    // El PIN puede estar guardado como texto o como número en Firebase: se prueban ambos.
    const attempts = [['admin', clean], ['admin', Number(clean)], ['director', clean]];
    for (const [role, value] of attempts) {
      try {
        await setDoc(sessionRef(churchId, user.uid), { ...base, role, pin: value });
        if (role === 'admin') {
          await setDoc(personRef(churchId, key), { name: base.name, role: 'admin', lastSeen: now }, { merge: true });
        } else {
          await updateDoc(personRef(churchId, key), { lastSeen: now, name: base.name });
        }
        return { churchId, churchName: base.churchName };
      } catch {
        /* probar el siguiente perfil */
      }
    }
    // ¿La iglesia existe? Si se puede entrar como colaborador, el problema es el PIN.
    try {
      await setDoc(sessionRef(churchId, user.uid), { ...base, role: 'colaborador' });
    } catch {
      throw new Error(`No encontramos la iglesia "${church.trim()}". Revisa cómo está escrita.`);
    }
    await deleteDoc(sessionRef(churchId, user.uid)).catch(() => {});
    throw new Error('El PIN no es correcto para ese nombre.');
  }

  try {
    await setDoc(sessionRef(churchId, user.uid), { ...base, role: 'colaborador' });
  } catch {
    throw new Error(`No encontramos la iglesia "${church.trim()}". Revisa cómo está escrita.`);
  }
  const person = await getDoc(personRef(churchId, key));
  if (!person.exists()) {
    await setDoc(personRef(churchId, key), { name: base.name, role: 'colaborador', firstSeen: now, lastSeen: now });
    return { churchId, churchName: base.churchName };
  }
  await updateDoc(personRef(churchId, key), { lastSeen: now, name: base.name });
  const role = person.data().role;
  return { churchId, churchName: base.churchName, needsPin: role !== 'colaborador' ? role : null };
}

export async function leaveChurch(churchId) {
  const uid = auth.currentUser?.uid;
  if (uid && churchId) await deleteDoc(sessionRef(churchId, uid)).catch(() => {});
}

// ---------- Datos de una iglesia ----------

function desdeISO(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}

const sinId = ({ id, ...rest }) => rest; // eslint-disable-line no-unused-vars

export function CloudStoreProvider({ churchId, churchName, children }) {
  const { user } = useAuth();
  const [mySession, setMySession] = useState(undefined);
  const [songs, setSongs] = useState([]);
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [myShares, setMyShares] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(sessionRef(churchId, user.uid), (s) => setMySession(s.exists() ? s.data() : null), () => setMySession(null));
    return unsub;
  }, [churchId, user.uid]);

  useEffect(() => {
    if (!mySession) return undefined;
    const base = doc(db, 'churches', churchId);
    const fail = (e) => setError(e.message);
    const subs = [
      onSnapshot(collection(base, 'songs'), (s) => setSongs(s.docs.map((d) => ({ ...d.data(), id: d.id }))), fail),
      onSnapshot(collection(base, 'events'), (s) => setEvents(s.docs.map((d) => ({ items: [], ...d.data(), id: d.id }))), fail),
      onSnapshot(collection(base, 'people'), (s) => setPeople(s.docs.map((d) => ({ ...d.data(), key: d.id }))), fail),
      onSnapshot(
        query(collection(base, 'participations'), where('date', '>=', desdeISO(4))),
        (s) => setParticipations(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
      onSnapshot(
        query(collection(db, 'library'), where('churchId', '==', churchId)),
        (s) => setMyShares(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        () => setMyShares([]),
      ),
    ];
    return () => subs.forEach((u) => u());
  }, [churchId, mySession]);

  const col = useCallback((name) => collection(db, 'churches', churchId, name), [churchId]);
  const report = useCallback((e) => setError(`No se pudo guardar: ${e.message}`), []);

  const saveSong = useCallback((song) => {
    const ref = song.id ? doc(col('songs'), song.id) : doc(col('songs'));
    setDoc(ref, { ...sinId(song), updatedAt: Date.now() }).catch(report);
    return ref.id;
  }, [col, report]);

  const deleteSong = useCallback((id) => {
    deleteDoc(doc(col('songs'), id)).catch(report);
    deleteDoc(doc(db, 'library', `${churchId}__${id}`)).catch(() => {});
    events.filter((e) => e.items.some((i) => i.songId === id)).forEach((e) => {
      setDoc(doc(col('events'), e.id), { ...sinId(e), items: e.items.filter((i) => i.songId !== id) }).catch(report);
    });
  }, [col, events, report, churchId]);

  const saveEvent = useCallback((event) => {
    const ref = event.id ? doc(col('events'), event.id) : doc(col('events'));
    setDoc(ref, { items: [], notes: '', ...sinId(event) }).catch(report);
    return ref.id;
  }, [col, report]);

  const deleteEvent = useCallback((id) => {
    deleteDoc(doc(col('events'), id)).catch(report);
    participations.filter((p) => p.eventId === id).forEach((p) => deleteDoc(doc(col('participations'), p.id)).catch(() => {}));
  }, [col, report, participations]);

  /** Inscribirse (o cambiar de rol) en un evento. Uno solo por persona y evento. */
  const joinEvent = useCallback((event, role, person) => {
    setDoc(doc(col('participations'), participationId(event.id, person.key)), {
      eventId: event.id, personKey: person.key, name: person.name, role, group: grupoDe(role), date: event.date, at: Date.now(),
    }).catch(report);
  }, [col, report]);

  const leaveEvent = useCallback((eventId, personKey) => {
    deleteDoc(doc(col('participations'), participationId(eventId, personKey))).catch(report);
  }, [col, report]);

  /** El administrador cambia el perfil. Director necesita PIN. */
  const setPersonRole = useCallback(async (key, role, pin) => {
    const b = writeBatch(db);
    b.update(personRef(churchId, key), { role });
    b.set(doc(db, 'churches', churchId, 'private', 'pins'), { pins: { [key]: role === 'director' ? String(pin) : deleteField() } }, { merge: true });
    await b.commit();
  }, [churchId]);

  const removePerson = useCallback((key) => deleteDoc(personRef(churchId, key)).catch(report), [churchId, report]);

  /** Sube canciones de este equipo a la iglesia, saltando títulos que ya existen. */
  const uploadLocal = useCallback(async ({ songs: localSongs }) => {
    const existing = new Set(songs.map((s) => normalize(s.title)));
    let b = writeBatch(db);
    let n = 0;
    let added = 0;
    for (const s of localSongs) {
      if (existing.has(normalize(s.title))) continue;
      b.set(doc(col('songs')), { ...sinId(s), updatedAt: Date.now() });
      added++;
      if (++n >= 400) {
        await b.commit();
        b = writeBatch(db);
        n = 0;
      }
    }
    if (n) await b.commit();
    return added;
  }, [songs, col]);

  // ---------- Biblioteca compartida ----------
  const shareSong = useCallback(async (song) => {
    await setDoc(doc(db, 'library', `${churchId}__${song.id}`), {
      churchId, churchName, songId: song.id,
      title: song.title, author: song.author || '', key: song.key || '', content: song.content || '',
      ...(song.order?.length ? { order: song.order } : {}),
      sharedBy: mySession?.name || '', confirmed: true, sharedAt: Date.now(),
    });
  }, [churchId, churchName, mySession?.name]);

  const unshareSong = useCallback(
    (songId) => deleteDoc(doc(db, 'library', `${churchId}__${songId}`)).catch(report),
    [churchId, report],
  );

  /** Todas las canciones compartidas por otras iglesias. */
  const loadLibrary = useCallback(async () => {
    const snap = await getDocs(collection(db, 'library'));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id })).filter((x) => x.churchId !== churchId);
  }, [churchId]);

  /** Agrega los himnos de ejemplo (dominio público) que la iglesia todavía no tenga. */
  const addExamples = useCallback(async () => {
    const titles = new Set(songs.map((s) => normalize(s.title)));
    const ids = new Set(songs.map((s) => s.id));
    const b = writeBatch(db);
    let added = 0;
    for (const s of cancionesEjemplo) {
      if (titles.has(normalize(s.title)) || ids.has(s.id)) continue;
      b.set(doc(col('songs'), s.id), { ...sinId(s), updatedAt: Date.now() });
      added++;
    }
    if (added) await b.commit();
    return added;
  }, [songs, col]);

  // Perfil efectivo (igual que en las reglas): si el administrador cambió el perfil,
  // el que vale es el menor hasta que la persona vuelva a entrar con su PIN.
  const person = mySession ? people.find((p) => p.key === mySession.key) : null;
  let role = mySession?.role || 'colaborador';
  if (role === 'director' && person && person.role !== 'director') role = 'colaborador';
  const pendingRole = person && person.role !== 'colaborador' && person.role !== role ? person.role : null;
  const can = ROLES[role] || ROLES.colaborador;
  const me = mySession === undefined ? undefined : mySession && { name: mySession.name, key: mySession.key };
  const church = { id: churchId, name: churchName };

  const value = useMemo(() => ({
    mode: 'cloud', churchId, church, me, role, pendingRole, can, people, songs, events, participations, error,
    clearError: () => setError(''), saveSong, deleteSong, saveEvent, deleteEvent, joinEvent, leaveEvent, setPersonRole, removePerson, uploadLocal, addExamples, myShares, shareSong, unshareSong, loadLibrary,
  }), [churchId, church.name, me?.name, me?.key, role, pendingRole, can, people, songs, events, participations, error, saveSong, deleteSong, saveEvent, deleteEvent, joinEvent, leaveEvent, setPersonRole, removePerson, uploadLocal, addExamples, myShares, shareSong, unshareSong, loadLibrary]); // eslint-disable-line react-hooks/exhaustive-deps

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
