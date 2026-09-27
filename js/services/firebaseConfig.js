// js/services/firebaseConfig.js
// Importaciones modulares de Firebase SDK 10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// TODO: REEMPLAZA ESTO CON LA CONFIGURACIÓN DE TU PROYECTO DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyARsRiULw0vYLVCR4L5GXgI6Ny7PaAmv8s",
  authDomain: "test-13158.firebaseapp.com",
  projectId: "test-13158",
  storageBucket: "test-13158.firebasestorage.app",
  messagingSenderId: "1085067856726",
  appId: "1:1085067856726:web:fbda437b8789f3edb624f7",
  measurementId: "G-L9LL0VZZHL"
};

// Si los valores no se han modificado, no intentamos inicializar para evitar errores en la demostración
let app, auth, db, provider;

if (firebaseConfig.apiKey !== "API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
} else {
    console.warn("⚠️ Firebase no está configurado. La app funcionará en modo de demostración (local).");
}

export { app, auth, db, provider };
