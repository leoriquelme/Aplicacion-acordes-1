import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-config.js';

// Para probar sin internet: VITE_EMULATOR=1 npm run dev (con los emuladores de Firebase encendidos).
const useEmulator = import.meta.env.VITE_EMULATOR === '1';
const config = useEmulator ? { apiKey: 'demo', projectId: 'demo-cancionero', authDomain: 'localhost' } : firebaseConfig;

export const cloudEnabled = Boolean(config?.apiKey);

let app, auth, db;
if (cloudEnabled) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    // Guarda una copia en el equipo para que funcione aunque se caiga el internet en el culto.
    localCache: useEmulator ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export { auth, db, useEmulator };
