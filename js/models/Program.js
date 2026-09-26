// js/models/Program.js
import { TextBlock, AudioBlock } from "./Block.js";

export class Program {
    constructor(title = "Mi Programa de Radio", ownerId = null) {
        this.id = null;
        this.title = title;
        this.ownerId = ownerId;
        this.blocks = [];
        this.collaborators = {};
        this.createdAt = new Date().toISOString();
    }

    addBlock(block) {
        this.blocks.push(block);
    }

    removeBlock(blockId) {
        this.blocks = this.blocks.filter(b => b.id !== blockId);
    }

    updateBlockOrder(newOrderIds) {
        const newBlocks = [];
        newOrderIds.forEach(id => {
            const block = this.blocks.find(b => b.id === id);
            if (block) newBlocks.push(block);
        });
        this.blocks = newBlocks;
    }

    toFirestore() {
        return {
            id: this.id,
            title: this.title,
            ownerId: this.ownerId,
            blocks: this.blocks.map(b => ({...b})), // Simplificar para firestore
            collaborators: this.collaborators,
            createdAt: this.createdAt
        };
    }

    static fromFirestore(data) {
        const p = new Program(data.title, data.ownerId);
        p.id = data.id;
        p.collaborators = data.collaborators || {};
        p.createdAt = data.createdAt || new Date().toISOString();
        
        p.blocks = (data.blocks || []).map(bData => {
            let block;
            if (bData.type === 'text') {
                block = new TextBlock(bData.content, bData.id);
            } else if (bData.type === 'audio') {
                block = new AudioBlock(bData.category, bData.title, bData.audioUrl ? bData.audioUrl.replace(".ogg", ".mp3") : "", bData.keyboardKey, bData.id, bData.maxDuration || 0);
            }
            if (block) {
                block.startTime = bData.startTime || "00:00";
                block.endTime = bData.endTime || bData.duration || "00:00";
                if (block.type === 'audio') block.isBackground = !!bData.isBackground;
            }
            return block;
        });
        return p;
    }
}
