import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
import { datosEnVivo } from './envivo.js';

// Se entra con Iglesia + Nombre. Por detrás, cada equipo tiene una sesión anónima de Firebase
// (invisible para la persona) que permite que las reglas de permisos funcionen.

// Cada persona entra con su cuenta (Google o correo y contraseña). Sin iglesia ve los himnos,
// la biblioteca compartida y sus canciones personales. Puede crear una iglesia o unirse con un código.

const SESSION_KEY = 'cancionero-iglesia-abierta';

export { keyOf };

const AuthContext = createContext(null);

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

/**
 * Cuenta y perfil. user: undefined (cargando) | null (sin cuenta) | usuario de Firebase.
 * profile: users/{uid} { name, email, churches: { id: { name } } }.
 * session: la iglesia abierta { churchId, churchName } o null (vista personal).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [session, setSessionState] = useState(readSession);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    // Las sesiones antiguas (ingreso con iglesia + nombre, sin cuenta) ya no sirven: hay que entrar con Google o correo.
    const conCuenta = u?.providerData?.some((p) => p.providerId === 'google.com' || p.providerId === 'password');
    if (u && (u.isAnonymous || !conCuenta)) { signOut(auth); return; }
    setUser(u || null);
  }), []);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) { setProfile(user === null ? null : undefined); return undefined; }
    return onSnapshot(doc(db, 'users', uid), (s) => setProfile(s.exists() ? s.data() : {}), () => setProfile({}));
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSession = useCallback((s) => {
    setSessionState(s);
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo(() => ({ user, profile, session, setSession }), [user, profile, session, setSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

const personRef = (churchId, key) => doc(db, 'churches', churchId, 'people', key);
const memberRef = (churchId, uid) => doc(db, 'churches', churchId, 'members', uid);
const userRef = (uid) => doc(db, 'users', uid);

/** Código de acceso: solo letras y números, en mayúsculas. */
export const cleanCode = (c = '') => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
/** Código al azar de 6 letras (sin I, O ni L para no confundirlas con números). */
export function randomCode(n = 6) {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  return [...arr].map((x) => abc[x % abc.length]).join('');
}

/** Guarda muchos cambios de a 400 (el máximo de Firebase por envío es 500). */
async function commitAll(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => op(b));
    await b.commit();
  }
}

/** Guardar mi nombre (y correo) en mi perfil. */
export async function guardarPerfil(name) {
  const u = auth.currentUser;
  await setDoc(userRef(u.uid), { name: name.trim().slice(0, 60), email: u.email || '' }, { merge: true });
}

/** Anotar en mi perfil una iglesia a la que pertenezco (para mostrarla en "Mis iglesias"). */
async function anotarIglesia(churchId, churchName) {
  await setDoc(userRef(auth.currentUser.uid), { churches: { [churchId]: { name: churchName } } }, { merge: true });
}
/** Quitar una iglesia de "Mis iglesias". */
export async function olvidarIglesia(churchId) {
  await updateDoc(userRef(auth.currentUser.uid), { [`churches.${churchId}`]: deleteField() }).catch(() => {});
}

/** Unirme a una iglesia (o abrirla, si ya soy miembro). Devuelve { churchId, churchName }. */
async function entrarComoMiembro(churchId, { code = '', role = 'colaborador', name }) {
  const uid = auth.currentUser.uid;
  const now = Date.now();
  const ya = await getDoc(memberRef(churchId, uid)).catch(() => null);
  if (!ya?.exists()) {
    const b = writeBatch(db);
    b.set(memberRef(churchId, uid), { key: uid, name, role, ...(code ? { code } : {}), joinedAt: now });
    b.set(personRef(churchId, uid), { name, uid, role, firstSeen: now, lastSeen: now }, { merge: true });
    await b.commit();
  }
  const c = (await getDoc(doc(db, 'churches', churchId))).data();
  await anotarIglesia(churchId, c.name);
  await updateDoc(personRef(churchId, uid), { lastSeen: now }).catch(() => {});
  return { churchId, churchName: c.name };
}

/** Máximo de iglesias por persona (creadas + unidas). */
export const MAX_IGLESIAS = 3;
const LLENO = `Ya perteneces a ${MAX_IGLESIAS} iglesias, que es el máximo. Para unirte o crear otra, primero sal de una (en Ajustes, dentro de esa iglesia).`;
const codeRef = (code) => doc(db, 'codes', code);

