import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration (Spark Free Plan)
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "missing-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "missing-domain",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "missing-project-id",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "00000000000",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:00000000000:web:000000000000000000"
};

// Initialize Firebase App, Auth, and Firestore ONLY (Zero Firebase Storage / Zero Billing)
let appInstance;
try {
  appInstance = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase initialization failed. Check your environment variables.", e);
  appInstance = initializeApp({ ...firebaseConfig, apiKey: "AIzaSyDummyKeyDummyKeyDummyKeyDummyKeyD" }); // Use a fake syntactically valid key to prevent fatal crash
}

export const app = appInstance;
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Firebase Cloud Messaging (Web Push)
// It may not be supported in all environments (e.g. some mobile browsers / incognito)
export const messagingPromise = isSupported().then(supported => {
  if (supported) {
    return getMessaging(app);
  }
  return null;
});

// Diagnostic: confirm which Firebase project is connected (no secrets printed)
console.log('[firebase.ts] Firebase project:', firebaseConfig.projectId);