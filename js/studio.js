// js/studio.js — Estudio en Directo (separado del editor)

import { authService } from './services/authService.js?v=2';
import { dbService } from './services/dbService.js?v=6';
import { setupUserProfile } from './utils/profileUI.js?v=12';
import { Program } from './models/Program.js';
import { AudioBoard } from './components/AudioBoard.js?v=7';

let currentProgram = new Program();
let audioBoard = null;

// ──────────────────────────────────────────────
//  BOOTSTRAP
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    authService.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = 'index.html'; return; }

        await dbService.saveUser(user);
        const profile = await dbService.getUserProfile(user.uid) || {};
        setupUserProfile(user, profile);

        const urlParams = new URLSearchParams(window.location.search);
        const programId = urlParams.get('id');

        if (!programId) {
            Swal.fire('Sin programa', 'Abre el estudio desde el Editor, con un programa cargado.', 'warning')
                .then(() => window.location.href = 'dashboard.html');
            return;
        }

        const data = await dbService.getProgramById(programId);
        if (!data) {
            Swal.fire('Error', 'No se encontró el programa.', 'error')
                .then(() => window.location.href = 'dashboard.html');
            return;
        }

        currentProgram = Program.fromFirestore(data);
        document.getElementById('programTitle').innerText = currentProgram.title;
        document.title = `🎙️ ${currentProgram.title} — Estudio`;

        initStudio(user);
    });
});

// ──────────────────────────────────────────────
//  INICIALIZACIÓN DEL ESTUDIO
// ──────────────────────────────────────────────
function initStudio(user) {
    initVoices();
    renderEscaleta();
    initAudioBoard();
    initMixer();
    initTimer();
    initRecording();
}

// ──────────────────────────────────────────────
//  TTS VOICES
// ──────────────────────────────────────────────
window.studioVoices = [];

function initVoices() {
    const populate = () => {
        window.studioVoices = speechSynthesis.getVoices().filter(v =>
            v.lang.startsWith('es') || v.name.toLowerCase().includes('español') || v.name.toLowerCase().includes('spanish')
        );
        if (window.studioVoices.length === 0) {
            window.studioVoices = speechSynthesis.getVoices(); // fallback: all voices
        }
    };
    if (typeof speechSynthesis !== 'undefined') {
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populate;
        }
        setTimeout(populate, 300);
    }
}

/**
 * Opens a full-screen text popup with TTS controls.
 * block: { content, voiceURI }
 */
window.openTextInAntena = function(block) {
    const readerRow = document.getElementById('studio-text-reader-row');
    const contentDiv = document.getElementById('textReaderContent');
    const voiceSel = document.getElementById('textReaderVoice');
    const btnPlay = document.getElementById('btnTextReaderPlay');
    const btnClose = document.getElementById('btnTextReaderClose');

    // Show row
    readerRow.style.display = 'flex';
    contentDiv.innerHTML = (block.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');

    // Populate voices
    voiceSel.innerHTML = '';
    let hasVoices = false;
    window.studioVoices.forEach(v => {
        hasVoices = true;
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        if (block.voiceURI === v.voiceURI) opt.selected = true;
        opt.innerText = v.name.replace(/\n/g, '<br>'); //Microsoft |Google |Apple /gi, '');
        voiceSel.appendChild(opt);
    });
    if (!hasVoices) voiceSel.innerHTML = '<option value="">Sin voces disponibles</option>';

    // Reset button UI if not currently speaking THIS block
    // Actually, to be safe, just reset the button and stop any previous speech
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i> Leer';
    btnPlay.style.background = '#4caf50';

    // Clear old listeners by cloning elements
    const newBtnPlay = btnPlay.cloneNode(true);
    btnPlay.parentNode.replaceChild(newBtnPlay, btnPlay);
    
    const newBtnClose = btnClose.cloneNode(true);
    btnClose.parentNode.replaceChild(newBtnClose, btnClose);

    newBtnClose.addEventListener('click', () => {
        readerRow.style.display = 'none';
        // Note: We do NOT stop TTS here, so it continues in the background
    });

    newBtnPlay.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            newBtnPlay.innerHTML = '<i class="fa-solid fa-play"></i> Leer';
            newBtnPlay.style.background = '#4caf50';
            return;
        }

        const utterance = new SpeechSynthesisUtterance(block.content || '');
        utterance.lang = 'es-ES';

        const selectedVoiceURI = voiceSel.value;
        const voice = window.studioVoices.find(v => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
        block.voiceURI = selectedVoiceURI;

        utterance.onstart = () => {
            newBtnPlay.innerHTML = '<i class="fa-solid fa-stop"></i> Parar';
            newBtnPlay.style.background = '#d32f2f';
        };
        utterance.onend = utterance.onerror = () => {
            newBtnPlay.innerHTML = '<i class="fa-solid fa-play"></i> Leer';
            newBtnPlay.style.background = '#4caf50';
        };

        window.speechSynthesis.speak(utterance);
    });
};

