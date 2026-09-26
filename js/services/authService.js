// js/services/authService.js
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { auth, provider } from "./firebaseConfig.js";

class AuthService {
    constructor() {
        this.currentUser = null;
    }

    // Iniciar sesión
    async login() {
        if (!auth) {
            // Modo demo si Firebase no está configurado
            this.currentUser = { uid: "demo123", displayName: "Usuario Demo", email: "demo@educaand.es" };
            return this.currentUser;
        }

        try {
            const result = await signInWithPopup(auth, provider);
            this.currentUser = result.user;
            return this.currentUser;
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            throw error;
        }
    }

    // Cerrar sesión
    async logout() {
        if (!auth) {
            this.currentUser = null;
            return;
        }
        await signOut(auth);
        this.currentUser = null;
    }

    // Observador del estado de autenticación
    onAuthStateChanged(callback) {
        if (!auth) {
            // Simulamos estado para demo
            const user = localStorage.getItem("demoUser") ? JSON.parse(localStorage.getItem("demoUser")) : null;
            callback(user);
            return;
        }

        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            callback(user);
        });
    }

    getUser() {
        return this.currentUser;
    }
}

export const authService = new AuthService();
