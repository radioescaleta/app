// js/editor.js
import { authService } from './services/authService.js?v=2';
import { cloudinaryService } from './services/cloudinaryService.js';
import { setupUserProfile } from './utils/profileUI.js?v=12';
import { dbService } from './services/dbService.js?v=6';
import { Program } from './models/Program.js';
import { EscaletaUI } from './components/EscaletaUI.js?v=6';
import { GanttUI } from './components/GanttUI.js?v=3';
import { downloadPDF } from './utils/pdfGenerator.js?v=2';

let currentProgram = new Program();
let escaletaUI = null;
let sharedLibrary = null; // Se carga desde Firestore

// Librería estática por defecto (rutas relativas)
const defaultLibrary = {
    sintonias: [
        { title: "Sintonía Inicio",    url: "./assets/sounds/sintonias/sintonia-inicio.wav",   icon: "fa-play" },
        { title: "Sintonía Noticias",  url: "./assets/sounds/sintonias/sintonia-noticias.wav", icon: "fa-newspaper" },
        { title: "Final de Programa",  url: "./assets/sounds/sintonias/final-programa.wav",    icon: "fa-flag-checkered" },
        { title: "Jingle Victoria",    url: "./assets/sounds/sintonias/jingle-correcto.wav",   icon: "fa-trophy" }
    ],
    efectos: [
        { title: "Alarma1", url: "./assets/sounds/efectos/Alarma1.mp3", icon: "fa-bell" },
        { title: "Alarma2", url: "./assets/sounds/efectos/Alarma2.mp3", icon: "fa-bell" },
        { title: "Aplausos1", url: "./assets/sounds/efectos/Aplausos1.mp3", icon: "fa-hands-clapping" },
        { title: "Aplausos2", url: "./assets/sounds/efectos/Aplausos2.mp3", icon: "fa-hands-clapping" },
        { title: "Aplausos3", url: "./assets/sounds/efectos/Aplausos3.mp3", icon: "fa-hands-clapping" },
        { title: "Campanas", url: "./assets/sounds/efectos/Campanas.mp3", icon: "fa-bell" },
        { title: "Campanas2", url: "./assets/sounds/efectos/Campanas2.mp3", icon: "fa-bell" },
        { title: "Cartoon_1", url: "./assets/sounds/efectos/Cartoon_1.wav", icon: "fa-face-laugh" },
        { title: "Cartoon2", url: "./assets/sounds/efectos/Cartoon2.mp3", icon: "fa-face-laugh" },
        { title: "Cartoon3", url: "./assets/sounds/efectos/Cartoon3.mp3", icon: "fa-face-laugh" },
        { title: "Cartoon4", url: "./assets/sounds/efectos/Cartoon4.mp3", icon: "fa-face-laugh" },
        { title: "Clank1", url: "./assets/sounds/efectos/Clank1.mp3", icon: "fa-bolt" },
        { title: "Cremallera", url: "./assets/sounds/efectos/Cremallera.mp3", icon: "fa-wave-square" },
        { title: "Golpe", url: "./assets/sounds/efectos/Golpe.mp3", icon: "fa-burst" }
    ],
    musica: [
        { title: "Aspire", url: "./assets/sounds/musica/Aspire.mp3", icon: "fa-music" },
        { title: "Clock", url: "./assets/sounds/musica/Clock.mp3", icon: "fa-clock" },
        { title: "DownTownSaturdayMarket", url: "./assets/sounds/musica/DownTownSaturdayMarket.wav", icon: "fa-music" },
        { title: "FunFolk", url: "./assets/sounds/musica/FunFolk.mp3", icon: "fa-guitar" },
        { title: "Happy_Dreams", url: "./assets/sounds/musica/Happy_Dreams.mp3", icon: "fa-face-smile-beam" },
        { title: "MusicalSmile", url: "./assets/sounds/musica/MusicalSmile.wav", icon: "fa-face-smile-beam" },
        { title: "MusicalSmile2", url: "./assets/sounds/musica/MusicalSmile2.wav", icon: "fa-face-smile-beam" },
        { title: "Sport_Drums", url: "./assets/sounds/musica/Sport_Drums.mp3", icon: "fa-drum" }
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticación (si no está, de vuelta a index)
    authService.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        await dbService.saveUser(user);
        const profile = await dbService.getUserProfile(user.uid) || {};
        setupUserProfile(user, profile);
        // Cargar librería compartida desde Firestore (con fallback a local)
        try {
            const sounds = await dbService.getSoundLibrary();
            if (sounds && sounds.length > 0) {
                sharedLibrary = { sintonias: [], efectos: [], musica: [] };
                sounds.forEach(s => {
                    if (sharedLibrary[s.category]) {
                        sharedLibrary[s.category].push({ title: s.title, url: s.url, icon: s.icon });
                    }
                });
            }
        } catch(e) {
            console.warn('No se pudo cargar la librería de Firestore, usando local:', e);
        }
        await initEditor(user);
    });
});