// ──────────────────────────────────────────────
//  ESCALETA (solo lectura)
// ──────────────────────────────────────────────
function renderEscaleta() {
    const container = document.getElementById('studioEscaleta');
    container.innerHTML = '';

    if (!currentProgram.blocks || currentProgram.blocks.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;margin-top:30px;">La escaleta está vacía.</p>';
        return;
    }

    currentProgram.blocks.forEach(block => {
        const el = document.createElement('div');
        el.className = 'escaleta-block ' + block.type;
        if (block.type === 'audio' && block.category) el.classList.add(block.category);
        el.dataset.id = block.id;

        // Time badge
        const badge = document.createElement('span');
        badge.className = 'block-time-badge';
        badge.innerText = (block.startTime || '?') + ' → ' + (block.endTime || '?');
        el.appendChild(badge);

        if (block.type === 'text') {
            // Show first line as preview; click opens full text
            const preview = document.createElement('div');
            preview.className = 'block-content-preview';
            const previewTxt = (block.content || 'Texto vacío').replace(/\n/g, ' ');
            preview.innerText = previewTxt;
            preview.title = 'Haz clic para ver el texto completo';
            preview.addEventListener('click', () => {
                window.openTextInAntena(block);
            });
            el.appendChild(preview);
        } else {
            const title = document.createElement('div');
            title.className = 'block-content-text';
            title.innerText = block.title || 'Audio';
            el.appendChild(title);

            // Category icon
            const icons = { sintonia: '🎙️', efectos: '⚡', musica: '🎵' };
            const ico = document.createElement('span');
            ico.innerText = icons[block.category] || '🔊';
            ico.style.fontSize = '1.2em';
            el.insertBefore(ico, title);
        }

        container.appendChild(el);
    });
}

