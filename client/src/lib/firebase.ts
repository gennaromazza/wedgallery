import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4mw3dKOvcDBxgIJOo-r-4yUmyv0knxME",
  authDomain: "wedding-gallery-397b6.firebaseapp.com",
  projectId: "wedding-gallery-397b6",
  storageBucket: "wedding-gallery-397b6.firebasestorage.app",
  messagingSenderId: "1072998290999",
  appId: "1:1072998290999:web:8e0d19440d86d15f4f11b2",
  measurementId: "G-SD38R3LJE6"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics in browser environment only
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

export default app;