async function initEditor(user) {
    // 2. Inicializar Componentes
    const ganttUI = new GanttUI('ganttContainer');
    
    // Callback cuando la escaleta cambia para actualizar la botonera y el gantt (si está activo)
    const onEscaletaUpdate = () => {
        if (document.body.classList.contains('gantt-active')) {
            ganttUI.render(currentProgram);
        }
    };

    escaletaUI = new EscaletaUI('escaletaList', currentProgram, onEscaletaUpdate);




    // === MODO SÓLO LECTURA ===
    const urlParams = new URLSearchParams(window.location.search);
    let isReadOnly = urlParams.get('readonly') === '1';

    window.applyReadOnlyMode = function(roleName = "Lector") {
        document.title = `👁️ ${roleName} — ` + document.title;

        // Quitar banner anterior si hay
        const oldBanner = document.getElementById('ro-banner');
        if (oldBanner) oldBanner.remove();

        const banner = document.createElement('div');
        banner.id = 'ro-banner';
        banner.style.cssText = 'background:#1565c0; color:white; text-align:center; padding:8px; font-size:14px; font-weight:bold;';
        banner.innerHTML = `<i class="fa-solid fa-eye"></i> Modo ${roleName} (sólo lectura) — Puedes reproducir el directo pero no guardar cambios.`;
        document.body.insertBefore(banner, document.body.firstChild);

        // Ocultar botones de edición en modo solo lectura
        const editBtns = ['btnSave', 'btnAddText', 'btnAddAudio', 'btnUploadDrive', 'btnShare', 'btnOpenStudio'];
        editBtns.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Deshabilitar auto-save
        if (escaletaUI) escaletaUI.onUpdateCallback = null;
        
        // Deshabilitar Inputs de título
        const pt = document.getElementById('programTitle');
        if (pt) pt.readOnly = true;
    };

    if (isReadOnly) {
        window.applyReadOnlyMode("Supervisión");
    }

    // Controles de Vistas
    const btnViewList = document.getElementById('btnViewList');
    const btnViewGantt = document.getElementById('btnViewGantt');
    
    btnViewList.addEventListener('click', () => {
        document.body.classList.remove('gantt-active');
        btnViewList.style.background = 'var(--primary-color)';
        btnViewGantt.style.background = '#9e9e9e';
    });
    
    btnViewGantt.addEventListener('click', () => {
        document.body.classList.add('gantt-active');
        btnViewGantt.style.background = 'var(--primary-color)';
        btnViewList.style.background = '#9e9e9e';
        ganttUI.render(currentProgram);
    });

    // 3. Cargar programa si hay ID en la URL
    const programId = urlParams.get('id');

    if (programId) {
        const data = await dbService.getProgramById(programId);
        if (data) {
            currentProgram = Program.fromFirestore(data);
            escaletaUI.program = currentProgram; // Reasignar
            document.getElementById('programTitle').value = currentProgram.title;
            
            // Check permissions based on authenticated user
            if (user && currentProgram.ownerId !== user.uid) {
                if (currentProgram.collaborators && currentProgram.collaborators[user.uid] === 'lector') {
                    window.applyReadOnlyMode("Lector");
                }
            }
        }
    } else {
        currentProgram.ownerId = user.uid;
    }

    escaletaUI.render();
    onEscaletaUpdate();

    // 4. Configurar Event Listeners UI
    const titleInput = document.getElementById('programTitle');
    titleInput.addEventListener('input', (e) => {
        currentProgram.title = e.target.value;
    });
    titleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            titleInput.blur();
        }
    });

    // Toast helper
    function showToast(message) {
        Swal.fire({
            toast: true,
            position: 'bottom',
            icon: 'success',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }

    document.getElementById('btnSave').addEventListener('click', async () => {
        try {
            await dbService.saveProgram(currentProgram.toFirestore());
            showToast("Programa guardado correctamente");
            // Si era nuevo, añadir ID a la URL para no crear copias en futuros guardados
            if (!urlParams.has('id')) {
                window.history.replaceState({}, '', `?id=${currentProgram.id}`);
            }
        } catch (e) {
            showToast("Error al guardar: " + e.message);
        }
    });

    document.getElementById('btnDownloadPdf').addEventListener('click', () => {
        ganttUI.render(currentProgram); // Renderizar por si no se había abierto antes
        downloadPDF('escaletaList', `${currentProgram.title}.pdf`);
    });


    // Configuración de Voces TTS (Global)
    window.availableVoices = [];
    function populateVoiceList() {
        if (typeof speechSynthesis === 'undefined') return;
        window.availableVoices = speechSynthesis.getVoices().filter(v => 
            v.lang.startsWith('es') || v.name.toLowerCase().includes('español') || v.name.toLowerCase().includes('spanish')
        );
        window.dispatchEvent(new Event('tts_voices_loaded'));
    }
    
    if (typeof speechSynthesis !== 'undefined') {
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
        setTimeout(populateVoiceList, 500); // Fallback
    }
    
    window.getVoiceByURI = function(uri) {
        if (!window.availableVoices || window.availableVoices.length === 0) return null;
        return window.availableVoices.find(v => v.voiceURI === uri) || window.availableVoices[0];
    };


    document.getElementById('btnAddText').addEventListener('click', () => {
        escaletaUI.addBlock('text');
    });

    // === ABRIR ESTUDIO EN DIRECTO ===
    document.getElementById('btnOpenStudio').addEventListener('click', () => {
        if (!currentProgram.id) {
            Swal.fire('Guarda primero', 'Guarda el programa antes de abrirlo en el Estudio.', 'warning');
            return;
        }
        window.location.href = 'studio.html?id=' + currentProgram.id;
    });

    document.getElementById('btnAddAudio').addEventListener('click', () => {
        openLibraryModal('sintonias', (selected) => {
            window.addAudioWithTimeCalculation(selected.title, selected.url, selected.category);
        });
    });

    // Categorías de audio en el sidebar
    document.querySelectorAll('.audio-category').forEach(el => {
        el.addEventListener('click', () => {
            openLibraryModal(el.dataset.category, (selected) => {
                window.addAudioWithTimeCalculation(selected.title, selected.url, selected.category);
            });
        });
    });

    // Subir a Firebase Storage
    document.getElementById('btnUploadDrive').addEventListener('click', async () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.onchange = async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const btn = document.getElementById('btnUploadDrive');
                try {
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
                    
                    // Usamos Firebase Storage en lugar de Drive
                    // Ask for category before uploading
                    const catResult = await Swal.fire({
                        title: 'Categoría del audio',
                        html: '<p style="margin-bottom:15px;">¿En qué canal del mezclador irá este audio?</p>',
                        input: 'select',
                        inputOptions: {
                            'sintonia': '🎙️ Sintonía (cabecera / cierre)',
                            'efectos': '⚡ Efecto de sonido',
                            'musica': '🎵 Música de fondo',
                        },
                        inputValue: 'efectos',
                        showCancelButton: true,
                        confirmButtonText: 'Subir',
                        confirmButtonColor: '#f06292'
                    });
                    if (!catResult.isConfirmed) {
                        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
                        return;
                    }
                    const chosenCategory = catResult.value;
                    const result = await cloudinaryService.uploadAudio(file);
                    
                    window.addAudioWithTimeCalculation(file.name, result.url, chosenCategory);
                    
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
                } catch (err) {
                    console.error(err);
                    Swal.fire("Error", "Asegúrate de que Firebase Storage está habilitado en tu consola de Firebase.\n" + err.message, "error");
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
                }
            }
        };
        fileInput.click();
    });
}

