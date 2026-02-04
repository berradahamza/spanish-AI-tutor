// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmUDLm6VWbOChCe3D96yuTSM-AuYgb3gA",
  authDomain: "ai-spanish-tutor.firebaseapp.com",
  projectId: "ai-spanish-tutor",
  storageBucket: "ai-spanish-tutor.firebasestorage.app",
  messagingSenderId: "554378886566",
  appId: "1:554378886566:web:f80a73f8ba439bc7c9e367",
  measurementId: "G-MBYPFLRY1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);