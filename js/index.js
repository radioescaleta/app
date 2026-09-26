// js/index.js
import { authService } from './services/authService.js';
import { dbService } from './services/dbService.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnNewProgram = document.getElementById('btnNewProgram');
    
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const programsList = document.getElementById('programsList');

    authService.onAuthStateChanged((user) => {
        if (user) {
            // Usuario logueado
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            userProfile.classList.remove('hidden');
            userName.innerText = user.displayName || user.email || "Usuario";
            loadPrograms(user.uid);
        } else {
            // No logueado
            loginSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            userProfile.classList.add('hidden');
        }
    });

    btnLogin.addEventListener('click', async () => {
        try {
            const user = await authService.login();
            // Si es demo, guardamos
            if (user && user.uid === "demo123") {
                localStorage.setItem("demoUser", JSON.stringify(user));
                window.location.reload();
            }
        } catch (error) {
            alert("Error al iniciar sesión");
        }
    });

    btnLogout.addEventListener('click', async () => {
        await authService.logout();
        localStorage.removeItem("demoUser");
        window.location.reload();
    });

    btnNewProgram.addEventListener('click', () => {
        // Redirigir al editor para un programa nuevo
        window.location.href = 'editor.html';
    });

    async function loadPrograms(userId) {
        programsList.innerHTML = '<p>Cargando programas...</p>';
        const programs = await dbService.getPrograms(userId);
        
        programsList.innerHTML = '';
        if (programs.length === 0) {
            programsList.innerHTML = '<p>No tienes programas. ¡Crea uno nuevo!</p>';
            return;
        }

        programs.forEach(program => {
            const card = document.createElement('div');
            card.className = 'program-card';
            
            const date = new Date(program.createdAt).toLocaleDateString();
            
            card.innerHTML = `
                <h3>${program.title}</h3>
                <p><small>Creado: ${date}</small></p>
                <div class="program-actions">
                    <a href="editor.html?id=${program.id}" class="btn btn-primary" style="flex:1;">Editar</a>
                </div>
            `;
            programsList.appendChild(card);
        });
    }
});