// Lógica de Modales
const modal = document.getElementById('libraryModal');
const closeBtn = document.querySelector('.close-modal');

// Lógica Modal Bibliotecas Externas
const externalLibsModal = document.getElementById('externalLibsModal');
const btnExternalLibs = document.getElementById('btnExternalLibs');
const closeExternalLibs = document.getElementById('closeExternalLibs');

if (btnExternalLibs) {
    btnExternalLibs.onclick = () => externalLibsModal.style.display = "block";
}
if (closeExternalLibs) {
    closeExternalLibs.onclick = () => externalLibsModal.style.display = "none";
}

// Lógica Modal Compartir
const shareModal = document.getElementById('shareModal');
const btnShare = document.getElementById('btnShare');
const closeShareModal = document.getElementById('closeShareModal');
const btnConfirmShare = document.getElementById('btnConfirmShare');

window.renderCollaborators = async function() {
    const list = document.getElementById('collaboratorsList');
    const loading = document.getElementById('collaboratorsLoading');
    list.innerHTML = '';
    loading.style.display = 'block';
    
    if (!currentProgram.collaborators || Object.keys(currentProgram.collaborators).length === 0) {
        loading.style.display = 'none';
        list.innerHTML = '<li style="color: #666; font-size: 13px; text-align: center;">No hay colaboradores aún.</li>';
        return;
    }
    
    const owner = await dbService.getUserProfile(currentProgram.ownerId);
    let html = `<li style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f5f5f5; border-radius: 5px;">
        <span style="font-size: 14px;"><b>${owner ? owner.email : 'Dueño'}</b> <span style="color:#888; font-size: 12px;">(Propietario)</span></span>
    </li>`;

    for (const [uid, role] of Object.entries(currentProgram.collaborators)) {
        const user = await dbService.getUserProfile(uid);
        if (user) {
            html += `<li style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; border-radius: 5px;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 14px;"><b>${user.email}</b></span>
                    <span style="font-size: 12px; color: #666; text-transform: capitalize;">${role}</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-sm" onclick="changeCollaboratorRole('${uid}', '${role === 'editor' ? 'lector' : 'editor'}')" title="Cambiar a ${role === 'editor' ? 'Lector' : 'Editor'}" style="padding: 5px 8px; font-size: 12px; background: #e0e0e0; color: #333;"><i class="fa-solid fa-rotate"></i></button>
                    <button class="btn btn-secondary btn-sm" onclick="removeCollaborator('${uid}')" title="Quitar acceso" style="padding: 5px 8px; font-size: 12px; background: #ffebee; color: #d32f2f;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>`;
        }
    }
    loading.style.display = 'none';
    list.innerHTML = html;
};

