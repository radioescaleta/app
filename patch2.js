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
            endInput.value = block.endTime || block.duration || "00:00"; // Compatibilidad

            const calcDuration = () => {
                const s = window.timeUtils ? window.timeUtils.timeToSeconds(startInput.value) : 0;
                const e = window.timeUtils ? window.timeUtils.timeToSeconds(endInput.value) : 0;
                let d = e - s;
                if (d < 0) d = 0;
                return window.timeUtils ? window.timeUtils.secondsToTime(d) : "00:00";
            };

            const durationSpan = document.createElement('span');
            durationSpan.className = 'duration-label';
            durationSpan.style.fontSize = '11px';
            durationSpan.style.color = '#777';
            durationSpan.style.margin = 'auto 5px';

            const updateDuration = () => {
                // Requiere exponer timeUtils al window temporalmente o importarlo mejor
                // Como formatTime y timeToSeconds están exportadas, las uso directamente
            };
