// Configurazione Firebase per ambiente di produzione
// Sostituire con la tua configurazione Firebase reale
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Esporta la configurazione per l'uso nell'applicazione
window.FIREBASE_CONFIG = firebaseConfig;