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

            const input = document.createElement(block.type === 'text' ? 'textarea' : 'input');
            input.className = 'block-content';
            if (block.type === 'text') {
                input.style.resize = 'vertical';
                input.style.minHeight = '30px';
                input.style.fontFamily = 'inherit';
                input.style.padding = '5px';
            } else {
                input.type = 'text';
            }
            
            let prefix = "";
            if (block.type === 'audio') {
                const audioIndex = this.program.blocks.filter(b => b.type === 'audio').findIndex(b => b.id === block.id);
                if (audioIndex >= 0 && audioIndex < 9) {
                    prefix = `[${audioIndex + 1}] `;
                }
            }
            
            input.value = prefix + (block.type === 'text' ? block.content : block.title);
            
            input.addEventListener('change', (e) => {
                let val = e.target.value;
                if (block.type === 'audio' && val.startsWith(prefix)) {
                    val = val.substring(prefix.length);
                }
                
                if (block.type === 'text') {
                    block.content = val;
                } else {
                    block.title = val;
                }
                this.notifyUpdate();
            });

            contentContainer.appendChild(input);

            if (block.type === 'text') {
                const helper = document.createElement('small');
                helper.style.color = '#888';
                helper.style.fontSize = '11px';
                
                const updateHelper = () => {
                    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0).length;
                    const sec = Math.round((words / 130) * 60);
                    import('../utils/timeUtils.js').then(module => {
                        helper.innerText = `Lectura est.: ${module.secondsToTime(sec)} (${words} palabras)`;
                    });
                };
                
                input.addEventListener('input', updateHelper);
                input.addEventListener('blur', () => {
                    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0).length;
                    if (words > 0) {
                        const sec = Math.round((words / 130) * 60);
                        import('../utils/timeUtils.js').then(module => {
                            const startSec = module.timeToSeconds(block.startTime);
                            block.endTime = module.secondsToTime(startSec + sec);
                            endInput.value = block.endTime;
                            endInput.style.borderColor = '#4caf50';
                            updateDurationDisplay();
                            this.notifyUpdate();
                        });
                    }
                });
                
                updateHelper();
                contentContainer.appendChild(helper);
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
                const btnSpeak = document.createElement('button');
                btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                btnSpeak.title = "Leer texto en voz alta";
                btnSpeak.className = 'btn-speak';
                btnSpeak.style.marginRight = '5px';
                btnSpeak.addEventListener('click', () => {
                    if (window.speechSynthesis.speaking) {
                        window.speechSynthesis.cancel();
                        btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    } else if (input.value.trim() !== '') {
                        const utterance = new SpeechSynthesisUtterance(input.value);
                        utterance.lang = 'es-ES'; // Castellano
                        if (typeof window.getSelectedVoice === 'function') {
                            const selectedVoice = window.getSelectedVoice();
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
