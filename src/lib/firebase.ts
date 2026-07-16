import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Bring-Your-Own-Key (BYOK) configurations from client-side .env
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "fallback_placeholder_key",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "fallback_placeholder.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "fallback_placeholder_project",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "fallback_placeholder.appspot.com",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000"
};

// Guard: only initialize Firebase when a real API key is provided
const isValidKey =
  firebaseConfig.apiKey !== "fallback_placeholder_key" &&
  firebaseConfig.apiKey.startsWith('AIza');

// Initialize app
let app: any = null;
if (isValidKey) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('Firebase initialization failed, falling back to local sandbox mode:', e);
    app = null;
  }
} else {
  console.warn('No valid Firebase API key detected — running in local sandbox mode.');
}

export { app };

// Initialize core services (null-safe: consumers guard via isFirestoreAvailable / isUsingLocalSandbox)
export const auth = app ? getAuth(app) : null as any;
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(e => console.error("Persistence setting failed:", e));
}

export const db = app ? getFirestore(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

