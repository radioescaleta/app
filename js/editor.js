// js/editor.js
import { authService } from './services/authService.js';
import { dbService } from './services/dbService.js';
import { driveService } from './services/driveService.js';
import { Program } from './models/Program.js';
import { EscaletaUI } from './components/EscaletaUI.js';
import { AudioBoard } from './components/AudioBoard.js';
import { downloadPDF } from './utils/pdfGenerator.js';

let currentProgram = new Program();
let escaletaUI = null;
let audioBoard = null;

// Librería estática por defecto (rutas relativas)
const defaultLibrary = {
    sintonias: [
        { title: "Sintonía Noticias", url: "./assets/sounds/sintonia1.ogg" },
        { title: "Sintonía Magacín", url: "./assets/sounds/sintonia2.ogg" }
    ],
    efectos: [
        { title: "Aplausos", url: "./assets/sounds/aplausos.ogg" },
        { title: "Risa", url: "./assets/sounds/risa.ogg" }
    ],
    musica: [
        { title: "Fondo Tranquilo", url: "./assets/sounds/fondo1.ogg" }
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticación (si no está, de vuelta a index)
    authService.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        await initEditor(user);
    });
});

async function initEditor(user) {
    driveService.init();

    // 2. Inicializar Componentes
    audioBoard = new AudioBoard('audioBoard', 'globalAudioPlayer');
    
    // Callback cuando la escaleta cambia para actualizar la botonera
    const onEscaletaUpdate = () => {
        audioBoard.updateBoard(currentProgram.blocks);
    };

    escaletaUI = new EscaletaUI('escaletaList', currentProgram, onEscaletaUpdate);

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
    document.getElementById('programTitle').addEventListener('change', (e) => {
        currentProgram.title = e.target.value;
    });

    document.getElementById('btnSave').addEventListener('click', async () => {
        try {
            await dbService.saveProgram(currentProgram.toFirestore());
            alert("Programa guardado correctamente");
            // Si era nuevo, añadir ID a la URL para no crear copias en futuros guardados
            if (!urlParams.has('id')) {
                window.history.replaceState({}, '', `?id=${currentProgram.id}`);
            }
        } catch (e) {
            alert("Error al guardar");
        }
    });

    document.getElementById('btnDownloadPdf').addEventListener('click', () => {
        downloadPDF('escaletaList', `${currentProgram.title}.pdf`);
    });

    document.getElementById('btnAddText').addEventListener('click', () => {
        escaletaUI.addBlock('text');
    });

    document.getElementById('btnAddAudio').addEventListener('click', () => {
        openLibraryModal('sintonias', (selected) => {
            escaletaUI.addBlock('audio', {
                category: selected.category,
                title: selected.title,
                url: selected.url
            });
        });
    });

    // Categorías de audio en el sidebar
    document.querySelectorAll('.audio-category').forEach(el => {
        el.addEventListener('click', () => {
            openLibraryModal(el.dataset.category, (selected) => {
                escaletaUI.addBlock('audio', {
                    category: selected.category,
                    title: selected.title,
                    url: selected.url
                });
            });
        });
    });

    // Subir a Drive
    document.getElementById('btnUploadDrive').addEventListener('click', () => {
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
                    escaletaUI.addBlock('audio', {
                        category: 'efectos',
                        title: file.name,
                        url: result.url
                    });
                    
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
                } catch (err) {
                    alert("Error subiendo el archivo: " + err);
                    document.getElementById('btnUploadDrive').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir';
                }
            }
        };
        fileInput.click();
    });
}

// Lógica del Modal
const modal = document.getElementById('libraryModal');
const closeBtn = document.querySelector('.close-modal');

closeBtn.onclick = function() {
    modal.style.display = "none";
}
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
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