/** Unirse solo con el código de acceso. Siempre entra como Colaborador. */
export async function unirseAIglesia({ code, name, cuantas = 0 }) {
  const clean = cleanCode(code);
  if (clean.length < 4) throw new Error('Escribe el código de acceso (pídeselo al Administrador de tu iglesia).');
  let churchId;
  try {
    const snap = await getDoc(codeRef(clean));
    churchId = snap.data()?.churchId;
  } catch (e) {
    if (e.code === 'unavailable') throw new Error('No hay conexión a internet.');
  }
  if (!churchId) throw new Error('No encontramos una iglesia con ese código. Revísalo con el Administrador de tu iglesia.');
  const ya = await getDoc(memberRef(churchId, auth.currentUser.uid)).catch(() => null);
  if (!ya?.exists() && cuantas >= MAX_IGLESIAS) throw new Error(LLENO);
  try {
    return await entrarComoMiembro(churchId, { code: clean, name });
  } catch {
    throw new Error('Ese código ya no sirve o la iglesia está bloqueada. Pide el código nuevo al Administrador de tu iglesia.');
  }
}

/** Un código al azar que ninguna otra iglesia esté usando. */
async function codigoLibre() {
  for (let i = 0; i < 5; i++) {
    const c = randomCode();
    const snap = await getDoc(codeRef(c)).catch(() => null);
    if (!snap?.exists()) return c;
  }
  return randomCode(8);
}

/** Abrir una de mis iglesias. */
export async function abrirIglesia(churchId, name) {
  try {
    return await entrarComoMiembro(churchId, { name });
  } catch {
    throw new Error('No se pudo abrir esa iglesia: puede que te hayan quitado de ella, que ya no exista o que esté bloqueada.');
  }
}

/**
 * Crear una iglesia nueva. Quien la crea es su Administrador.
 * No puede haber dos iglesias con el mismo nombre: el id es el nombre sin mayúsculas, tildes ni espacios
 * de más, y Firebase no deja crear un documento que ya existe (aunque dos lo intenten a la vez).
 */
export async function crearIglesia({ church, city = '', name, cuantas = 0 }) {
  if (cuantas >= MAX_IGLESIAS) throw new Error(LLENO);
  const user = auth.currentUser;
  const churchId = keyOf(church);
  if (churchId.length < 3) throw new Error('El nombre de la iglesia debe tener al menos 3 letras.');
  if (church.trim().length > 60) throw new Error('El nombre de la iglesia es muy largo (máximo 60 letras).');
  const ownersRef = doc(db, 'owners', user.uid);
  const prev = await getDoc(ownersRef).catch(() => null);
  const mine = prev?.data()?.churches || [];
  if (mine.length >= 3) throw new Error('Con una cuenta se pueden crear hasta 3 iglesias.');
  const churchName = church.trim().replace(/\s+/g, ' ').toUpperCase();
  const now = Date.now();
  const code = await codigoLibre();
  const b = writeBatch(db);
  b.set(codeRef(code), { churchId });
  b.set(doc(db, 'churches', churchId), {
    name: churchName, ...(city.trim() ? { city: city.trim().slice(0, 60) } : {}),
    ownerName: name, ownerUid: user.uid, ownerEmail: user.email || '',
    accessCode: code, status: 'activa', createdAt: serverTimestamp(),
  });
  b.set(ownersRef, { churches: [...mine, churchId] });
  b.set(memberRef(churchId, user.uid), { key: user.uid, name, role: 'admin', joinedAt: now });
  b.set(personRef(churchId, user.uid), { name, uid: user.uid, role: 'admin', firstSeen: now, lastSeen: now });
  try {
    await b.commit();
  } catch (e) {
    if (e.code === 'unavailable') throw new Error('No hay conexión a internet.');
    throw new Error(`Ya existe una iglesia llamada "${churchName}" (o con un nombre igual sin contar tildes ni mayúsculas). Prueba con otro nombre, por ejemplo agregando tu ciudad o comuna.`);
  }
  await anotarIglesia(churchId, churchName);
  return { churchId, churchName };
}

