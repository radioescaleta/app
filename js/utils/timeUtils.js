// js/utils/timeUtils.js

/**
 * Intenta convertir un string a formato MM:SS
 * Si no puede, devuelve null.
 */
export function formatTime(input) {
    if (!input) return "00:00";
    
    // Limpiar espacios
    let val = input.trim();
    
    // Si ya tiene el formato exacto MM:SS
    if (/^\d{2}:\d{2}$/.test(val)) {
        return val;
    }
    
    // Si tiene M:SS
    if (/^\d{1}:\d{2}$/.test(val)) {
        return '0' + val;
    }
    
    // Si solo puso números (ej. 130 -> 01:30, 45 -> 00:45)
    if (/^\d+$/.test(val)) {
        const num = parseInt(val, 10);
        if (val.length <= 2) {
            // Asumimos que son segundos o minutos según contexto, pero estándar: son segundos
            const m = Math.floor(num / 60);
            const s = num % 60;
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } else {
            // Ejemplo 130 -> 1 min 30 seg, o 1:30
            // Lo más seguro es coger los dos últimos como segundos
            const s = parseInt(val.slice(-2), 10);
            const m = parseInt(val.slice(0, -2), 10);
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }
    
    return null; // Invalido
}

/**
 * Convierte MM:SS a segundos totales (útil para el ancho del Gantt)
 */
export function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return (m * 60) + s;
}

/**
 * Convierte segundos a formato MM:SS
 */
export function secondsToTime(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
