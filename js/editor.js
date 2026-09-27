// js/editor.js
import { authService } from './services/authService.js';
import { dbService } from './services/dbService.js';
import { driveService } from './services/driveService.js';
import { Program } from './models/Program.js';
import { EscaletaUI } from './components/EscaletaUI.js';
import { AudioBoard } from './components/AudioBoard.js';
import { GanttUI } from './components/GanttUI.js';
import { downloadPDF } from './utils/pdfGenerator.js';

let currentProgram = new Program();
let escaletaUI = null;
let audioBoard = null;

// Librería estática por defecto (rutas relativas)
const defaultLibrary = {
    sintonias: [
        { title: "Sintonía Noticias", url: "./assets/sounds/sintonia1.mp3" },
        { title: "Sintonía Magacín", url: "./assets/sounds/sintonia2.mp3" }
    ],
    efectos: [
        { title: "Aplausos", url: "./assets/sounds/aplausos.mp3" },
        { title: "Risa", url: "./assets/sounds/risa.mp3" }
    ],
    musica: [
        { title: "Fondo Tranquilo", url: "./assets/sounds/fondo1.mp3" }
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
        await initEditor(user);
    });
});

async function initEditor(user) {
    driveService.init();

    // 2. Inicializar Componentes
    audioBoard = new AudioBoard('audioBoard');
    const ganttUI = new GanttUI('ganttContainer');
    
    // Callback cuando la escaleta cambia para actualizar la botonera y el gantt (si está activo)
    const onEscaletaUpdate = () => {
        audioBoard.updateBoard(currentProgram.blocks);
        if (document.body.classList.contains('gantt-active')) {
            ganttUI.render(currentProgram);
        }
    };

    escaletaUI = new EscaletaUI('escaletaList', currentProgram, onEscaletaUpdate);


    // Lógica de grabación de Podcast
    let mediaRecorder;
    let recordedChunks = [];
    let streamRef;

    document.getElementById('btnRecordPodcast').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            // Parar grabación
            mediaRecorder.stop();
            btn.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Grabar Podcast';
            btn.classList.remove('live-active'); // Quitamos parpadeo si lo pusimos
            return;
        }

        try {
            await Swal.fire({
                title: '🎙️ Modo de Grabación',
                html: `
                    <p style="text-align: left;">Para que la grabación capture tanto las <b>sintonías</b> como las <b>voces de texto</b> (las voces operan fuera del navegador):</p>
                    <ol style="text-align: left;">
                        <li>En la ventana que aparecerá, selecciona la pestaña superior <b>"Toda la pantalla"</b>.</li>
                        <li>Haz clic en la imagen de tu pantalla.</li>
                        <li>Marca abajo el interruptor <b>"Compartir audio del sistema"</b>.</li>
                    </ol>
                    <p style="text-align: left; color: #d32f2f; font-size: 0.9em;"><b>Aviso:</b> Si eliges "Pestaña de Chrome", las voces robóticas no se grabarán, solo la música.</p>
                `,
                icon: 'warning',
                confirmButtonText: 'Entendido, ¡a grabar!'
            });

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "browser" },
                
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    sampleRate: 44100
                }
            });

            // Extraemos solo el audio
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                stream.getTracks().forEach(t => t.stop());
                Swal.fire("Sin audio", "No has activado la casilla de 'Compartir audio de la pestaña'. Inténtalo de nuevo.", "error");
                return;
            }

            const audioStream = new MediaStream(audioTracks);
            streamRef = stream;

            mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = (currentProgram.title || "Podcast") + ".webm";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                recordedChunks = [];
                if (streamRef) {
                    streamRef.getTracks().forEach(t => t.stop());
                }
                
                Swal.fire({
                    title: '¡Podcast Guardado!',
                    text: 'Se ha descargado el archivo .webm de tu podcast. Puedes reproducirlo en cualquier navegador o convertirlo a MP3 con un conversor online.',
                    icon: 'success'
                });
            };

            mediaRecorder.start();
            btn.innerHTML = '<i class="fa-solid fa-stop"></i> Parar Grabación';
            btn.classList.add('live-active'); // Usa el parpadeo de live-active
            
        } catch (err) {
            console.error(err);
            Swal.fire("Grabación cancelada", "No se pudo iniciar la captura de audio.", "warning");
        }
    });

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
    const urlParams = new URLSearchParams(window.location.search);
    const programId = urlParams.get('id');

    if (programId) {
        const data = await dbService.getProgramById(programId);
        if (data) {
            currentProgram = Program.fromFirestore(data);
            escaletaUI.program = currentProgram; // Reasignar
            document.getElementById('programTitle').value = currentProgram.title;
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


    // Configuración de Voces TTS
    let availableVoices = [];
    const voiceSelect = document.getElementById('voiceSelect');
    
    function populateVoiceList() {
        if (typeof speechSynthesis === 'undefined') return;
        availableVoices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('es') || v.name.toLowerCase().includes('español') || v.name.toLowerCase().includes('spanish'));
        
        if (availableVoices.length > 0) {
            voiceSelect.style.display = 'inline-block';
            voiceSelect.innerHTML = '';
            availableVoices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.textContent = voice.name;
                option.value = index;
                voiceSelect.appendChild(option);
            });
        }
    }
    
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    setTimeout(populateVoiceList, 500); // Fallback
    
    window.getSelectedVoice = function() {
        if (availableVoices.length > 0 && voiceSelect.value !== "") {
            return availableVoices[voiceSelect.value];
        }
        return null;
    };

    // Modo Directo y Cronómetro
    let timerInterval;
    let timerSeconds = 0;
    const timerDisplay = document.getElementById('timerDisplay');
    const btnTimerPlay = document.getElementById('btnTimerPlay');
    const liveTimer = document.getElementById('liveTimer');

    document.getElementById('btnLiveMode').addEventListener('click', (e) => {
        const isLive = document.body.classList.toggle('live-mode');
        const btn = e.currentTarget;
        const btnRecord = document.getElementById('btnRecordPodcast');
        
        if (isLive) {
            btn.innerHTML = '<i class="fa-solid fa-pen"></i> Modo Edición';
            btn.style.backgroundColor = '#607d8b';
            escaletaUI.setSortable(false);
            liveTimer.classList.remove('hidden');
            btnRecord.style.display = 'inline-block';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i> Modo Directo';
            btn.style.backgroundColor = '#ff9800';
            escaletaUI.setSortable(true);
            liveTimer.classList.add('hidden');
            btnRecord.style.display = 'none';
        }
    });

    btnTimerPlay.addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            btnTimerPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
        } else {
            btnTimerPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
            timerInterval = setInterval(() => {
                timerSeconds++;
                const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
                const s = String(timerSeconds % 60).padStart(2, '0');
                timerDisplay.innerText = `${m}:${s}`;
                
                // Highlight live blocks
                escaletaUI.highlightLiveBlocks(timerSeconds);
                audioBoard.highlightLiveBlocks(timerSeconds);
            }, 1000);
        }
    });

    document.getElementById('btnTimerReset').addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        timerSeconds = 0;
        timerDisplay.innerText = "00:00";
        btnTimerPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    document.getElementById('btnAddText').addEventListener('click', () => {
        escaletaUI.addBlock('text');
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

    // Subir a Drive
    document.getElementById('btnUploadDrive').addEventListener('click', async () => {
        try {
            await driveService.ensureAuthenticated();
        } catch(err) {
            Swal.fire("Error", "No se concedieron permisos de Google Drive o el navegador bloqueó la ventana.", "error");
            return;
        }

        // Creamos un input de archivo invisible para seleccionar el audio local
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.onchange = async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                try {
                    // Muestra algo visual
                    const btn = document.getElementById('btnUploadDrive');
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
                    
                    const result = await driveService.uploadAudio(file);
                    
                    // Añadimos a la escaleta (como efecto por defecto, podría elegirse)
                    window.addAudioWithTimeCalculation(file.name, result.url, 'efectos');
                    
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
                } catch (err) {
                    Swal.fire("Error", "Error subiendo el archivo: " + err, "error");
                    document.getElementById('btnUploadDrive').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
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

if (btnShare) {
    btnShare.onclick = () => shareModal.style.display = "block";
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
            currentProgram.collaborators[collaborator.uid] = role;
            try {
                await dbService.saveProgram(currentProgram.toFirestore());
                Swal.fire("¡Compartido!", `Programa compartido con ${email} como ${role}`, "success");
                shareModal.style.display = "none";
            } catch (e) {
                Swal.fire("Error", "Error al compartir: " + e.message, "error");
            }
        } else {
            Swal.fire("Usuario no encontrado", `No se encontró ningún usuario con el correo ${email}. Debe iniciar sesión en Radioescaleta al menos una vez.`, "warning");
        }
        btnConfirmShare.innerText = "Invitar";
        document.getElementById('shareEmail').value = "";
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

    const items = defaultLibrary[category] || [];
    
    if (items.length === 0) {
        list.innerHTML = '<li>No hay audios disponibles.</li>';
    } else {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'library-item';
            
            const span = document.createElement('span');
            span.innerText = item.title;
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.innerText = 'Seleccionar';
            btn.onclick = () => {
                onSelect({ category, title: item.title, url: item.url });
                modal.style.display = 'none';
            };
            
            li.appendChild(span);
            li.appendChild(btn);
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