window.changeCollaboratorRole = async function(uid, newRole) {
    currentProgram.collaborators[uid] = newRole;
    try {
        await dbService.saveProgram(currentProgram.toFirestore());
        window.renderCollaborators();
    } catch(e) {
        Swal.fire("Error", e.message, "error");
    }
};

window.removeCollaborator = async function(uid) {
    delete currentProgram.collaborators[uid];
    try {
        await dbService.saveProgram(currentProgram.toFirestore());
        window.renderCollaborators();
    } catch(e) {
        Swal.fire("Error", e.message, "error");
    }
};

if (btnShare) {
    btnShare.onclick = () => {
        shareModal.style.display = "block";
        window.renderCollaborators();
    };
}
if (closeShareModal) {
    closeShareModal.onclick = () => shareModal.style.display = "none";
}

if (btnConfirmShare) {
    btnConfirmShare.onclick = async () => {
        const email = document.getElementById('shareEmail').value.trim();
        const role = document.getElementById('shareRole').value;
        if (!email) return;

        btnConfirmShare.innerText = "Buscando...";
        const collaborator = await dbService.getUserByEmail(email);
        
        if (collaborator) {
            if (!currentProgram.collaborators) currentProgram.collaborators = {};
            currentProgram.collaborators[collaborator.uid] = role;
            try {
                await dbService.saveProgram(currentProgram.toFirestore());
                document.getElementById('shareEmail').value = "";
                window.renderCollaborators();
            } catch (e) {
                Swal.fire("Error", "Error al compartir: " + e.message, "error");
            }
        } else {
            Swal.fire("Usuario no encontrado", `No se encontró ningún usuario con el correo ${email}. Debe iniciar sesión en Radioescaleta al menos una vez.`, "warning");
        }
        btnConfirmShare.innerText = "Invitar";
    };
}

