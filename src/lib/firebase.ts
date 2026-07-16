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

// Initialize app
export const app = initializeApp(firebaseConfig);

// Initialize core services
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(e => console.error("Persistence setting failed:", e));

export const db = getFirestore(app);
export const storage = getStorage(app);
