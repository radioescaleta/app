import { authService } from './services/authService.js?v=2';
import { dbService } from './services/dbService.js?v=6';

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const btnLogin2 = document.getElementById('btnLogin2'); // the one in the footer
    
    const loginSection = document.getElementById('loginSection');

    authService.onAuthStateChanged(async (user) => {
        if (user) {
            // Ya está logueado, redirigir al dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Mostrar la landing si no está logueado
            if (loginSection) loginSection.classList.remove('hidden');
        }
    });

    const doLogin = async () => {
        try {
            await authService.login();
            // onAuthStateChanged will redirect
        } catch (error) {
            console.error("Login error:", error);
            // SweetAlert may not be defined if not imported, but index.html has it
            if (typeof Swal !== 'undefined') {
                Swal.fire("Error", "Error al iniciar sesión", "error");
            } else {
                alert("Error al iniciar sesión");
            }
        }
    };

    if (btnLogin) btnLogin.addEventListener('click', doLogin);
    if (btnLogin2) btnLogin2.addEventListener('click', doLogin);
});
