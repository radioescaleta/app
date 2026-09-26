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
            if (bData.type === 'text') {
                return new TextBlock(bData.content, bData.id);
            } else if (bData.type === 'audio') {
                return new AudioBlock(bData.category, bData.title, bData.audioUrl, bData.keyboardKey, bData.id);
            }
        });
        return p;
    }
}
