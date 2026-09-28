// js/components/GanttUI.js
import { timeToSeconds, formatTime } from "../utils/timeUtils.js";

export class GanttUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        // Escala: 1 segundo = 3 píxeles
        this.pixelsPerSecond = 20;
    }

    calculateLanes(blocks) {
        blocks.sort((a, b) => a.startSec - b.startSec);
        const lanes = [];
        blocks.forEach(b => {
            let placed = false;
            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i] <= b.startSec) {
                    b.lane = i;
                    lanes[i] = b.startSec + b.durSec;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                b.lane = lanes.length;
                lanes.push(b.startSec + b.durSec);
            }
        });
        return lanes.length;
    }

    render(program) {
        this.container.innerHTML = '';
        if (!program || program.blocks.length === 0) {
            this.container.innerHTML = '<p style="text-align:center; padding: 20px;">No hay bloques en la escaleta para dibujar el Gantt.</p>';
            return;
        }

        // Dividir bloques en pistas (Principal vs Fondo)
        const mainTrack = [];
        const bgTrack = [];
        let maxTime = 0;

        program.blocks.forEach(b => {
            const startSec = timeToSeconds(b.startTime);
            let endSec = timeToSeconds(b.endTime || b.duration); // b.duration para compatibilidad
            
            // Si el fin es menor que el inicio, asumimos que dura 0 (es solo un marcador)
            if (endSec < startSec) endSec = startSec;
            
            const durSec = endSec - startSec;
            if (endSec > maxTime) maxTime = endSec;

            if (b.isBackground || (b.type === 'audio' && b.category === 'musica')) {
                bgTrack.push({ ...b, startSec, durSec });
            } else {
                mainTrack.push({ ...b, startSec, durSec });
            }
        });

        // Dar un poco de margen al final (ej. 30 segundos)
        maxTime += 30;
        const totalWidth = maxTime * this.pixelsPerSecond;

        // Contenedor principal scrollable
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'gantt-scroll-wrapper';

        const ganttCanvas = document.createElement('div');
        ganttCanvas.className = 'gantt-canvas';
        ganttCanvas.style.width = `${totalWidth}px`;

        // Dibujar regla de tiempo (cada 10 segundos)
        const timeline = document.createElement('div');
        timeline.className = 'gantt-timeline';
        for (let s = 0; s <= maxTime; s += 5) {
            const mark = document.createElement('div');
            mark.className = 'gantt-mark';
            mark.style.left = `${s * this.pixelsPerSecond}px`;
            
            const m = Math.floor(s / 60);
            const r = s % 60;
            mark.innerText = `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
            timeline.appendChild(mark);
        }
        ganttCanvas.appendChild(timeline);

        // Track 1 (Principal)
        const mainLanes = this.calculateLanes(mainTrack);
        const track1 = document.createElement('div');
        track1.className = 'gantt-track main-track';
        track1.innerHTML = '<div class="track-label">Voz y Efectos</div>';
        if (mainLanes > 0) track1.style.height = `${30 + (mainLanes * 45) + 10}px`;
        mainTrack.forEach(b => this.createBar(b, track1));
        ganttCanvas.appendChild(track1);

        // Track 2 (Fondo)
        const bgLanes = this.calculateLanes(bgTrack);
        const track2 = document.createElement('div');
        track2.className = 'gantt-track bg-track';
        track2.innerHTML = '<div class="track-label">Música de fondo</div>';
        if (bgLanes > 0) track2.style.height = `${30 + (bgLanes * 45) + 10}px`;
        bgTrack.forEach(b => this.createBar(b, track2));
        ganttCanvas.appendChild(track2);

        scrollWrapper.appendChild(ganttCanvas);
        this.container.appendChild(scrollWrapper);
    }

    createBar(block, trackEl) {
        if (block.durSec <= 0) return; // No dibujar si no tiene duración

        const bar = document.createElement('div');
        bar.className = `gantt-bar ${block.type}`;
        if (block.type === 'audio') bar.classList.add(`audio-${block.category}`);
        
        bar.style.left = `${block.startSec * this.pixelsPerSecond}px`;
        bar.style.width = `${block.durSec * this.pixelsPerSecond}px`;
        if (block.lane !== undefined) {
            bar.style.top = `${30 + (block.lane * 45)}px`;
        }
        
        const text = block.type === 'text' ? block.content : block.title;
        bar.innerText = text;
        const eTime = block.endTime || block.duration;
        bar.title = `[${block.startTime} a ${eTime}] ${text}`;

        trackEl.appendChild(bar);
    }
}
