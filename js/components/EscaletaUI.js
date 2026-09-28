// js/components/EscaletaUI.js
import { TextBlock, AudioBlock } from "../models/Block.js";
import { formatTime } from "../utils/timeUtils.js";

export class EscaletaUI {
    constructor(containerId, program, onUpdateCallback) {
        this.container = document.getElementById(containerId);
        this.program = program;
        this.onUpdateCallback = onUpdateCallback; // Callback para actualizar botonera
        this.initSortable();
    }

    initSortable() {
        if (typeof Sortable !== 'undefined') {
            this.sortable = Sortable.create(this.container, {
                animation: 150,
                onEnd: (evt) => {
                    this.updateOrderFromDOM();
                }
            });
        }
    }

    setSortable(enabled) {
        if (this.sortable) {
            this.sortable.option('disabled', !enabled);
        }
    }

    addBlock(type, data = {}) {
        let block;
        if (type === 'text') {
            block = new TextBlock(data.content || "Nuevo bloque de texto...");
        } else if (type === 'audio') {
            block = new AudioBlock(data.category || 'sintonia', data.title || "Audio", data.url || data.audioUrl || "", '', null, data.maxDuration || 0);
        }
        
        if (block) {
            if (data.startTime) block.startTime = data.startTime;
            if (data.endTime) block.endTime = data.endTime;
            this.program.addBlock(block);
            this.render();
            this.notifyUpdate();
        }
    }

    removeBlock(id) {
        this.program.removeBlock(id);
        this.render();
        this.notifyUpdate();
    }

    highlightLiveBlocks(currentSeconds) {
        import('../utils/timeUtils.js').then(module => {
            Array.from(this.container.children).forEach(el => {
                const blockId = el.dataset.id;
                const block = this.program.blocks.find(b => b.id === blockId);
                if (block) {
                    const startSec = module.timeToSeconds(block.startTime);
                    const endSec = module.timeToSeconds(block.endTime || block.duration || block.startTime);
                    
                    // Si currentSeconds está dentro del rango
                    if (currentSeconds >= startSec && currentSeconds < endSec) {
                        el.classList.add('live-active');
                    } else {
                        el.classList.remove('live-active');
                    }
                }
            });
        });
    }

    updateOrderFromDOM() {
        const orderIds = Array.from(this.container.children).map(el => el.dataset.id);
        this.program.updateBlockOrder(orderIds);
        this.notifyUpdate();
    }

    notifyUpdate() {
        if (this.onUpdateCallback) {
            this.onUpdateCallback();
        }
    }

