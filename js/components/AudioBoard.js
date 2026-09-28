// js/components/AudioBoard.js v4 — 4-channel category mixer

export class AudioBoard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.allBlocks = [];
        this.audioBlocks = [];
        this.textBlocks = [];
        this.players = {}; // { url: Audio }
        // Per-category volumes
        this.channelVolumes = { sintonia: 0.8, efectos: 0.8, musica: 0.6, voz: 1.0 };
        this._masterVol = 1.0;
        this.initKeyboardListeners();
    }

    updateBoard(blocks) {
        this.allBlocks = blocks;
        this.audioBlocks = blocks.filter(b => b.type === 'audio');
        this.textBlocks = blocks.filter(b => b.type === 'text');
        this.render();
    }

    render() {
        this.container.innerHTML = '<h3>Botonera de audios</h3>';

        const wrapperDiv = document.createElement('div');
        wrapperDiv.style.cssText = 'display:flex;gap:15px;flex-wrap:wrap;justify-content:center;width:100%;';
        wrapperDiv.className = 'audio-buttons-container';

        // === AUDIO BUTTONS ===
        this.audioBlocks.forEach((block, index) => {
            const btnWrapper = document.createElement('div');
            btnWrapper.className = 'audio-btn-wrapper';

            const btn = document.createElement('button');
            // Color by category matching the mixer channels
            const catColors = { sintonia: '#f06292', efectos: '#ff9800', musica: '#4caf50' };
            const btnColor = catColors[block.category] || '#00acc1';
            btn.className = 'audio-btn';
            btn.style.background = btnColor;
            btn.title = block.title;
            btn.id = 'btn-audio-' + block.id;

            let iconClass = 'fa-music';
            if (block.category === 'efectos') iconClass = 'fa-bolt';
            const t = block.title.toLowerCase();
            if (t.includes('noticias')) iconClass = 'fa-newspaper';
            else if (t.includes('tranquila') || t.includes('fondo')) iconClass = 'fa-spa';
            else if (t.includes('aplausos')) iconClass = 'fa-hands-clapping';
            else if (t.includes('risa')) iconClass = 'fa-face-laugh-squint';
            else if (t.includes('campanilla') || t.includes('ding')) iconClass = 'fa-bell';
            else if (t.includes('redoble') || t.includes('tambor')) iconClass = 'fa-drum';

            btn.innerHTML = '<i class="fa-solid ' + iconClass + '"></i>';
            btn.dataset.iconClass = iconClass;

            const key = index + 1;
            block.keyboardKey = key.toString();
            if (key <= 9) {
                const badge = document.createElement('div');
                badge.className = 'shortcut-badge';
                badge.innerText = key;
                btn.appendChild(badge);
            }

            const titleLabel = document.createElement('div');
            titleLabel.className = 'btn-title';
            titleLabel.innerText = block.title;

            btn.addEventListener('click', () => this.toggleAudio(block, btn));
            btnWrapper.appendChild(btn);
            btnWrapper.appendChild(titleLabel);
            wrapperDiv.appendChild(btnWrapper);
        });

        // === TEXT TRIGGER BUTTONS ===
        this.textBlocks.forEach((block) => {
            if (!block.content || !block.content.trim()) return;

            const btnWrapper = document.createElement('div');
            btnWrapper.className = 'audio-btn-wrapper';

            const btn = document.createElement('button');
            btn.className = 'audio-btn text-trigger-btn';
            btn.id = 'btn-text-' + block.id;
            btn.style.cssText = 'background:#00acc1;color:white;';
            btn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
            btn.dataset.iconClass = 'fa-microphone-lines';

            const titleLabel = document.createElement('div');
            titleLabel.className = 'btn-title';
            const words = block.content.trim().split(/\s+/).slice(0, 4).join(' ');
            titleLabel.innerText = '"' + words + (block.content.split(/\s+/).length > 4 ? '…"' : '"');

            btn.addEventListener('click', () => {
                // Use the TTS-enabled popup if available (studio.js), otherwise plain popup
                if (typeof window.openTextInAntena === 'function') {
                    window.openTextInAntena(block);
                } else {
                    Swal.fire({
                        title: '<i class="fa-solid fa-microphone" style="color:#f06292;"></i> Texto en antena',
                        html: '<div style="text-align:left;font-size:1.3em;line-height:1.9;white-space:pre-wrap;font-family:Georgia,serif;">' + block.content.replace(/</g, '&lt;') + '</div>',
                        confirmButtonText: 'Cerrar',
                        confirmButtonColor: '#00acc1',
                        width: '750px'
                    });
                }
            });

            btnWrapper.appendChild(btn);
            btnWrapper.appendChild(titleLabel);
            wrapperDiv.appendChild(btnWrapper);
        });

        this.container.appendChild(wrapperDiv);
        this.renderMixer();
    }

    renderMixer() {
        const existingMixer = document.getElementById('live-mixer');
        if (existingMixer) existingMixer.remove();
        if (!document.body.classList.contains('live-mode')) return;

        const mixer = document.createElement('div');
        mixer.id = 'live-mixer';
        mixer.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:12px 20px;box-sizing:border-box;width:100%;';

        const title = document.createElement('div');
        title.style.cssText = 'color:#eee;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;';
        title.innerHTML = '<i class="fa-solid fa-sliders" style="color:#f06292;margin-right:6px;"></i>Mesa de mezcla';
        mixer.appendChild(title);

        const channels = document.createElement('div');
        channels.style.cssText = 'display:flex;gap:12px;align-items:flex-end;overflow-x:auto;';

        const channelDefs = [
            { key: 'sintonia', label: '🎙️ Sint.', color: '#f06292' },
            { key: 'efectos',  label: '⚡ FX',   color: '#ff9800' },
            { key: 'musica',   label: '🎵 Mus.',  color: '#4caf50' },
            { key: 'voz',      label: '📢 Voz',   color: '#00acc1' },
        ];

        channelDefs.forEach(def => {
            const ch = this._makeChannel(def.label, def.color,
                () => this.channelVolumes[def.key],
                (v) => {
                    this.channelVolumes[def.key] = v;
                    // Update all playing players in this category
                    this.audioBlocks.filter(b => b.category === def.key && b.audioUrl).forEach(b => {
                        const p = this.players[b.audioUrl];
                        if (p && !p.paused) p.volume = v * this._masterVol;
                    });
                }
            );
            channels.appendChild(ch);
        });

        // Master fader
        const masterCh = this._makeChannel('MASTER', '#f06292',
            () => this._masterVol,
            (v) => {
                this._masterVol = v;
                Object.entries(this.players).forEach(([url, p]) => {
                    const block = this.audioBlocks.find(b => b.audioUrl === url);
                    if (block && p && !p.paused) {
                        p.volume = (this.channelVolumes[block.category] || 0.8) * v;
                    }
                });
            },
            true
        );
        channels.appendChild(masterCh);

        mixer.appendChild(channels);

        // Place mixer: in left col if exists, else after botonera
        const leftCol = document.getElementById('live-left-col');
        if (leftCol) {
            leftCol.appendChild(mixer);
        } else {
            const botonera = document.getElementById('audioBoard');
            if (botonera && botonera.parentNode) {
                botonera.parentNode.insertBefore(mixer, botonera.nextSibling);
            }
        }
    }

    _makeChannel(label, color, getVol, setVol, isMaster = false) {
        const ch = document.createElement('div');
        ch.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:5px;min-width:52px;border-radius:8px;padding:8px 6px;box-sizing:border-box;background:' + (isMaster ? '#0f3460' : '#16213e') + ';' + (isMaster ? 'border:1px solid ' + color + ';' : '');

        const volLabel = document.createElement('div');
        volLabel.style.cssText = 'color:' + color + ';font-size:11px;font-weight:bold;font-family:monospace;';
        volLabel.innerText = Math.round(getVol() * 100) + '%';

        const fader = document.createElement('input');
        fader.type = 'range';
        fader.min = '0';
        fader.max = '100';
        fader.value = Math.round(getVol() * 100);
        fader.style.cssText = 'writing-mode:vertical-lr;direction:rtl;width:28px;height:80px;accent-color:' + color + ';cursor:pointer;';

        fader.addEventListener('input', (e) => {
            const v = parseInt(e.target.value) / 100;
            setVol(v);
            volLabel.innerText = e.target.value + '%';
        });

        const name = document.createElement('div');
        name.innerText = label;
        name.style.cssText = 'color:' + (isMaster ? color : '#aaa') + ';font-size:10px;text-align:center;line-height:1.2;font-weight:' + (isMaster ? 'bold' : 'normal') + ';';

        ch.appendChild(volLabel);
        ch.appendChild(fader);
        ch.appendChild(name);
        return ch;
    }

    highlightLiveBlocks(currentSeconds) {
        import('../utils/timeUtils.js').then(module => {
            this.audioBlocks.forEach(block => {
                const btn = document.getElementById('btn-audio-' + block.id);
                if (btn) {
                    const startSec = module.timeToSeconds(block.startTime);
                    const endSec = module.timeToSeconds(block.endTime || block.duration || block.startTime);
                    if (currentSeconds >= startSec && currentSeconds < endSec) {
                        btn.classList.add('live-active');
                    } else {
                        btn.classList.remove('live-active');
                    }
                }
            });
        });
    }

    toggleAudio(block, btnElement) {
        const url = block.audioUrl;
        if (!url) return;

        let player = this.players[url];

        if (player && !player.paused) {
            player.pause();
            player.currentTime = 0;
            btnElement.style.boxShadow = '';
            btnElement.style.transform = '';
            const i = btnElement.querySelector('i');
            if (i && btnElement.dataset.iconClass) i.className = 'fa-solid ' + btnElement.dataset.iconClass;
            return;
        }

        if (!player) {
            player = new Audio(url);
            this.players[url] = player;
        }

        const catVol = this.channelVolumes[block.category] || 0.8;
        player.volume = catVol * this._masterVol;
        player.currentTime = 0;
        player.play().catch(e => console.error(e));
        this.setPlayingUI(btnElement, player);
    }

    setPlayingUI(btnElement, player) {
        btnElement.style.boxShadow = '0 0 15px #4caf50';
        btnElement.style.transform = 'scale(0.95)';
        const i = btnElement.querySelector('i');
        if (i) i.className = 'fa-solid fa-stop';

        player.onended = () => {
            btnElement.style.boxShadow = '';
            btnElement.style.transform = '';
            const i2 = btnElement.querySelector('i');
            if (i2 && btnElement.dataset.iconClass) i2.className = 'fa-solid ' + btnElement.dataset.iconClass;
        };
    }

    initKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key;
            const block = this.audioBlocks.find(b => b.keyboardKey === key);
            if (block) {
                const btn = document.getElementById('btn-audio-' + block.id);
                this.toggleAudio(block, btn);
            }
        });
    }
}
