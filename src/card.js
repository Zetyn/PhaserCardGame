export default class Card extends Phaser.GameObjects.Sprite {
    static SCALE = 1.3;

    constructor(scene, x, y, suit, value) {
        super(scene, x, y, 'cards');

        this.scene = scene;
        this.suit = suit;
        this.value = value;
        this.faceUp = true;
        this.sourceStack = null;

        this.setFrame(this.getFrameIndex());
        this.setScale(Card.SCALE);

        this.scene.add.existing(this);
    }

    getFrameIndex() {
        const col = this.value - 1;

        const rows = {
            hearts: 0,
            spades: 1,
            diamonds: 2,
            clubs: 3
        };

        return rows[this.suit] * 13 + col;
    }

    flipUp() {
        this.faceUp = true;
        this.setAlpha(1);
    }

    flipDown() {
        this.faceUp = false;
        this.setAlpha(0.5);
    }
}