    render() {
        this.container.innerHTML = '';
        this.program.blocks.forEach(block => {
            const el = document.createElement('div');
            el.className = `escaleta-block ${block.type}`;
            if (block.type === 'audio') {
                el.classList.add(`audio-${block.category}`);
            }
            el.dataset.id = block.id;

            const timeContainer = document.createElement('div');
            timeContainer.className = 'block-time-container';
            
            const startInput = document.createElement('input');
            startInput.type = 'text';
            startInput.className = 'time-input';
            startInput.placeholder = '00:00';
            startInput.title = 'Inicio (MM:SS)';
            startInput.value = block.startTime;

            const endInput = document.createElement('input');
            endInput.type = 'text';
            endInput.className = 'time-input';
            endInput.placeholder = '00:00';
            endInput.title = 'Fin (MM:SS)';
            endInput.value = block.endTime || block.duration || "00:00";

            const durationSpan = document.createElement('span');
            durationSpan.style.fontSize = '11px';
            durationSpan.style.color = '#777';
            durationSpan.style.alignSelf = 'center';
            durationSpan.style.width = '35px';

            const updateDurationDisplay = () => {
                import('../utils/timeUtils.js').then(module => {
                    const s = module.timeToSeconds(block.startTime);
                    const e = module.timeToSeconds(block.endTime);
                    let d = e - s;
                    if (d < 0) d = 0;
                    durationSpan.innerText = `(${module.secondsToTime(d)})`;
                });
            };
            updateDurationDisplay();

            startInput.addEventListener('blur', (e) => { 
                import('../utils/timeUtils.js').then(module => {
                    const valid = module.formatTime(e.target.value);
                    if (valid) {
                        e.target.value = valid;
                        block.startTime = valid;
                        e.target.style.borderColor = 'rgba(0,0,0,0.2)';
                    } else {
                        e.target.value = block.startTime; 
                        e.target.style.borderColor = 'red';
                    }
                    updateDurationDisplay();
                    this.notifyUpdate(); 
                });
            });

            endInput.addEventListener('blur', (e) => { 
                import('../utils/timeUtils.js').then(module => {
                    const valid = module.formatTime(e.target.value);
                    if (valid) {
                        const newEndSec = module.timeToSeconds(valid);
                        const startSec = module.timeToSeconds(block.startTime);
                        const requestedDuration = newEndSec - startSec;

                        if (block.type === 'audio' && block.maxDuration && requestedDuration > block.maxDuration) {
                            Swal.fire({toast: true, position: "bottom", icon: "warning", title: `Audio acortado: el archivo físico solo dura ${module.secondsToTime(block.maxDuration)}.`, showConfirmButton: false, timer: 4000});
                            block.endTime = module.secondsToTime(startSec + block.maxDuration);
                            e.target.value = block.endTime;
                            e.target.style.borderColor = 'orange';
                        } else if (newEndSec < startSec) {
                            block.endTime = block.startTime; // No puede ser negativo
                            e.target.value = block.endTime;
                            e.target.style.borderColor = 'orange';
                        } else {
                            e.target.value = valid;
                            block.endTime = valid;
                            e.target.style.borderColor = 'rgba(0,0,0,0.2)';
                        }
                    } else {
                        e.target.value = block.endTime; 
                        e.target.style.borderColor = 'red';
                    }
                    updateDurationDisplay();
                    this.notifyUpdate(); 
                });
            });

            timeContainer.appendChild(startInput);
            timeContainer.appendChild(endInput);
            timeContainer.appendChild(durationSpan);

            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            contentContainer.style.display = 'flex';
            contentContainer.style.flexDirection = 'column';
            contentContainer.style.gap = '5px';
            contentContainer.style.minWidth = '0';
            contentContainer.style.overflow = 'hidden';

                        let prefix = "";
            if (block.type === 'audio') {
                const audioIndex = this.program.blocks.filter(b => b.type === 'audio').findIndex(b => b.id === block.id);
                if (audioIndex >= 0 && audioIndex < 9) {
                    prefix = `[${audioIndex + 1}] `;
                }
            }

            if (block.type === 'text') {
                // === PREVIEW Y POPUP PARA TEXTO ===
                const textPreview = document.createElement('div');
                textPreview.className = 'block-content text-preview';
                textPreview.style.cssText = 'padding: 8px; background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.2); border-radius: 5px; cursor: pointer; min-height: 38px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; width: 100%; box-sizing: border-box; flex: 1; font-size: 13px; color: #333; transition: background 0.2s;';
                
                const helper = document.createElement('small');
                helper.style.color = '#888';
                helper.style.fontSize = '11px';
                helper.style.marginTop = '4px';
                
                const updateViewAndTime = () => {
                    const txt = block.content || '✏️ Haz clic aquí para escribir el guión...';
                    textPreview.innerText = txt;
                    
                    const words = (block.content || "").trim().split(/\s+/).filter(w => w.length > 0).length;
                    const sec = Math.round((words / 130) * 60);
                    
                    import('../utils/timeUtils.js').then(module => {
                        helper.innerText = `Lectura est.: ${module.secondsToTime(sec)} (${words} palabras)`;
                        const newEnd = module.secondsToTime(module.timeToSeconds(block.startTime) + sec);
                        
                        if (block.endTime !== newEnd && document.activeElement !== endInput) {
                            block.endTime = newEnd;
                            endInput.value = newEnd;
                            updateDurationDisplay();
                        }
                    });
                };
                
                updateViewAndTime();

                textPreview.addEventListener('mouseover', () => {
                    if (!document.body.classList.contains('live-mode') && !document.title.includes('👁️')) {
                        textPreview.style.background = '#fff';
                        textPreview.style.borderColor = '#00acc1';
                    }
                });
                textPreview.addEventListener('mouseout', () => {
                    textPreview.style.background = 'rgba(255,255,255,0.7)';
                    textPreview.style.borderColor = 'rgba(0,0,0,0.2)';
                });

                textPreview.addEventListener('click', () => {
                    if (document.body.classList.contains('live-mode') || document.title.includes('👁️')) return;
                    
                    Swal.fire({
                        title: 'Redactar Guión',
                        input: 'textarea',
                        inputValue: block.content || '',
                        inputPlaceholder: 'Escribe aquí lo que se va a leer en antena...',
                        inputAttributes: {
                            rows: 15,
                            style: 'font-size: 1.1em; line-height: 1.6; padding: 15px; resize: vertical;'
                        },
                        width: '800px',
                        showCancelButton: true,
                        confirmButtonText: '<i class="fa-solid fa-check"></i> Guardar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#00acc1'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            block.content = result.value;
                            updateViewAndTime();
                            this.notifyUpdate();
                        }
                    });
                });
                
                contentContainer.appendChild(textPreview);
                contentContainer.appendChild(helper);

            } else {
                // === COMPORTAMIENTO ORIGINAL PARA AUDIO ===
                const input = document.createElement('input');
                input.className = 'block-content';
                input.type = 'text';
                input.value = prefix + block.title;
                
                input.addEventListener('change', (e) => {
                    let val = e.target.value;
                    if (val.startsWith(prefix)) {
                        val = val.substring(prefix.length);
                    }
                    block.title = val;
                    this.notifyUpdate();
                });
                contentContainer.appendChild(input);
            }

            if (block.type === 'audio') {
                const bgLabel = document.createElement('label');
                bgLabel.style.fontSize = '12px';
                bgLabel.style.color = '#555';
                bgLabel.style.display = 'flex';
                bgLabel.style.alignItems = 'center';
                bgLabel.style.gap = '5px';
                
                const bgCheck = document.createElement('input');
                bgCheck.type = 'checkbox';
                bgCheck.checked = !!block.isBackground || block.category === 'musica';
                bgCheck.addEventListener('change', (e) => {
                    block.isBackground = e.target.checked;
                    this.notifyUpdate();
                });
                
                bgLabel.appendChild(bgCheck);
                bgLabel.appendChild(document.createTextNode('Suena de fondo (marcador de timeline)'));
                contentContainer.appendChild(bgLabel);
            }

            const actions = document.createElement('div');
            actions.className = 'block-actions';
            
            if (block.type === 'text') {
                // Selector de voz para este bloque
                const voiceSelect = document.createElement('select');
                voiceSelect.className = 'block-voice-select';
                voiceSelect.style.cssText = 'padding: 4px; font-size: 11px; margin-right: 5px; max-width: 130px; border-radius: 4px; border: 1px solid #ccc;';
                voiceSelect.title = "Las voces dependen de tu Sistema Operativo (Windows, Mac, etc.)";
                
                const populateBlockVoice = () => {
                    voiceSelect.innerHTML = '';
                    if (window.availableVoices && window.availableVoices.length > 0) {
                        window.availableVoices.forEach(v => {
                            const opt = document.createElement('option');
                            opt.value = v.voiceURI;
                            opt.textContent = v.name.replace(/Microsoft |Google |Apple /gi, '');
                            if (block.voiceURI === v.voiceURI) opt.selected = true;
                            voiceSelect.appendChild(opt);
                        });
                        // Asegurar que guardamos la voz seleccionada
                        if (!block.voiceURI && voiceSelect.value) {
                            block.voiceURI = voiceSelect.value;
                        }
                    } else {
                        voiceSelect.innerHTML = '<option value="">Sin voces disponibles</option>';
                    }
                };
                
                populateBlockVoice();
                window.addEventListener('tts_voices_loaded', populateBlockVoice);
                
                voiceSelect.addEventListener('change', (e) => {
                    block.voiceURI = e.target.value;
                    this.notifyUpdate(); // Guardar al cambiar
                });

                const infoIcon = document.createElement('i');
                infoIcon.className = 'fa-solid fa-circle-info';
                infoIcon.style.cssText = 'color: #999; font-size: 11px; margin-right: 8px; cursor: help;';
                infoIcon.title = "Atención: Las voces mostradas dependen exclusivamente del sistema operativo de tu ordenador (Windows, macOS, etc.) y del navegador que estés usando.";
                
                actions.appendChild(voiceSelect);
                actions.appendChild(infoIcon);

                // Botón Leer
                const btnSpeak = document.createElement('button');
                btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                btnSpeak.title = "Leer texto en voz alta";
                btnSpeak.className = 'btn-speak';
                btnSpeak.style.marginRight = '5px';
                btnSpeak.addEventListener('click', () => {
                    if (window.speechSynthesis.speaking) {
                        window.speechSynthesis.cancel();
                        btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    } else if (block.content && block.content.trim() !== '') {
                        const utterance = new SpeechSynthesisUtterance(block.content);
                        utterance.lang = 'es-ES'; // Castellano
                        if (typeof window.getVoiceByURI === 'function') {
                            const selectedVoice = window.getVoiceByURI(block.voiceURI);
                            if (selectedVoice) {
                                utterance.voice = selectedVoice;
                            }
                        }
                        
                        utterance.onstart = () => {
                            btnSpeak.innerHTML = '<i class="fa-solid fa-stop"></i>';
                        };
                        utterance.onend = () => {
                            btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                        };
                        utterance.onerror = () => {
                            btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                        };
                        
                        window.speechSynthesis.speak(utterance);
                    }
                });
                actions.appendChild(btnSpeak);
            }

            // === BOTÓN DE PRE-ESCUCHA PARA AUDIOS ===
            if (block.type === 'audio' && block.audioUrl) {
                const btnAudioPreview = document.createElement('button');
                btnAudioPreview.innerHTML = '<i class="fa-solid fa-play"></i>';
                btnAudioPreview.title = "Pre-escuchar audio";
                btnAudioPreview.className = 'btn-speak btn-audio-preview'; // Reutilizamos clase css btn-speak
                btnAudioPreview.style.marginRight = '5px';
                
                btnAudioPreview.addEventListener('click', () => {
                    let globalPlayer = document.getElementById('globalAudioPlayer');
                    
                    // Si este mismo bloque ya está sonando, lo pausamos
                    if (globalPlayer && !globalPlayer.paused && globalPlayer.dataset.currentBlock === block.id) {
                        globalPlayer.pause();
                        btnAudioPreview.innerHTML = '<i class="fa-solid fa-play"></i>';
                        globalPlayer.dataset.currentBlock = '';
                        return;
                    }

                    // Detener cualquier otra pre-escucha activa
                    if (globalPlayer && !globalPlayer.paused) {
                        globalPlayer.pause();
                    }
                    // Resetear todos los iconos a play
                    document.querySelectorAll('.btn-audio-preview').forEach(b => {
                        b.innerHTML = '<i class="fa-solid fa-play"></i>';
                    });

                    // Reproducir el nuevo
                    if (globalPlayer) {
                        globalPlayer.src = block.audioUrl;
                        globalPlayer.dataset.currentBlock = block.id;
                        globalPlayer.play().catch(e => console.error("Error reproduciendo", e));
                        
                        btnAudioPreview.innerHTML = '<i class="fa-solid fa-stop"></i>';
                        
                        globalPlayer.onended = () => {
                            btnAudioPreview.innerHTML = '<i class="fa-solid fa-play"></i>';
                            globalPlayer.dataset.currentBlock = '';
                        };
                    }
                });
                actions.appendChild(btnAudioPreview);
            }
            
            const btnDelete = document.createElement('button');
            btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btnDelete.title = "Eliminar bloque";
            btnDelete.className = 'btn-delete';
            btnDelete.addEventListener('click', () => this.removeBlock(block.id));
            
            actions.appendChild(btnDelete);

            el.appendChild(timeContainer);
            el.appendChild(contentContainer);
            el.appendChild(actions);

            this.container.appendChild(el);
        });
    }
}
