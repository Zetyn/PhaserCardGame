
import Card from './card.js';

export default class Deck {
    constructor(scene) {
        this.scene = scene;
        this.cards = [];

        // 2 колоди (104 карти)
        for (let d = 0; d < 2; d++) {
            ['hearts', 'diamonds', 'clubs', 'spades'].forEach(suit => {
                for(let i = 1; i <= 13; i++){
                    this.cards.push(new Card(scene, 0, 0, suit, i));
                }
            });
        }
    }

    shuffle() {
        for(let i = this.cards.length - 1; i > 0; i--){
            let j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}