import { initializeApp, getApps } from "firebase/app";

// Firebase configuration - will be populated from env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA_dummy_key_for_fcm_registration",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'jhumroo-e265a'}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jhumroo-e265a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'jhumroo-e265a'}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "175974873085",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:175974873085:web:0f419c8f2ba12a83236789",
};

// Initialize Firebase app only once
let app;

try {
  const existingApps = getApps();
  if (existingApps.length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("🚀 [Firebase] initialized successfully with public config");
  } else {
    app = existingApps[0];
  }
} catch (error) {
  console.error("❌ [Firebase] initialization error:", error);
}

export const firebaseApp = app;
