// js/components/AudioBoard.js

export class AudioBoard {
    constructor(containerId, globalAudioElementId) {
        this.container = document.getElementById(containerId);
        this.audioPlayer = document.getElementById(globalAudioElementId);
        this.audioBlocks = [];
        this.initKeyboardListeners();
    }

    updateBoard(blocks) {
        this.audioBlocks = blocks.filter(b => b.type === 'audio');
        this.render();
    }

    render() {
        // Limpiar botonera (manteniendo el título)
        this.container.innerHTML = '<h3>Botonera de audios</h3>';

        this.audioBlocks.forEach((block, index) => {
            const btn = document.createElement('button');
            btn.className = `audio-btn ${block.category === 'sintonia' ? 'primary' : 'secondary'}`;
            btn.title = block.title;
            
            // Icono
            let iconClass = 'fa-music';
            if (block.category === 'efectos') iconClass = 'fa-bolt';
            
            btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;

            // Atajo de teclado (1, 2, 3...)
            const key = index + 1;
            block.keyboardKey = key.toString(); // Actualizar el modelo
            
            if (key <= 9) {
                const badge = document.createElement('div');
                badge.className = 'shortcut-badge';
                badge.innerText = key;
                btn.appendChild(badge);
            }

            btn.addEventListener('click', () => this.playAudio(block.audioUrl));
            this.container.appendChild(btn);
        });
    }

    playAudio(url) {
        if (!url) {
            console.warn("Sin URL de audio");
            return;
        }
        this.audioPlayer.src = url;
        this.audioPlayer.play().catch(e => console.error("Error reproduciendo audio:", e));
    }

    initKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Ignorar si estamos escribiendo en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key;
            const block = this.audioBlocks.find(b => b.keyboardKey === key);
            if (block) {
                this.playAudio(block.audioUrl);
            }
        });
    }
}
