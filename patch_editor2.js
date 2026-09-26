window.addAudioWithTimeCalculation = function(title, url, category) {
    import('./utils/timeUtils.js').then(module => {
        const audio = new Audio(url);
        audio.onloadedmetadata = function() {
            const durSec = audio.duration;
            let maxEnd = 0;
            currentProgram.blocks.forEach(b => {
                const e = module.timeToSeconds(b.endTime);
                if (e > maxEnd) maxEnd = e;
            });
            
            const startSec = maxEnd;
            const endSec = Math.floor(startSec + durSec);
            
            escaletaUI.addBlock('audio', {
                title: title,
                audioUrl: url,
                category: category,
                startTime: module.secondsToTime(startSec),
                endTime: module.secondsToTime(endSec),
                maxDuration: durSec
            });
        };
        
        audio.onerror = function() {
            escaletaUI.addBlock('audio', { title: title, audioUrl: url, category: category });
        };
    });
};