// Highlight block in escaleta based on timer seconds
function highlightEscaletaBlock(currentSeconds) {
    import('./utils/timeUtils.js').then(module => {
        const els = document.querySelectorAll('#studioEscaleta .escaleta-block');
        els.forEach(el => {
            const block = currentProgram.blocks.find(b => b.id === el.dataset.id);
            if (block) {
                const start = module.timeToSeconds(block.startTime);
                const end = module.timeToSeconds(block.endTime || block.startTime);
                if (currentSeconds >= start && currentSeconds < end) {
                    el.classList.add('live-active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    el.classList.remove('live-active');
                }
            }
        });
    });
}

// ──────────────────────────────────────────────
//  BOTONERA DE AUDIO
// ──────────────────────────────────────────────
function initAudioBoard() {
    audioBoard = new AudioBoard('audioBoard');
    audioBoard.updateBoard(currentProgram.blocks);
}

// ──────────────────────────────────────────────
//  MESA DE MEZCLA (4 canales categoría)
// ──────────────────────────────────────────────
const channelVolumes = { sintonia: 0.8, efectos: 0.8, musica: 0.6, voz: 1.0 };
let masterVol = 1.0;

function initMixer() {
    const mixerChannels = document.getElementById('mixerChannels');
    if (!mixerChannels) return;
    mixerChannels.innerHTML = '';

    const defs = [
        { key: 'sintonia', label: '🎙️ Sint.',  color: '#f06292', init: channelVolumes.sintonia },
        { key: 'efectos',  label: '⚡ FX',      color: '#ff9800', init: channelVolumes.efectos },
        { key: 'musica',   label: '🎵 Mus.',    color: '#4caf50', init: channelVolumes.musica },
        { key: 'voz',      label: '📢 Voz',     color: '#00acc1', init: channelVolumes.voz },
    ];

    defs.forEach(def => {
        const ch = makeChannelEl(def.label, def.color, def.init, (v) => {
            channelVolumes[def.key] = v;
            // Update any currently-playing audio in this category
            if (audioBoard) {
                audioBoard.audioBlocks.filter(b => b.category === def.key && b.audioUrl).forEach(b => {
                    const p = audioBoard.players[b.audioUrl];
                    if (p && !p.paused) p.volume = v * masterVol;
                });
            }
        });
        mixerChannels.appendChild(ch);
    });

    // Master
    const masterCh = makeChannelEl('MASTER', '#f06292', masterVol, (v) => {
        masterVol = v;
        if (audioBoard) {
            Object.entries(audioBoard.players).forEach(([url, p]) => {
                const block = audioBoard.audioBlocks.find(b => b.audioUrl === url);
                if (block && p && !p.paused) {
                    p.volume = (channelVolumes[block.category] || 0.8) * v;
                }
            });
        }
    }, true);
    mixerChannels.appendChild(masterCh);

    // Sync AudioBoard channelVolumes
    if (audioBoard) {
        audioBoard.channelVolumes = channelVolumes;
        audioBoard._masterVol = masterVol;
    }
}

function makeChannelEl(label, color, initVol, onChange, isMaster = false) {
    const ch = document.createElement('div');
    ch.className = 'mixer-channel' + (isMaster ? ' master' : '');

    const volLabel = document.createElement('div');
    volLabel.className = 'ch-vol';
    volLabel.style.color = color;
    volLabel.innerText = Math.round(initVol * 100) + '%';

    const fader = document.createElement('input');
    fader.type = 'range';
    fader.min = '0';
    fader.max = '100';
    fader.value = Math.round(initVol * 100);
    fader.style.accentColor = color;

    // Smooth fade animation helper
    let fadeAnim = null;
    const fadeTo = (targetPct, durationMs = 800) => {
        if (fadeAnim) clearInterval(fadeAnim);
        const startPct = parseInt(fader.value);
        const diff = targetPct - startPct;
        if (diff === 0) return;
        const steps = Math.ceil(durationMs / 30);
        let step = 0;
        fadeAnim = setInterval(() => {
            step++;
            const newPct = Math.round(startPct + (diff * step / steps));
            fader.value = newPct;
            const v = newPct / 100;
            onChange(v);
            volLabel.innerText = newPct + '%';
            if (step >= steps) {
                clearInterval(fadeAnim);
                fadeAnim = null;
            }
        }, 30);
    };

    fader.addEventListener('input', e => {
        if (fadeAnim) { clearInterval(fadeAnim); fadeAnim = null; }
        const v = parseInt(e.target.value) / 100;
        onChange(v);
        volLabel.innerText = e.target.value + '%';
    });

    // Preset buttons column (next to fader)
    const presets = document.createElement('div');
    presets.style.cssText = 'display:flex;flex-direction:column;justify-content:space-between;height:75px;';

    const makePreset = (pct, icon, title) => {
        const b = document.createElement('button');
        b.title = title;
        b.innerText = icon;
        b.style.cssText = `font-size:8px;padding:2px;border-radius:3px;border:none;cursor:pointer;background:#2a2a2a;color:${color};font-weight:bold;line-height:1;width:18px;text-align:center;`;
        b.addEventListener('click', () => fadeTo(pct));
        return b;
    };

    presets.appendChild(makePreset(100, '100', 'Subir a 100%'));
    presets.appendChild(makePreset(75,  '75',  'Subir a 75%'));
    presets.appendChild(makePreset(50,  '50',  'Subir a 50%'));
    presets.appendChild(makePreset(25,  '25',  'Bajar a 25%'));
    presets.appendChild(makePreset(0,   '▼0',  'Fade out a 0%'));

    const name = document.createElement('div');
    name.className = 'ch-name';
    name.style.color = isMaster ? color : '#aaa';
    name.innerText = label;

    // Wrapper to put fader and presets side by side
    const faderWrap = document.createElement('div');
    faderWrap.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:3px;margin:4px 0;';
    faderWrap.appendChild(fader);
    faderWrap.appendChild(presets);

    ch.appendChild(volLabel);
    ch.appendChild(faderWrap);
    ch.appendChild(name);
    return ch;
}

// ──────────────────────────────────────────────
//  CRONÓMETRO
// ──────────────────────────────────────────────
let timerInterval = null;
let timerSeconds = 0;
const timerDisplay = () => document.getElementById('studioTimerDisplay');
const onAirBadge = () => document.getElementById('onAirBadge');

function initTimer() {
    const btnPlay = document.getElementById('btnTimerPlay');
    const btnReset = document.getElementById('btnTimerReset');

    btnPlay.addEventListener('click', () => {
        if (timerInterval) {
            // PAUSE
            clearInterval(timerInterval);
            timerInterval = null;
            btnPlay.innerHTML = '<i class="fa-solid fa-play" style="margin-left:4px;"></i>';
            onAirBadge().classList.remove('visible');
        } else {
            if (timerSeconds === 0) {
                // 5-second countdown
                let countdown = 5;
                let preTimer = null;
                Swal.fire({
                    title: '¡Preparados!',
                    html: '<div style="font-size:4em;font-weight:bold;color:#ff9800;" id="countdownNumber">5</div><p>Comenzando emisión...</p>',
                    showCancelButton: true,
                    cancelButtonText: 'Cancelar',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        const num = document.getElementById('countdownNumber');
                        preTimer = setInterval(() => {
                            countdown--;
                            if (countdown > 0) { num.innerText = countdown; }
                            else { clearInterval(preTimer); Swal.close(); }
                        }, 1000);
                    },
                    willClose: () => { if (preTimer) clearInterval(preTimer); }
                }).then(result => {
                    if (result.dismiss !== Swal.DismissReason.cancel) startRealTimer();
                });
            } else {
                startRealTimer();
            }
        }
    });

    btnReset.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        timerSeconds = 0;
        timerDisplay().innerText = '00:00';
        onAirBadge().classList.remove('visible');
        document.getElementById('btnTimerPlay').innerHTML = '<i class="fa-solid fa-play" style="margin-left:4px;"></i>';
    });
}

