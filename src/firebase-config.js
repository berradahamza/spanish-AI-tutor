// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAmUDLm6VWbOChCe3D96yuTSM-AuYgb3gA",
  authDomain: "ai-spanish-tutor.firebaseapp.com",
  projectId: "ai-spanish-tutor",
  storageBucket: "ai-spanish-tutor.firebasestorage.app",
  messagingSenderId: "554378886566",
  appId: "1:554378886566:web:f80a73f8ba439bc7c9e367",
  measurementId: "G-MBYPFLRY1Y"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// Export des services pour les composants Vue
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = getAnalytics(app);