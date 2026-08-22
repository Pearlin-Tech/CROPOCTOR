import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const getEnv = (key: string, fallback: string) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'REDACTED_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'cropoctor.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'cropoctor'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'cropoctor.appspot.com'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789'),
  appId: getEnv('VITE_FIREBASE_APP_ID', '1:123456789:web:abcdef'),
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("[Cropoctor] Firebase initialization error, using fallback mock auth:", error);
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db };