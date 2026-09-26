// js/components/AudioBoard.js

export class AudioBoard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.audioBlocks = [];
        this.players = {}; // Diccionario para mantener los reproductores
        this.initKeyboardListeners();
    }

    updateBoard(blocks) {
        this.audioBlocks = blocks.filter(b => b.type === 'audio');
        this.render();
    }

    render() {
        this.container.innerHTML = '<h3>Botonera de audios</h3>';

        const wrapperDiv = document.createElement('div');
        wrapperDiv.style.display = 'flex';
        wrapperDiv.style.gap = '15px';
        wrapperDiv.style.flexWrap = 'wrap';
        wrapperDiv.style.justifyContent = 'center';
        wrapperDiv.style.width = '100%';
        wrapperDiv.className = 'audio-buttons-container';

        this.audioBlocks.forEach((block, index) => {
            const btnWrapper = document.createElement('div');
            btnWrapper.className = 'audio-btn-wrapper';

            const btn = document.createElement('button');
            btn.className = `audio-btn ${block.category === 'sintonia' ? 'primary' : 'secondary'}`;
            btn.title = block.title;
            btn.id = `btn-audio-${block.id}`;
            
            let iconClass = 'fa-music';
            if (block.category === 'efectos') iconClass = 'fa-bolt';
            
            const t = block.title.toLowerCase();
            if (t.includes('noticias')) iconClass = 'fa-newspaper';
            else if (t.includes('tranquila') || t.includes('fondo')) iconClass = 'fa-spa';
            else if (t.includes('aplausos')) iconClass = 'fa-hands-clapping';
            else if (t.includes('risa')) iconClass = 'fa-face-laugh-squint';
            else if (t.includes('campanilla') || t.includes('ding')) iconClass = 'fa-bell';
            else if (t.includes('redoble') || t.includes('tambor')) iconClass = 'fa-drum';

            
            btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;

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

            btn.addEventListener('click', () => this.toggleAudio(block.audioUrl, btn));
            
            btnWrapper.appendChild(btn);
            btnWrapper.appendChild(titleLabel);
            wrapperDiv.appendChild(btnWrapper);
        });

        this.container.appendChild(wrapperDiv);
    }

    highlightLiveBlocks(currentSeconds) {
        import('../utils/timeUtils.js').then(module => {
            this.audioBlocks.forEach(block => {
                const btn = document.getElementById(`btn-audio-${block.id}`);
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

    toggleAudio(url, btnElement) {
        if (!url) return;

        if (this.players[url]) {
            const player = this.players[url];
            if (!player.paused) {
                // Si está sonando, pararlo
                player.pause();
                player.currentTime = 0;
                btnElement.style.boxShadow = '';
                btnElement.style.transform = '';
                btnElement.innerHTML = btnElement.innerHTML.replace('fa-stop', btnElement.dataset.originalIcon);
                return;
            } else {
                // Volver a reproducir
                player.currentTime = 0;
                player.play().catch(e => console.error(e));
                this.setPlayingUI(btnElement, player);
                return;
            }
        }

        const player = new Audio(url);
        this.players[url] = player;
        player.play().catch(e => console.error(e));
        this.setPlayingUI(btnElement, player);
    }

    setPlayingUI(btnElement, player) {
        btnElement.style.boxShadow = '0 0 15px #4caf50';
        btnElement.style.transform = 'scale(0.95)';
        
        // Guardar icono original
        if (!btnElement.dataset.originalIcon) {
            const i = btnElement.querySelector('i');
            if (i) btnElement.dataset.originalIcon = Array.from(i.classList).find(c => c.startsWith('fa-') && c !== 'fa-solid');
        }
        
        btnElement.innerHTML = btnElement.innerHTML.replace(btnElement.dataset.originalIcon, 'fa-stop');

        player.onended = () => {
            btnElement.style.boxShadow = '';
            btnElement.style.transform = '';
            if (btnElement.dataset.originalIcon) {
                btnElement.innerHTML = btnElement.innerHTML.replace('fa-stop', btnElement.dataset.originalIcon);
            }
        };
    }

    initKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key;
            const block = this.audioBlocks.find(b => b.keyboardKey === key);
            if (block) {
                const btn = document.getElementById(`btn-audio-${block.id}`);
                this.toggleAudio(block.audioUrl, btn);
            }
        });
    }
}
