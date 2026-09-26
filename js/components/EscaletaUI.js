// js/components/EscaletaUI.js
import { TextBlock, AudioBlock } from "../models/Block.js";

export class EscaletaUI {
    constructor(containerId, program, onUpdateCallback) {
        this.container = document.getElementById(containerId);
        this.program = program;
        this.onUpdateCallback = onUpdateCallback; // Callback para actualizar botonera
        this.initSortable();
    }

    initSortable() {
        if (typeof Sortable !== 'undefined') {
            Sortable.create(this.container, {
                animation: 150,
                onEnd: (evt) => {
                    this.updateOrderFromDOM();
                }
            });
        }
    }

    addBlock(type, data = {}) {
        let block;
        if (type === 'text') {
            block = new TextBlock(data.content || "Nuevo bloque de texto...");
        } else if (type === 'audio') {
            block = new AudioBlock(data.category || 'sintonia', data.title || "Audio", data.url || "");
        }
        
        if (block) {
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

            const input = document.createElement('input');
            input.type = 'text';
            input.value = block.type === 'text' ? block.content : block.title;
            input.addEventListener('change', (e) => {
                if (block.type === 'text') block.content = e.target.value;
                else block.title = e.target.value;
                this.notifyUpdate();
            });

            const actions = document.createElement('div');
            actions.className = 'block-actions';
            
            const btnDelete = document.createElement('button');
            btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btnDelete.title = "Eliminar bloque";
            btnDelete.addEventListener('click', () => this.removeBlock(block.id));
            
            actions.appendChild(btnDelete);

            el.appendChild(input);
            el.appendChild(actions);

            this.container.appendChild(el);
        });
    }
}
