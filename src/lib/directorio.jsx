// Directorio de hermanos (voluntario): churches/{c}/directorio/{uid} = { telefono, email, at }.
// Solo aparece quien lo acepta en Mi ficha; lo ven los miembros de la iglesia. Se puede quitar cuando quiera.
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

/** Map uid → { telefono, email } de quienes aceptaron aparecer. */
export function useDirectorio(churchId) {
  const [d, setD] = useState(new Map());
  useEffect(() => {
    if (!churchId || !db) return undefined;
    return onSnapshot(collection(db, 'churches', churchId, 'directorio'), (s) => setD(new Map(s.docs.map((x) => [x.id, x.data()]))), () => setD(new Map()));
  }, [churchId]);
  return d;
}

export const aparecerEnDirectorio = (churchId, uid, { telefono = '', email = '' }) =>
  setDoc(doc(db, 'churches', churchId, 'directorio', uid), { telefono: String(telefono).trim().slice(0, 30), email: String(email).trim().slice(0, 120), at: Date.now() });
export const salirDelDirectorio = (churchId, uid) => deleteDoc(doc(db, 'churches', churchId, 'directorio', uid));
