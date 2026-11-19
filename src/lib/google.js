import {
  GoogleAuthProvider, linkWithCredential, linkWithPopup, signInWithCredential, signInWithPopup, signOut,
} from 'firebase/auth';
import { auth, useEmulator } from './firebase.js';

// Inicio con Google (opcional). Sirve para crear una iglesia, para que el Administrador
// o un Director entren sin escribir su contraseña, y para la página de Super Admin.
// Los Colaboradores siguen entrando como siempre, sin cuenta de Google.

/** ¿La persona entró con una cuenta de Google? */
export function googleEmail(user = auth?.currentUser) {
  if (!user) return '';
  const g = user.providerData?.find((p) => p.providerId === 'google.com');
  return g ? g.email || user.email || '' : '';
}

const MENSAJES = {
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Se cerró la ventana de Google antes de terminar.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para esta página y vuelve a intentarlo.',
  'auth/operation-not-allowed': 'El inicio con Google todavía no está activado en Firebase.',
  'auth/unauthorized-domain': 'Esta página todavía no está autorizada en Firebase para usar Google.',
  'auth/network-request-failed': 'No hay conexión a internet.',
};
export const mensajeGoogle = (e) => MENSAJES[e?.code] || e?.message || 'No se pudo entrar con Google.';

/**
 * Entrar con Google. Si el equipo ya tenía una sesión anónima, se le "vincula" la cuenta
 * (así no se pierde la iglesia abierta). Si esa cuenta de Google ya se había usado antes,
 * se entra con ella (y puede que haya que volver a entrar a la iglesia).
 * Devuelve { user, changed } (changed = cambió el usuario).
 */
export async function entrarConGoogle() {
  // Solo para pruebas con el emulador (sin ventana de Google): window.__googlePrueba = 'correo@gmail.com'
  if (useEmulator && window.__googlePrueba) return entrarDePrueba(window.__googlePrueba);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      const r = await linkWithPopup(current, provider);
      await r.user.getIdToken(true); // para que las reglas ya vean la cuenta de Google
      return { user: r.user, changed: false };
    } catch (e) {
      if (e.code !== 'auth/credential-already-in-use' && e.code !== 'auth/email-already-in-use') throw e;
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (!cred) throw e;
      const r = await signInWithCredential(auth, cred);
      return { user: r.user, changed: true };
    }
  }
  if (current && googleEmail(current)) return { user: current, changed: false };
  const r = await signInWithPopup(auth, provider);
  return { user: r.user, changed: true };
}

export const salirDeGoogle = () => signOut(auth);

async function entrarDePrueba(email) {
  const cred = GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true }));
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      const r = await linkWithCredential(current, cred);
      await r.user.getIdToken(true);
      return { user: r.user, changed: false };
    } catch (e) {
      if (e.code !== 'auth/credential-already-in-use') throw e;
    }
  }
  const r = await signInWithCredential(auth, cred);
  return { user: r.user, changed: true };
}
