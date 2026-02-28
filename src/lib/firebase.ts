import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBwzBw77AIbrCTdJ_zuXmISgx24_gCW02A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "leao-medicoes.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "leao-medicoes",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "leao-medicoes.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "247317329402",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:247317329402:web:48cbf965570099eb016043"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