closeBtn.onclick = function() {
    modal.style.display = "none";
}
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
    if (event.target == externalLibsModal) {
        externalLibsModal.style.display = "none";
    }
    if (event.target == shareModal) {
        shareModal.style.display = "none";
    }
}

function openLibraryModal(category, onSelect) {
    const list = document.getElementById('libraryList');
    list.innerHTML = '';
    
    let titleMap = {
        'sintonias': 'Sintonías',
        'efectos': 'Efectos',
        'musica': 'Música de Fondo'
    };
    
    document.getElementById('modalTitle').innerText = titleMap[category];

    // Usar la librería de Firestore si está disponible, si no la local
    const library = sharedLibrary || defaultLibrary;
    const items = library[category] || [];
    
    if (items.length === 0) {
        list.innerHTML = '<li style="color:#aaa; padding:10px;">No hay audios en esta categoría.</li>';
    } else {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'library-item';
            
            const icon = item.icon ? `<i class="fa-solid ${item.icon}" style="margin-right:6px; color:#f06292;"></i>` : '';
            
            const span = document.createElement('span');
            span.innerHTML = icon + item.title;
            
            // Mini play button
            const btnPlay = document.createElement('button');
            btnPlay.className = 'btn btn-secondary';
            btnPlay.style.cssText = 'padding:4px 8px; font-size:12px; background:transparent; color:#888; border:1px solid #ddd;';
            btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            let previewAudio = null;
            btnPlay.onclick = (e) => {
                e.stopPropagation();
                if (previewAudio) { previewAudio.pause(); previewAudio = null; btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>'; return; }
                previewAudio = new Audio(item.url);
                previewAudio.play();
                btnPlay.innerHTML = '<i class="fa-solid fa-stop"></i>';
                previewAudio.onended = () => { btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>'; previewAudio = null; };
            };
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.style.cssText = 'padding:4px 10px; font-size:12px;';
            btn.innerText = 'Usar';
            btn.onclick = () => {
                if (previewAudio) previewAudio.pause();
                onSelect({ category, title: item.title, url: item.url });
                modal.style.display = 'none';
            };
            
            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex; gap:5px;';
            actions.appendChild(btnPlay);
            actions.appendChild(btn);
            
            li.appendChild(span);
            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    modal.style.display = "block";
}

// Exponer addIntegratedAudio globalmente
window.addIntegratedAudio = function(title, url, category) {
    window.addAudioWithTimeCalculation(title, url, category);
    const externalLibsModal = document.getElementById('externalLibsModal');
    if (externalLibsModal) {
        externalLibsModal.style.display = "none";
    }
}

window.addAudioWithTimeCalculation = function(title, url, category) {
    import('./utils/timeUtils.js').then(module => {
        const audio = new Audio(url);
        audio.onloadedmetadata = function() {
            const durSec = audio.duration;
            let maxEnd = 0;
            currentProgram.blocks.forEach(b => {
                const e = module.timeToSeconds(b.endTime);
                if (e > maxEnd) maxEnd = e;
            });
            
            const startSec = maxEnd;
            const endSec = Math.floor(startSec + durSec);
            
            escaletaUI.addBlock('audio', {
                title: title,
                audioUrl: url,
                category: category,
                startTime: module.secondsToTime(startSec),
                endTime: module.secondsToTime(endSec),
                maxDuration: durSec
            });
        };
        
        audio.onerror = function() {
            escaletaUI.addBlock('audio', { title: title, audioUrl: url, category: category });
        };
    });
};
