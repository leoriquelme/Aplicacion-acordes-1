import {
  createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithCredential,
  signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile,
} from 'firebase/auth';
import { auth, useEmulator } from './firebase.js';
import { guardarPerfil } from './cloud.jsx';

// Entrar al Cancionero: con cuenta de Google o con correo y contraseña.

const MENSAJES = {
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Se cerró la ventana de Google antes de terminar.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para esta página y vuelve a intentarlo.',
  'auth/operation-not-allowed': 'Esta forma de entrar todavía no está activada en Firebase.',
  'auth/unauthorized-domain': 'Esta página todavía no está autorizada en Firebase.',
  'auth/network-request-failed': 'No hay conexión a internet.',
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Toca "Ya tengo cuenta" para entrar.',
  'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  'auth/user-not-found': 'No hay una cuenta con ese correo.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  'auth/account-exists-with-different-credential': 'Ese correo ya tiene cuenta con otra forma de entrar (prueba con Google o con contraseña).',
};
export const mensajeAcceso = (e) => MENSAJES[e?.code] || e?.message || 'No se pudo entrar.';

export async function entrarConGoogle() {
  // Solo para pruebas con el emulador (sin ventana de Google): window.__googlePrueba = 'correo@gmail.com'
  if (useEmulator && window.__googlePrueba) {
    const email = window.__googlePrueba;
    return signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export async function crearCuentaConCorreo({ name, email, password }) {
  if (!name.trim()) throw new Error('Escribe tu nombre.');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const r = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(r.user, { displayName: name.trim() });
  await guardarPerfil(name);
  return r;
}

export const entrarConCorreo = ({ email, password }) => signInWithEmailAndPassword(auth, email.trim(), password);

export const recuperarContrasena = (email) => sendPasswordResetEmail(auth, email.trim());

export const cerrarSesion = () => signOut(auth);
