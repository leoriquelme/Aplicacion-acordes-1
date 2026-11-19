import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  addDoc, arrayRemove, collection, deleteDoc, getCountFromServer, increment, limit, orderBy, serverTimestamp, deleteField, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { grupoDe, participationId } from './participacion.js';
import { cancionesEjemplo } from '../data/ejemplos.js';
import { PRUEBA_ID, datosPrueba } from '../data/prueba.js';
import { auth, db } from './firebase.js';
import { DataContext, ROLES } from './store.jsx';
import { normalize } from './chordpro.js';
import { keyOf } from './claves.js';

// Se entra con Iglesia + Nombre. Por detrás, cada equipo tiene una sesión anónima de Firebase
// (invisible para la persona) que permite que las reglas de permisos funcionen.

const SESSION_KEY = 'cancionero-sesion';

export { keyOf };

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
  // Sube cuando el mismo usuario vincula su cuenta de Google (Firebase no avisa ese cambio).
  const [authVersion, setAuthVersion] = useState(0);
  const refreshUser = useCallback(() => setAuthVersion((v) => v + 1), []);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u || null); setAuthVersion((v) => v + 1); }), []);

  const setSession = useCallback((s) => {
    setSessionState(s);
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo(() => ({ user, session, setSession, authVersion, refreshUser }), [user, session, setSession, authVersion, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

const sessionRef = (churchId, uid) => doc(db, 'churches', churchId, 'sessions', uid);
const personRef = (churchId, key) => doc(db, 'churches', churchId, 'people', key);

/** Código de acceso: solo letras y números, en mayúsculas. */
export const cleanCode = (c = '') => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
/** Código al azar de 6 letras (sin I, O ni L para no confundirlas con números). */
export function randomCode(n = 6) {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  return [...arr].map((x) => abc[x % abc.length]).join('');
}
const NO_ENTRA = (church) => `No pudimos entrar a "${church.trim()}". Revisa el nombre de la iglesia y, si tiene, el código de acceso. Si en esta iglesia eres Director o Administrador, escribe también tu contraseña.`;

/** Guarda muchos cambios de a 400 (el máximo de Firebase por envío es 500). */
async function commitAll(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => op(b));
    await b.commit();
  }
}

/**
 * Entrar a una iglesia. Con contraseña intenta Administrador y luego Director.
 * Un nombre de Director o Administrador solo entra con su contraseña (lo exigen las reglas).
 * (Por dentro el campo se sigue llamando "pin"; antes eran solo números.)
 * Devuelve { churchId, churchName }.
 */
export async function enterChurch({ church, name, pin, code = '' }) {
  const churchId = keyOf(church);
  const key = keyOf(name);
  if (!churchId) throw new Error('Escribe el nombre de la iglesia.');
  if (!key) throw new Error('Escribe tu nombre.');
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  const base = { key, name: name.trim(), churchName: church.trim().toUpperCase() };
  const codigo = cleanCode(code);
  const now = Date.now();

  if (pin) {
    const clean = String(pin).trim();
    // Una contraseña antigua de solo números puede estar guardada como número en Firebase: se prueban ambos.
    const numeric = /^\d+$/.test(clean) && Number.isSafeInteger(Number(clean));
    const attempts = [['admin', clean], ...(numeric ? [['admin', Number(clean)]] : []), ['director', clean]];
    for (const [role, value] of attempts) {
      try {
        await setDoc(sessionRef(churchId, user.uid), { ...base, role, pin: value });
        if (role === 'admin') {
          const ex = await getDoc(personRef(churchId, key)).catch(() => null);
          const keepName = ex?.exists() && ex.data().name;
          await setDoc(personRef(churchId, key), { ...(keepName ? {} : { name: base.name }), role: 'admin', lastSeen: now }, { merge: true });
        } else {
          await updateDoc(personRef(churchId, key), { lastSeen: now });
        }
        return { churchId, churchName: base.churchName };
      } catch {
        /* probar el siguiente perfil */
      }
    }
    // ¿La iglesia existe? Si se puede entrar como colaborador, el problema es el PIN.
    try {
      await setDoc(sessionRef(churchId, user.uid), { ...base, role: 'colaborador', code: codigo });
    } catch {
      throw new Error(NO_ENTRA(church));
    }
    await deleteDoc(sessionRef(churchId, user.uid)).catch(() => {});
    throw new Error('La contraseña no es correcta para ese nombre (revisa mayúsculas y minúsculas).');
  }

  try {
    await setDoc(sessionRef(churchId, user.uid), { ...base, role: 'colaborador', code: codigo });
  } catch {
    throw new Error(NO_ENTRA(church));
  }
  const person = await getDoc(personRef(churchId, key));
  if (!person.exists()) {
    await setDoc(personRef(churchId, key), { name: base.name, role: 'colaborador', firstSeen: now, lastSeen: now });
    return { churchId, churchName: base.churchName };
  }
  // El nombre no se toca: la persona pudo cambiarlo en Ajustes.
  await updateDoc(personRef(churchId, key), { lastSeen: now });
  return { churchId, churchName: base.churchName };
}

// ---------- Con cuenta de Google ----------

const linksRef = (uid) => doc(db, 'links', uid);
const BLOQUEADA = 'Esta iglesia está bloqueada. Escríbele al encargado del Cancionero.';

/** Iglesias donde puedo entrar con mi cuenta de Google: las que creé (o vinculé como Administrador) y donde soy Director. */
export async function misIglesiasGoogle() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const [owned, links] = await Promise.all([
    getDocs(query(collection(db, 'churches'), where('ownerUid', '==', uid))),
    getDoc(linksRef(uid)).catch(() => null),
  ]);
  const list = owned.docs.map((d) => ({
    churchId: d.id, churchName: d.data().name, role: 'admin', status: d.data().status || 'activa',
  }));
  Object.entries(links?.data()?.churches || {}).forEach(([churchId, l]) => {
    if (!list.some((x) => x.churchId === churchId)) list.push({ churchId, churchName: l.churchName || churchId.toUpperCase(), role: 'director', key: l.key, name: l.name });
  });
  return list.sort((a, b) => a.churchName.localeCompare(b.churchName));
}

/** Entrar con Google a una iglesia de misIglesiasGoogle(): sin contraseña. */
export async function entrarConCuenta(item) {
  const uid = auth.currentUser.uid;
  const now = Date.now();
  const { churchId } = item;
  if (item.role === 'admin') {
    const snap = await getDoc(doc(db, 'churches', churchId));
    const c = snap.data();
    if (c.status === 'bloqueada') throw new Error(BLOQUEADA);
    const name = c.ownerName || c.adminKey;
    await setDoc(sessionRef(churchId, uid), { key: c.adminKey, name, churchName: c.name, role: 'admin' });
    const ex = await getDoc(personRef(churchId, c.adminKey)).catch(() => null);
    await setDoc(personRef(churchId, c.adminKey), {
      ...(ex?.exists() ? {} : { name, firstSeen: now }), role: 'admin', lastSeen: now,
    }, { merge: true });
    return { churchId, churchName: c.name };
  }
  try {
    await setDoc(sessionRef(churchId, uid), { key: item.key, name: item.name, churchName: item.churchName, role: 'director' });
  } catch {
    throw new Error(`No pudiste entrar a ${item.churchName} como Director. Puede que el Administrador te haya cambiado el perfil o que la iglesia esté bloqueada. Entra con tu nombre y contraseña.`);
  }
  await updateDoc(personRef(churchId, item.key), { lastSeen: now }).catch(() => {});
  return { churchId, churchName: item.churchName };
}

/**
 * Crear una iglesia nueva con la cuenta de Google. Queda activa al tiro y quien la crea es su Administrador.
 * No puede haber dos iglesias con el mismo nombre: el id es el nombre sin mayúsculas, tildes ni espacios
 * de más, y Firebase no deja crear un documento que ya existe (aunque dos lo intenten a la vez).
 */
export async function crearIglesia({ church, city = '', name }) {
  const user = auth.currentUser;
  const churchId = keyOf(church);
  const adminKey = keyOf(name);
  if (churchId.length < 3) throw new Error('El nombre de la iglesia debe tener al menos 3 letras.');
  if (church.trim().length > 60) throw new Error('El nombre de la iglesia es muy largo (máximo 60 letras).');
  if (!adminKey) throw new Error('Escribe tu nombre.');
  const ownersRef = doc(db, 'owners', user.uid);
  const prev = await getDoc(ownersRef).catch(() => null);
  const mine = prev?.data()?.churches || [];
  if (mine.length >= 3) throw new Error('Con una cuenta de Google se pueden crear hasta 3 iglesias.');
  const churchName = church.trim().replace(/\s+/g, ' ').toUpperCase();
  const b = writeBatch(db);
  b.set(doc(db, 'churches', churchId), {
    name: churchName, ...(city.trim() ? { city: city.trim().slice(0, 60) } : {}),
    adminKey, ownerName: name.trim().slice(0, 60), ownerUid: user.uid, ownerEmail: user.email || googleMail(user),
    status: 'activa', createdAt: serverTimestamp(),
  });
  b.set(ownersRef, { churches: [...mine, churchId] });
  try {
    await b.commit();
  } catch (e) {
    if (e.code === 'unavailable') throw new Error('No hay conexión a internet.');
    throw new Error(`Ya existe una iglesia llamada "${churchName}" (o con un nombre igual sin contar tildes ni mayúsculas). Prueba con otro nombre, por ejemplo agregando tu ciudad o comuna.`);
  }
  return entrarConCuenta({ churchId, role: 'admin' });
}
const googleMail = (u) => u.providerData?.find((p) => p.providerId === 'google.com')?.email || '';

/** Vincular la cuenta de Google con mi perfil en esta iglesia (Administrador o Director). */
export async function vincularPerfil({ churchId, churchName, role, key, name }) {
  const user = auth.currentUser;
  if (role === 'admin') {
    await updateDoc(doc(db, 'churches', churchId), { ownerUid: user.uid, ownerEmail: user.email || googleMail(user) });
  } else if (role === 'director') {
    await updateDoc(personRef(churchId, key), { uid: user.uid });
    await setDoc(linksRef(user.uid), { churches: { [churchId]: { key, name, churchName } } }, { merge: true });
  }
}

// ---------- Super Admin ----------

export async function soySuperAdmin() {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  try {
    return (await getDoc(doc(db, 'superadmins', uid))).exists();
  } catch {
    return false;
  }
}

const SUBCOLECCIONES = ['sessions', 'people', 'private', 'songs', 'events', 'participations', 'favorites', 'suggestions'];

/** Todas las iglesias (solo Super Admin). */
export async function todasLasIglesias() {
  const snap = await getDocs(collection(db, 'churches'));
  return snap.docs.map((d) => {
    const { adminPin, adminPassword, accessCode, ...rest } = d.data(); // eslint-disable-line no-unused-vars
    return { ...rest, id: d.id, createdAt: rest.createdAt?.toMillis?.() || null, conCodigo: Boolean(accessCode) };
  });
}

/** Cuántos miembros, canciones, eventos… tiene una iglesia, y cuándo entró alguien por última vez. */
export async function actividadIglesia(churchId) {
  const base = doc(db, 'churches', churchId);
  const contar = (n) => getCountFromServer(collection(base, n)).then((r) => r.data().count).catch(() => null);
  const [miembros, canciones, eventos, inscripciones, ultimo, ultimaCancion] = await Promise.all([
    contar('people'), contar('songs'), contar('events'), contar('participations'),
    getDocs(query(collection(base, 'people'), orderBy('lastSeen', 'desc'), limit(1))).catch(() => null),
    getDocs(query(collection(base, 'songs'), orderBy('updatedAt', 'desc'), limit(1))).catch(() => null),
  ]);
  const ultimaVez = Math.max(ultimo?.docs[0]?.data().lastSeen || 0, ultimaCancion?.docs[0]?.data().updatedAt || 0) || null;
  return { miembros, canciones, eventos, inscripciones, ultimaVez };
}

/** Totales que no son de una iglesia (biblioteca compartida). */
export async function actividadGeneral() {
  const compartidas = await getCountFromServer(collection(db, 'library')).then((r) => r.data().count).catch(() => null);
  return { compartidas };
}

export async function cambiarEstadoIglesia(churchId, status) {
  await updateDoc(doc(db, 'churches', churchId), { status });
}

/** Borra una iglesia con todo lo que tiene (solo Super Admin). No se puede deshacer. */
export async function eliminarIglesia(iglesia) {
  const base = doc(db, 'churches', iglesia.id);
  for (const n of SUBCOLECCIONES) {
    const snap = await getDocs(collection(base, n));
    await commitAll(snap.docs.map((d) => (b) => b.delete(d.ref)));
  }
  const lib = await getDocs(query(collection(db, 'library'), where('churchId', '==', iglesia.id)));
  await commitAll(lib.docs.map((d) => (b) => b.delete(d.ref)));
  await deleteDoc(base);
  if (iglesia.ownerUid) {
    await updateDoc(doc(db, 'owners', iglesia.ownerUid), { churches: arrayRemove(iglesia.id) }).catch(() => {});
  }
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
  const [favorites, setFavorites] = useState([]);
  const [myNotes, setMyNotesState] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  // La sesión venció: cambió el PIN, el perfil o el código de acceso. Hay que volver a entrar
  // (al entrar de nuevo, CloudRoot vuelve a crear este componente desde cero).
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(sessionRef(churchId, user.uid), (s) => setMySession(s.exists() ? s.data() : null), () => setMySession(null));
    return unsub;
  }, [churchId, user.uid]);

  useEffect(() => {
    if (!mySession) return undefined;
    const base = doc(db, 'churches', churchId);
    const fail = (e) => (e.code === 'permission-denied' ? setExpired(true) : setError(e.message));
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

  // Favoritas: un documento por persona que solo esa persona puede leer.
  const myKey = mySession?.key;
  useEffect(() => {
    if (!myKey) return undefined;
    return onSnapshot(doc(db, 'churches', churchId, 'favorites', myKey), (s) => { setFavorites(s.data()?.songs || []); setMyNotesState(s.data()?.notes || {}); }, () => setFavorites([]));
  }, [churchId, myKey]);

  // Sugerencias de mejoras: solo el Administrador las lee.
  const canReview = mySession?.role === 'admin';
  useEffect(() => {
    if (!myKey || !canReview) { setSuggestions([]); return undefined; }
    return onSnapshot(collection(db, 'churches', churchId, 'suggestions'), (s) => setSuggestions(
      s.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => b.at - a.at),
    ), () => setSuggestions([]));
  }, [churchId, myKey, canReview]);

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

  // Contador de oraciones por el proyecto (uno para toda la app).
  const [prayers, setPrayers] = useState(null);
  useEffect(() => {
    if (!myKey) return undefined;
    return onSnapshot(doc(db, 'stats', 'oracion'), (s) => setPrayers(s.data()?.count || 0), () => setPrayers(null));
  }, [myKey]);
  const pray = useCallback(() => {
    setDoc(doc(db, 'stats', 'oracion'), { count: increment(1) }, { merge: true }).catch(report);
  }, [report]);

  /** Cambiar el nombre que ven los demás (la persona sigue siendo la misma). */
  const updateMyName = useCallback((name) => {
    if (!myKey) return Promise.resolve();
    return updateDoc(personRef(churchId, myKey), { name: name.trim().slice(0, 60) });
  }, [churchId, myKey]);

  /** Equipos en los que sirvo (para inscribirme más rápido en los eventos). */
  const setMyTeams = useCallback((teams) => {
    if (!myKey) return;
    updateDoc(personRef(churchId, myKey), { teams: teams.slice(0, 12) }).catch(report);
  }, [churchId, myKey, report]);

  const toggleFavorite = useCallback((songId) => {
    if (!myKey) return;
    const next = favorites.includes(songId) ? favorites.filter((x) => x !== songId) : [...favorites, songId];
    setFavorites(next);
    setDoc(doc(col('favorites'), myKey), { songs: next.slice(-500) }, { merge: true }).catch(report);
  }, [myKey, favorites, col, report]);

  /** Mis notas de una canción (solo yo las veo). */
  const setMyNotes = useCallback((songId, list) => {
    if (!myKey) return;
    setMyNotesState((n) => ({ ...n, [songId]: list }));
    setDoc(doc(col('favorites'), myKey), { notes: { [songId]: list.slice(0, 40) } }, { merge: true }).catch(report);
  }, [myKey, col, report]);

  /** Sugerir una corrección o comentario. Devuelve una promesa. */
  const sendSuggestion = useCallback(({ text, songId = '', songTitle = '' }) => addDoc(col('suggestions'), {
    text: text.trim().slice(0, 1000), songId, songTitle: songTitle.slice(0, 120),
    personKey: mySession?.key || '', name: mySession?.name || '', at: Date.now(),
  }), [col, mySession?.key, mySession?.name]);

  const resolveSuggestion = useCallback((id) => {
    deleteDoc(doc(col('suggestions'), id)).catch(report);
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
    const nuevas = localSongs.filter((s) => !existing.has(normalize(s.title)));
    await commitAll(nuevas.map((s) => (b) => b.set(doc(col('songs')), { ...sinId(s), updatedAt: Date.now() })));
    return nuevas.length;
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

  // ---------- Código de acceso (solo el administrador) ----------
  const getAccessCode = useCallback(async () => (await getDoc(doc(db, 'churches', churchId))).data()?.accessCode || '', [churchId]);
  const setAccessCode = useCallback((code) => updateDoc(doc(db, 'churches', churchId), {
    accessCode: code ? cleanCode(code) : deleteField(),
  }), [churchId]);

  /** Restaurar un respaldo: vuelve a guardar canciones y eventos con su mismo id. */
  const restoreBackup = useCallback(async (data) => {
    if (!data || !Array.isArray(data.songs)) throw new Error('El archivo no es un respaldo del Cancionero.');
    const ops = [
      ...data.songs.filter((s) => s.id && s.title).map((s) => (b) => b.set(doc(col('songs'), s.id), { ...sinId(s), updatedAt: Date.now() })),
      ...(Array.isArray(data.events) ? data.events : []).filter((e) => e.id && e.name).map((e) => (b) => b.set(doc(col('events'), e.id), sinId(e))),
    ];
    await commitAll(ops);
    return { songs: data.songs.length, events: (data.events || []).length };
  }, [col]);

  // ---------- Iglesia de prueba: llenar con datos inventados y reiniciar ----------
  const isTest = churchId === PRUEBA_ID;
  const fillTestData = useCallback(async () => {
    if (!isTest) throw new Error('Solo en la iglesia de prueba.');
    const d = datosPrueba();
    const ops = [
      ...d.people.filter((p) => p.key !== mySession?.key).map(({ key, ...p }) => (b) => b.set(personRef(churchId, key), p)),
      ...d.songs.map((s) => (b) => b.set(doc(col('songs'), s.id), { ...sinId(s), updatedAt: Date.now() })),
      ...d.events.map((e) => (b) => b.set(doc(col('events'), e.id), sinId(e))),
    ];
    await commitAll(ops);
    // Las inscripciones necesitan que los eventos ya existan.
    await commitAll(d.participations.map((p) => (b) => b.set(doc(col('participations'), p.id), sinId(p))));
    return d;
  }, [isTest, churchId, col, mySession?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const resetTestChurch = useCallback(async () => {
    if (!isTest) throw new Error('Solo en la iglesia de prueba.');
    const [ps, ss, es, sg] = await Promise.all(['participations', 'songs', 'events', 'suggestions'].map((n) => getDocs(col(n))));
    await commitAll([...ps.docs, ...ss.docs, ...es.docs, ...sg.docs].map((d) => (b) => b.delete(d.ref)));
    await commitAll(people.filter((p) => p.key !== mySession?.key && p.role !== 'admin').map((p) => (b) => b.delete(personRef(churchId, p.key))));
  }, [isTest, churchId, col, people, mySession?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perfil efectivo (igual que en las reglas): si el administrador cambió el perfil,
  // el que vale es el menor hasta que la persona vuelva a entrar con su PIN.
  const person = mySession ? people.find((p) => p.key === mySession.key) : null;
  let role = mySession?.role || 'colaborador';
  if (role === 'director' && person && person.role !== 'director') role = 'colaborador';
  const can = ROLES[role] || ROLES.colaborador;
  const me = mySession === undefined ? undefined : expired ? null : mySession && { name: person?.name || mySession.name, key: mySession.key, teams: person?.teams || [] };
  const church = { id: churchId, name: churchName };

  const value = useMemo(() => ({
    mode: 'cloud', churchId, church, me, role, can, people, songs, events, participations, error,
    clearError: () => setError(''), saveSong, deleteSong, saveEvent, deleteEvent, joinEvent, leaveEvent, setPersonRole, removePerson, uploadLocal, addExamples, myShares, shareSong, unshareSong, loadLibrary,
    favorites, toggleFavorite, suggestions, sendSuggestion, resolveSuggestion, prayers, pray, updateMyName, setMyTeams, isTest, fillTestData, resetTestChurch, getAccessCode, setAccessCode, restoreBackup, myNotes, setMyNotes,
  }), [churchId, church.name, me?.name, me?.key, expired, role, can, people, songs, events, participations, error, saveSong, deleteSong, saveEvent, deleteEvent, joinEvent, leaveEvent, setPersonRole, removePerson, uploadLocal, addExamples, myShares, shareSong, unshareSong, loadLibrary, favorites, toggleFavorite, suggestions, sendSuggestion, resolveSuggestion, prayers, pray, updateMyName, setMyTeams, person?.teams?.join('|'), isTest, fillTestData, resetTestChurch, getAccessCode, setAccessCode, restoreBackup, myNotes, setMyNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