function startRealTimer() {
    const btnPlay = document.getElementById('btnTimerPlay');
    btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    onAirBadge().classList.add('visible');

    timerInterval = setInterval(() => {
        timerSeconds++;
        const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const s = String(timerSeconds % 60).padStart(2, '0');
        timerDisplay().innerText = `${m}:${s}`;

        highlightEscaletaBlock(timerSeconds);
        if (audioBoard) audioBoard.highlightLiveBlocks(timerSeconds);
    }, 1000);
}

// ──────────────────────────────────────────────
//  GRABACIÓN DE PODCAST
// ──────────────────────────────────────────────
function initRecording() {
    let mediaRecorder = null;
    let recordedChunks = [];
    let streamRef = null;

    const btn = document.getElementById('btnRecordPodcast');

    btn.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            btn.innerHTML = '<i class="fa-solid fa-circle-dot"></i> REC';
            return;
        }

        try {
            await Swal.fire({
                title: '🎙️ Modo de Grabación',
                html: `<p style="text-align:left;">Para capturar tanto las <b>sintonías</b> como las <b>voces</b>:</p>
                    <ol style="text-align:left;">
                        <li>En la ventana que aparecerá, selecciona la pestaña <b>"Toda la pantalla"</b>.</li>
                        <li>Haz clic en la imagen de tu pantalla.</li>
                        <li>Marca abajo el interruptor <b>"Compartir audio del sistema"</b>.</li>
                    </ol>`,
                icon: 'warning',
                confirmButtonText: 'Entendido, ¡a grabar!'
            });

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'browser' },
                audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 }
            });

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                stream.getTracks().forEach(t => t.stop());
                Swal.fire('Sin audio', "No activaste 'Compartir audio del sistema'.", 'error');
                return;
            }

            const audioStream = new MediaStream(audioTracks);
            streamRef = stream;

            mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = (currentProgram.title || 'Podcast') + '.webm';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                recordedChunks = [];
                if (streamRef) streamRef.getTracks().forEach(t => t.stop());
                Swal.fire('¡Podcast guardado!', 'Se ha descargado el archivo .webm del podcast.', 'success');
            };

            mediaRecorder.start();
            btn.innerHTML = '<i class="fa-solid fa-stop"></i> STOP';

        } catch (err) {
            console.error(err);
            Swal.fire('Grabación cancelada', 'No se pudo iniciar la captura de audio.', 'warning');
        }
    });
}
