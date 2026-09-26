// js/models/Block.js
export class Block {
    constructor(type, id = null) {
        this.id = id || 'block_' + Date.now() + Math.random().toString(36).substr(2, 9);
        this.type = type; // 'text', 'audio'
        this.startTime = "00:00";
        this.endTime = "00:00";
    }
}

export class TextBlock extends Block {
    constructor(content = "", id = null) {
        super('text', id);
        this.content = content;
    }
}

export class AudioBlock extends Block {
    constructor(category, title = "", audioUrl = "", keyboardKey = "", id = null, maxDuration = 0) {
        super('audio', id);
        this.category = category; // 'sintonia', 'efecto', 'musica'
        this.title = title;
        this.audioUrl = audioUrl;
        this.maxDuration = maxDuration;
        this.keyboardKey = keyboardKey;
    }
}
