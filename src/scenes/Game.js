import Deck from '../deck.js';
import Stack from '../stack.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.draggedCard = null;
        this.shufflesLeft = 3;
        this.history = [];
    }

    preload() {
        this.load.spritesheet('cards', 'public/assets/cards.png', {
            frameWidth: 53,
            frameHeight: 70,
            spacing: 3,
        });
    }

    create() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xffa07a, 0xffa07a, 1);
        bg.fillRect(0, 0, 1200, 700);

        this.deck = new Deck(this);
        this.deck.shuffle();

        this.tableau = [];
        this.foundation = [];
        
        this.foundationLayer = this.add.container(0, 0);
        this.tableauLayer = this.add.container(0, 0);

        this.foundationLayer.setDepth(1);
        this.tableauLayer.setDepth(2);

        const aceStartX = 100;
        const foundationY = 500;
        const foundationSpacing = 70;

        // 4 Aces (Foundation)
        for(let i = 0; i < 4; i++){
            const stack = new Stack(aceStartX + i * foundationSpacing, foundationY, 'foundation', true, i);
            this.foundation.push(stack);
        }

        // 4 Kings (Foundation)
        const kingStartX = 1200 - 100 - 3 * foundationSpacing;
        for(let i = 0; i < 4; i++){
            const stack = new Stack(kingStartX + i * foundationSpacing, foundationY, 'foundation', false, i + 4);
            this.foundation.push(stack);
        }

        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        suits.forEach((suit, idx) => {
            const aceIdx = this.deck.cards.findIndex(c => c.suit === suit && c.value === 1);
            if (aceIdx !== -1) {
                const ace = this.deck.cards.splice(aceIdx, 1)[0];
                ace.flipUp();
                this.foundation[idx].push(ace);
            }
            const kingIdx = this.deck.cards.findIndex(c => c.suit === suit && c.value === 13);
            if (kingIdx !== -1) {
                const king = this.deck.cards.splice(kingIdx, 1)[0];
                king.flipUp();
                this.foundation[4 + idx].push(king);
            }
        });

        const shuffleX = 1050;
        const shuffleY = 650;

        const shuffleBtn = this.add.circle(shuffleX, shuffleY, 25, 0x4169e1)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);

        this.add.text(shuffleX, shuffleY, '🎲', { fontSize: '24px' }).setOrigin(0.5);

        this.shuffleText = this.add.text(shuffleX, shuffleY + 35, `Shuffles: ${this.shufflesLeft}`, {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        shuffleBtn.on('pointerdown', () => this.shuffleTableau());

        shuffleBtn.on('pointerover', () => shuffleBtn.setFillStyle(0x1e90ff));
        shuffleBtn.on('pointerout', () => shuffleBtn.setFillStyle(0x4169e1));

        const stackCount = 16;
        const centerX = 600; 
        const centerY = 1350;
        const radius = 1150;

        const startAngle = Phaser.Math.DegToRad(252); 
        const endAngle = Phaser.Math.DegToRad(288); 
        const totalAngle = endAngle - startAngle;

        for (let i = 0; i < stackCount; i++) {
            const t = i / (stackCount - 1);
            const angle = startAngle + t * totalAngle;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const stack = new Stack(x, y, 'tableau', null, i);
            stack.rotation = angle + Math.PI / 2;
            
            for (let j = 0; j < 6; j++) {
                if (this.deck.cards.length > 0) {
                    const card = this.deck.deal();
                    card.flipUp();
                    stack.push(card);
                }
            }
            this.tableau.push(stack);
        }

        this.sortDisplayOrder();

        const undoBtn = this.add.circle(600, 520, 25, 0x2596be).setInteractive({useHandCursor: true}).setStrokeStyle(2, 0xffffff);
        this.add.text(600, 520, '↩', {fontSize: '24px', color: '#fff'}).setOrigin(0.5);
        undoBtn.on('pointerdown', () => this.undoMove());

        // DRAG & DROP
        this.input.on('dragstart', (pointer, card) => {
            this.draggedCard = card;
            card.setDepth(2000);
            card.setTint(0xffff88);

            this.history.push({
                card: card,
                fromStack: card.sourceStack
            });
            
            if (this.history.length > 5) this.history.shift();
        });

        this.input.on('drag', (pointer, card, dragX, dragY) => {
            card.x = dragX;
            card.y = dragY;
        });

        this.input.on('dragend', (pointer, card) => {
            card.clearTint();
            let placed = false;
            const allStacks = [...this.tableau, ...this.foundation];
            
            for (let stack of allStacks) {
                if (stack !== card.sourceStack && stack.containsPoint(card.x, card.y) && stack.canPlace(card)) {
                    if (card.sourceStack) card.sourceStack.pop();
                    stack.push(card);
                    placed = true;
                    this.checkWin();
                    break;
                }
            }
            
            if (!placed) {
                this.history.pop();
                this.tweens.add({
                    targets: card,
                    x: card.originX,
                    y: card.originY,
                    duration: 200,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.sortDisplayOrder();
                    }
                });
            } else {
                this.sortDisplayOrder();
            }
            this.draggedCard = null;
        });
    }

    sortDisplayOrder() {
        this.tableauLayer.removeAll(false);
        
        this.tableau.forEach(stack => {
            stack.cards.forEach(card => {
                this.tableauLayer.add(card);
                
                card.setDepth(0); 
            });
            
            stack.updatePositions();
        });

        if (this.draggedCard) {
            this.children.bringToTop(this.draggedCard);
        }
    }

    checkWin() {
        if (this.foundation.every(s => s.cards.length === 13)) {
            this.add.text(600, 350, 'VICTORY!', { fontSize: '64px', color: '#ffd700' }).setOrigin(0.5);
        }
    }

    undoMove() {
    if (this.history.length === 0) return;

    const lastMove = this.history.pop();
    const { card, fromStack } = lastMove;

    if (card.sourceStack) card.sourceStack.pop();
    fromStack.push(card);

    this.sortDisplayOrder();
    }
    
    shuffleTableau() {
    if (this.shufflesLeft <= 0) return;

    let allTableauCards = [];
    this.tableau.forEach(stack => {
        while (stack.cards.length > 0) {
            allTableauCards.push(stack.pop());
        }
    });

    Phaser.Utils.Array.Shuffle(allTableauCards);

    let cardIndex = 0;
    for (let i = 0; i < allTableauCards.length; i++) {
        const stackIndex = i % this.tableau.length; // Рівномірно по стопках
        this.tableau[stackIndex].push(allTableauCards[i]);
    }

    this.shufflesLeft--;
    this.shuffleText.setText(`Shuffles: ${this.shufflesLeft}`);
    this.sortDisplayOrder();
    
    this.history = [];
    }
}