/** Salir de una iglesia (deja de ser miembro). */
export async function salirDeIglesia(churchId) {
  await deleteDoc(memberRef(churchId, auth.currentUser.uid));
  await olvidarIglesia(churchId);
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

const SUBCOLECCIONES = ['members', 'sessions', 'people', 'private', 'songs', 'events', 'participations', 'favorites', 'suggestions', 'live'];

/** Todas las iglesias (solo Super Admin). */
export async function todasLasIglesias() {
  const snap = await getDocs(collection(db, 'churches'));
  return snap.docs.map((d) => {
    const { adminPin, adminPassword, adminKey, accessCode, ...rest } = d.data(); // eslint-disable-line no-unused-vars
    return { ...rest, id: d.id, createdAt: rest.createdAt?.toMillis?.() || null, conCodigo: Boolean(accessCode), codigo: accessCode || '' };
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
  if (iglesia.codigo) await deleteDoc(doc(db, 'codes', iglesia.codigo)).catch(() => {});
  if (iglesia.ownerUid) {
    await updateDoc(doc(db, 'owners', iglesia.ownerUid), { churches: arrayRemove(iglesia.id) }).catch(() => {});
  }
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
  const [peopleDocs, setPeople] = useState([]);
  const [members, setMembers] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [myShares, setMyShares] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [myNotes, setMyNotesState] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  // Ya no puedo ver la iglesia: me sacaron, la borraron o la bloquearon.
  const [expired, setExpired] = useState(false);

  // Mi miembro en esta iglesia (perfil que vale): members/{uid}.
  useEffect(() => {
    const unsub = onSnapshot(memberRef(churchId, user.uid), (s) => setMySession(s.exists() ? s.data() : null), () => setMySession(null));
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
      onSnapshot(collection(base, 'members'), (s) => setMembers(s.docs.map((d) => ({ ...d.data(), uid: d.id }))), fail),
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
  }, [churchId, Boolean(mySession)]); // eslint-disable-line react-hooks/exhaustive-deps

  // En vivo: lo que el director está mostrando ahora (un solo documento por iglesia).
  const [live, setLive] = useState(undefined); // undefined = cargando
  useEffect(() => {
    if (!mySession) return undefined;
    return onSnapshot(doc(db, 'churches', churchId, 'live', 'actual'), (s) => setLive(s.exists() ? s.data() : null), () => setLive(null));
  }, [churchId, Boolean(mySession)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nombre real de la iglesia (como quedó escrito al crearla).
  const [churchDoc, setChurchDoc] = useState(null);
  useEffect(() => {
    if (!mySession) return undefined;
    return onSnapshot(doc(db, 'churches', churchId), (s) => setChurchDoc(s.data() || null), () => {});
  }, [churchId, Boolean(mySession)]); // eslint-disable-line react-hooks/exhaustive-deps

  // El perfil que vale es el del miembro (members); la ficha (people) es lo que se muestra.
  // Fichas sin cuenta (datos de prueba) se ven con su perfil guardado.
  const people = useMemo(() => {
    const roleOf = Object.fromEntries(members.map((m) => [m.uid, m.role]));
    return peopleDocs
      .filter((p) => !p.uid || roleOf[p.key]) // quien salió de la iglesia ya no aparece
      .map((p) => (p.uid ? { ...p, role: roleOf[p.key] } : p));
  }, [peopleDocs, members]);

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

  /** El administrador cambia el perfil (Director o Colaborador). */
  const setPersonRole = useCallback(async (key, role) => {
    const b = writeBatch(db);
    b.update(personRef(churchId, key), { role });
    if (members.some((m) => m.uid === key)) b.update(memberRef(churchId, key), { role });
    await b.commit();
  }, [churchId, members]);

  /** El administrador saca a alguien de la iglesia. */
  const removePerson = useCallback(async (key) => {
    try {
      if (members.some((m) => m.uid === key)) await deleteDoc(memberRef(churchId, key));
      await deleteDoc(personRef(churchId, key));
    } catch (e) { report(e); }
  }, [churchId, members, report]);

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
      churchId, churchName: churchDoc?.name || churchName, songId: song.id,
      title: song.title, author: song.author || '', key: song.key || '', content: song.content || '',
      ...(song.order?.length ? { order: song.order } : {}),
      sharedBy: mySession?.name || '', confirmed: true, sharedAt: Date.now(),
    });
  }, [churchId, churchName, churchDoc?.name, mySession?.name]);

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
  /** Cambiar (o quitar) el código. El nuevo se anota en codes/ y el viejo se borra. */
  const setAccessCode = useCallback(async (code) => {
    const nuevo = code ? cleanCode(code) : '';
    const viejo = (await getDoc(doc(db, 'churches', churchId))).data()?.accessCode || '';
    if (nuevo && nuevo !== viejo) {
      const usado = await getDoc(codeRef(nuevo)).catch(() => null);
      if (usado?.exists() && usado.data().churchId !== churchId) throw new Error('Ese código ya lo usa otra iglesia. Elige otro o toca "Generar al azar".');
    }
    const b = writeBatch(db);
    b.update(doc(db, 'churches', churchId), { accessCode: nuevo || deleteField() });
    if (nuevo) b.set(codeRef(nuevo), { churchId });
    if (viejo && viejo !== nuevo) b.delete(codeRef(viejo));
    await b.commit();
  }, [churchId]);

  // Iglesias creadas antes de que existieran los códigos únicos: anotar su código (solo el Administrador).
  useEffect(() => {
    if (mySession?.role !== 'admin' || !churchDoc?.accessCode) return;
    const code = churchDoc.accessCode;
    getDoc(codeRef(code)).then(async (snap) => {
      if (snap.exists() && snap.data().churchId === churchId) return;
      if (snap.exists()) { // otra iglesia ya lo usa: darle uno nuevo
        await setAccessCode(randomCode());
        return;
      }
      await setDoc(codeRef(code), { churchId });
    }).catch(() => {});
  }, [mySession?.role, churchDoc?.accessCode, churchId, setAccessCode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** El director empieza a pasar la letra, o avisa en qué canción y sección va. */
  const publishLive = useCallback((data) => {
    if (!mySession) return;
    setDoc(doc(db, 'churches', churchId, 'live', 'actual'), datosEnVivo({ ...data, by: user.uid, byName: mySession.name })).catch(report);
  }, [churchId, user.uid, mySession?.name, report]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Terminar el modo en vivo (solo si lo estoy pasando yo, para no cortarle a otro director). */
  const stopLive = useCallback(() => {
    if (!live?.active || live.by !== user.uid) return;
    setDoc(doc(db, 'churches', churchId, 'live', 'actual'), datosEnVivo({ ...live, by: user.uid, byName: live.byName, active: false })).catch(() => {});
  }, [churchId, user.uid, live]);

  const person = mySession ? people.find((p) => p.key === mySession.key) : null;
  const role = mySession?.role || 'colaborador';
  const can = ROLES[role] || ROLES.colaborador;
  const me = mySession === undefined ? undefined : expired ? null : mySession && { name: person?.name || mySession.name, key: mySession.key, teams: person?.teams || [] };
  const church = { id: churchId, name: churchDoc?.name || churchName, ownerUid: churchDoc?.ownerUid };

  const value = useMemo(() => ({
    mode: 'cloud', churchId, church, me, role, can, people, songs, events, participations, error,
    clearError: () => setError(''), saveSong, deleteSong, saveEvent, deleteEvent, joinEvent, leaveEvent, setPersonRole, removePerson, uploadLocal, addExamples, myShares, shareSong, unshareSong, loadLibrary,
    favorites, toggleFavorite, suggestions, sendSuggestion, resolveSuggestion, prayers, pray, updateMyName, setMyTeams, isTest, fillTestData, resetTestChurch, getAccessCode, setAccessCode, restoreBackup, myNotes, setMyNotes, live, publishLive, stopLive, myUid: user.uid,
  }), [churchId, church.name, me?.name, me?.key, expired, role, can, people, songs, events, participations, error, saveSong, deleteSong, saveEvent, deleteEvent, joinEvent, leaveEvent, setPersonRole, removePerson, uploadLocal, addExamples, myShares, shareSong, unshareSong, loadLibrary, favorites, toggleFavorite, suggestions, sendSuggestion, resolveSuggestion, prayers, pray, updateMyName, setMyTeams, person?.teams?.join('|'), isTest, fillTestData, resetTestChurch, getAccessCode, setAccessCode, restoreBackup, myNotes, setMyNotes, live, publishLive, stopLive, user.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
