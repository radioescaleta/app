// js/index.js
import { authService } from './services/authService.js?v=2';
import { setupUserProfile } from './utils/profileUI.js?v=8';
import { dbService } from './services/dbService.js?v=5';

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnNewProgram = document.getElementById('btnNewProgram');
    
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const programsList = document.getElementById('programsList');
    const btnPanelDocente = document.getElementById('btnPanelDocente');
    const btnPanelAdmin = document.getElementById('btnPanelAdmin');

    authService.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Verificar si el usuario está invitado y obtener su perfil
                const profile = await dbService.loginUser(user);
                
                loginSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');
                userProfile.classList.remove('hidden');
                setupUserProfile(user, profile);

                // Mostrar badge de rol
                if (userRoleBadge) {
                    if (profile.role === 'superadmin') {
                        userRoleBadge.style.display = 'none';
                    } else {
                        const roleLabels = {
                            docente: { label: 'Docente', color: '#1565c0' },
                            alumno: { label: profile.clase || 'Alumno', color: '#2e7d32' }
                        };
                        const roleInfo = roleLabels[profile.role] || roleLabels.alumno;
                        userRoleBadge.textContent = roleInfo.label;
                        userRoleBadge.style.backgroundColor = roleInfo.color;
                        userRoleBadge.style.display = 'inline-block';
                    }
                }

                // Mostrar botones de panel según rol
                if (profile.role === 'superadmin' && btnPanelAdmin) {
                    btnPanelAdmin.style.display = 'inline-block';
                }
                if ((profile.role === 'docente' || profile.role === 'superadmin') && btnPanelDocente) {
                    btnPanelDocente.style.display = 'inline-block';
                }
                
                // Guardar perfil en sessionStorage para usar en otras páginas
                sessionStorage.setItem('userProfile', JSON.stringify(profile));

                loadPrograms(user.uid);
            } catch (err) {
                if (err.message === 'ACCESO_DENEGADO') {
                    await authService.logout();
                    Swal.fire({
                        title: '🔒 Acceso Restringido',
                        html: `<p>Esta es una versión <b>beta privada</b> de Radioescaleta.</p>
                               <p>Tu cuenta <b>${user.email}</b> no está en la lista de usuarios invitados.</p>
                               <p>Si crees que debería tener acceso, contacta con el administrador.</p>`,
                        icon: 'warning',
                        confirmButtonText: 'Entendido'
                    });
                } else {
                    console.error(err);
                    await authService.logout();
                    Swal.fire("Error", "Error verificando tu cuenta: " + err.message, "error");
                }
            }
        } else {
            loginSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            userProfile.classList.add('hidden');
            sessionStorage.removeItem('userProfile');
        }
    });

    const btnLogin2 = document.getElementById('btnLogin2');
    if (btnLogin2) {
        btnLogin2.addEventListener('click', async () => {
            try { await authService.login(); } catch (error) { Swal.fire("Error", "Error al iniciar sesión", "error"); }
        });
    }

    btnLogin.addEventListener('click', async () => {
        try {
            await authService.login();
        } catch (error) {
            Swal.fire("Error", "Error al iniciar sesión", "error");
        }
    });

    

    btnNewProgram.addEventListener('click', () => {
        window.location.href = 'editor.html';
    });

    if (btnPanelDocente) {
        btnPanelDocente.addEventListener('click', () => {
            window.location.href = 'docente.html';
        });
    }

    if (btnPanelAdmin) {
        btnPanelAdmin.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    }

    async function loadPrograms(userId) {
        programsList.innerHTML = '<p>Cargando programas...</p>';
        const programs = await dbService.getPrograms(userId);
        
        programsList.innerHTML = '';
        if (programs.length === 0) {
            
            programsList.innerHTML = `
                <div class="empty-dashboard" style="grid-column: 1 / -1;">
                    <div class="empty-dashboard-icon">
                        <i class="fa-solid fa-microphone-lines"></i>
                    </div>
                    <h3>Tu estudio de radio está vacío</h3>
                    <p class="empty-desc">Aún no has creado ninguna escaleta. Empezar es muy sencillo, solo sigue estos tres pasos:</p>
                    
                    <div class="empty-steps">
                        <div class="empty-step">
                            <div class="empty-step-icon"><i class="fa-solid fa-plus"></i></div>
                            <p><b>1. Crea tu programa</b><br>Dale al botón rosa de arriba a la derecha.</p>
                        </div>
                        <div class="empty-step">
                            <div class="empty-step-icon"><i class="fa-solid fa-list"></i></div>
                            <p><b>2. Añade bloques</b><br>Escribe tu guión de locución y añade los audios.</p>
                        </div>
                        <div class="empty-step">
                            <div class="empty-step-icon"><i class="fa-solid fa-play"></i></div>
                            <p><b>3. Modo Directo</b><br>Ensaya y graba tu piloto antes del directo real.</p>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" onclick="document.getElementById('btnNewProgram').click()" style="font-size: 1.1em; padding: 12px 24px; box-shadow: 0 4px 12px rgba(240,98,146,0.3);">
                        <i class="fa-solid fa-plus"></i> Crear mi primer programa
                    </button>
                </div>
            `;

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
                <div class="program-actions" style="display: flex; gap: 8px;">
                    <a href="editor.html?id=${program.id}" class="btn btn-primary" style="flex:1;"><i class="fa-solid fa-pen"></i> Editar</a>
                    <button class="btn btn-secondary btn-clone" data-id="${program.id}" style="background-color: #2196F3;" title="Clonar programa (como plantilla)"><i class="fa-solid fa-copy"></i></button>
                    ${isOwner ? `<button class="btn btn-secondary btn-delete" data-id="${program.id}" style="background-color: #f44336;" title="Borrar"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            `;
            programsList.appendChild(card);
        });

        // Eventos para botones de clonar
        document.querySelectorAll('.btn-clone').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const btnEl = e.currentTarget;
                const programId = btnEl.dataset.id;
                
                const result = await Swal.fire({
                    title: '¿Clonar programa?',
                    text: "Se creará una copia exacta de esta escaleta para que la uses de plantilla.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, clonar',
                    cancelButtonText: 'Cancelar'
                });
                
                if (result.isConfirmed) {
                    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    btnEl.disabled = true;
                    try {
                        const data = await dbService.getProgramById(programId);
                        delete data.id;
                        data.title = data.title + " (Copia)";
                        data.ownerId = userId;
                        data.collaborators = {};
                        data.createdAt = new Date().toISOString();
                        if (data.blocks) {
                            data.blocks.forEach(b => {
                                b.id = 'block_' + Date.now() + Math.random().toString(36).substr(2, 9);
                            });
                        }
                        await dbService.saveProgram(data);
                        Swal.fire({toast: true, position: 'bottom', icon: 'success', title: '¡Programa clonado!', showConfirmButton: false, timer: 3000});
                        loadPrograms(userId);
                    } catch (err) {
                        console.error(err);
                        Swal.fire("Error", "No se pudo clonar: " + err.message, "error");
                        btnEl.innerHTML = '<i class="fa-solid fa-copy"></i>';
                        btnEl.disabled = false;
                    }
                }
            });
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


