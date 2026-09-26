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

    authService.onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario logueado
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            userProfile.classList.remove('hidden');
            userName.innerText = user.displayName || user.email || "Usuario";
            await dbService.saveUser(user);
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
            Swal.fire("Error", "Error al iniciar sesión", "error");
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
            
            const isOwner = program.ownerId === userId;
            const badge = program.shared ? '<span style="background: #9c27b0; color: white; padding: 2px 5px; border-radius: 3px; font-size: 12px; float: right;">Compartido</span>' : '';
            
            card.innerHTML = `
                <h3>${program.title} ${badge}</h3>
                <p><small>Creado: ${date}</small></p>
                <div class="program-actions">
                    <a href="editor.html?id=${program.id}" class="btn btn-primary" style="flex:1;">Editar</a>
                    ${isOwner ? `<button class="btn btn-secondary btn-delete" data-id="${program.id}" style="background-color: #f44336;"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            `;
            programsList.appendChild(card);
        });

        // Eventos para botones de borrar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const btnEl = e.currentTarget;
                                const result = await Swal.fire({
                    title: '¿Borrar programa?',
                    text: "Esta acción no se puede deshacer.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#f44336',
                    cancelButtonColor: '#607d8b',
                    confirmButtonText: 'Sí, borrar',
                    cancelButtonText: 'Cancelar'
                });
                
                if (result.isConfirmed) {
                    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    btnEl.disabled = true;
                    try {
                        await dbService.deleteProgram(btnEl.dataset.id);
                        loadPrograms(userId);
                        Swal.fire('¡Borrado!', 'Tu programa ha sido eliminado.', 'success');
                    } catch (error) {
                        console.error(error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error al borrar',
                            text: error.message,
                            footer: 'Asegúrate de haber desplegado firestore.rules en Firebase.'
                        });
                        btnEl.innerHTML = '<i class="fa-solid fa-trash"></i>';
                        btnEl.disabled = false;
                    }
                }
            });
        });
    }
});
