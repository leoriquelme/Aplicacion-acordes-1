// Link público de la música de la iglesia: musicaPublica/{iglesia}, que cualquiera puede leer sin cuenta.
// Solo lleva títulos y links de Spotify/YouTube (nada de personas ni letras). Lo crean el Administrador
// o un Director; después se actualiza solo cada vez que uno de ellos abre la app y cambió el culto.
import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { useStore } from './store.jsx';
import { datosPublicos, mismaMusica, proximoCulto, repertorio } from './musica.js';

const ref = (churchId) => doc(db, 'musicaPublica', churchId);

/** El documento público: undefined mientras carga, null si no está activado. */
export function useMusicaPublica(churchId) {
  const [d, setD] = useState(undefined);
  useEffect(() => {
    if (!churchId || !db) return undefined;
    return onSnapshot(ref(churchId), (s) => setD(s.exists() ? s.data() : null), () => setD(null));
  }, [churchId]);
  return d;
}

/** Lo que debería estar publicado ahora (según las canciones y eventos de la iglesia). */
export function useDatosMusica() {
  const { church, events = [], songs = [] } = useStore();
  return useMemo(() => {
    const now = new Date();
    return datosPublicos({ churchName: church?.name, culto: proximoCulto(events, songs, now), repertorio: repertorio(songs, events, { now }) });
  }, [church?.name, events, songs]);
}

export const activarMusicaPublica = (churchId, datos) => setDoc(ref(churchId), { ...datos, at: Date.now() });
export const quitarMusicaPublica = (churchId) => deleteDoc(ref(churchId));

/** Lee el documento público sin cuenta (para la página /escuchar). */
export async function leerMusicaPublica(churchId) {
  const s = await getDoc(ref(churchId));
  return s.exists() ? s.data() : null;
}

/**
 * Mantiene al día el link público (solo si ya está activado). Va en App para Administrador y Director.
 * Espera unos segundos para no escribir mientras se está armando el culto.
 */
export function SincronizarMusica() {
  const { churchId, eventsReady = true } = useStore();
  const publico = useMusicaPublica(churchId);
  const datos = useDatosMusica();
  useEffect(() => {
    if (!publico || !eventsReady || mismaMusica(publico, datos)) return undefined;
    const t = setTimeout(() => activarMusicaPublica(churchId, datos).catch(() => {}), 8000);
    return () => clearTimeout(t);
  }, [publico, datos, eventsReady, churchId]);
  return null;
}
