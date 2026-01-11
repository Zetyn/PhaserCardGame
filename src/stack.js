
export default class Stack {
    constructor(x, y, type = 'tableau', buildUp = null, index = 0) {
        this.x = x;
        this.y = y;
        this.cards = [];
        this.type = type;
        this.buildUp = buildUp;
        this.index = index;
        this.rotation = 0;
        this.offsetY = 0.5; // Тонкий об'єм
    }

    push(card) {
        this.cards.push(card);
        card.sourceStack = this;
        
        if (this.type === 'tableau' && card.scene.tableauLayer) {
            card.scene.tableauLayer.add(card);
        } else if (this.type === 'foundation' && card.scene.foundationLayer) {
            card.scene.foundationLayer.add(card);
        }
        
        this.updatePositions();
    }

    pop() {
        const card = this.cards.pop();
        this.updatePositions();
        return card;
    }

    top() {
        return this.cards[this.cards.length - 1];
    }

    updatePositions() {
        this.cards.forEach((card, index) => {
            card.x = this.x;
            card.y = this.y - (index * this.offsetY);
            card.setRotation(this.rotation);
            card.originX = card.x;
            card.originY = card.y;
            card.disableInteractive();
            card.setDepth(index);
            card.clearTint();
        });

        const top = this.top();
        if (top) {
            top.setInteractive({ useHandCursor: true });
            top.scene.input.setDraggable(top);
            top.setDepth(100);
        }
    }

    canPlace(card) {
        if (this.type === 'tableau') {
            if (this.cards.length === 0) return false;
            const top = this.top();
            const diff = Math.abs(top.value - card.value);
            return (top.suit === card.suit && (diff === 1 || diff === 12));
        }
        if (this.cards.length === 0) return card.value === (this.buildUp ? 1 : 13);
        const top = this.top();
        return (card.suit === top.suit && ((this.buildUp && card.value === top.value + 1) || (!this.buildUp && card.value === top.value - 1)));
    }

    containsPoint(x, y) {
        return Phaser.Math.Distance.Between(x, y, this.x, this.y) < 50;
    }
}