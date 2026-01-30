import Card from './card.js';

export default class Stack extends Phaser.GameObjects.Container {
    constructor(scene, x, y, type = 'tableau', buildUp = null, index = 0) {
       
        super(scene, x, y);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.cards = [];
        this.type = type;
        this.buildUp = buildUp;
        this.index = index;
        this.rotation = 0;

        scene.add.existing(this);

        const placeholder = scene.add.sprite(0, 0, 'common1', 'card_place');
        placeholder.setScale(Card.SCALE);
        this.add(placeholder);
        // Різний offset для різних типів стопок
        if (type === 'foundation') {
            this.offsetY = 0.3; // Майже накладаються одна на одну
        } else {
            this.offsetY = 20; // Нормальний об'єм для таблі
        }
    }

    push(card) {
        this.cards.push(card);
        card.sourceStack = this;

        // Додаємо в правильний шар сцени
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

    // Видаляє конкретну карту зі стопки (для туторіалу або магії)
    removeCard(card) {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            // Видаляємо карту з масиву
            this.cards.splice(index, 1);
            
            // Відв'язуємо карту від цього стеку
            card.sourceStack = null;

            // Оновлюємо позиції інших карт, щоб закрити "дірку"
            this.updatePositions();
            return true;
        }
        return false;
    }

    top() {
        return this.cards[this.cards.length - 1];
    }

    updatePositions() {
        // 1. Налаштування вектору зміщення
        const dirX = Math.sin(this.rotation); // dirX - зміщення по горизонталі, dirY - по вертикалі
        const dirY = Math.cos(this.rotation); // Math.sin/cos дозволяють картам слідувати за поворотом стеку


        // 2. Відступ між картами (Ефект "Товстої колоди")
        //const cardSpacing = -5; 
        let cardSpacing;
        if (this.type === 'foundation') {
            cardSpacing = 0.5; 
        } else {
            cardSpacing = -5; 
        }

        // 3. Обробка всіх карт
        this.cards.forEach((card, index) => {
            // Вимикаємо клікабельність для карт (вмикаємо тільки для верхньої нижче)
            card.disableInteractive(); 
            
            // Розрахунок позиції
            const x = this.x + (dirX * index * cardSpacing);
            const y = this.y + (dirY * index * cardSpacing);

            // Якщо карта зараз перетягується мишкою - не рухаємо її
            if (card !== this.scene.draggedCard) {
                card.setPosition(x, y);
                card.homeX = x;
                card.homeY = y;
                card.setRotation(this.rotation);
            }
        });

        // 4. Логіка для верхньої карти (активація)
        const top = this.top();
        this.enforceTopCardVisibility();

        if (!top) return;
        
        if (this.type === 'foundation') {
            return;
        }

        if (top) {
            top.scene.input.setDraggable(top);
        }
        top.scene.input.setDraggable(top);
    }

    canPlace(card) {
        if (this.type === 'tableau') {
            if (this.cards.length === 0) return true; 

            const top = this.top();

            if (card.suit !== top.suit) {
                console.log(` Відмова: Потрібна масть ${top.suit}, а ти кладеш ${card.suit}`);
                return false;
            }

            const diff = Math.abs(card.value - top.value);

            if (diff !== 1) {
                console.log(` Відмова: Карта має бути на 1 більша або менша (різниця зараз: ${diff})`);
                return false;
            }
            
            return true;
        }
        
        if (this.type === 'foundation') {
            if (this.cards.length === 0) {
                return this.buildUp ? card.value === 1 : card.value === 13;
            }
            
            const top = this.top();
            if (card.suit !== top.suit) return false;
            
            if (this.buildUp) {
                return card.value === top.value + 1; // Тузи: 1 -> 2 -> 3
            } else {
                return card.value === top.value - 1; // Королі: 13 -> 12 -> 11
            }
        }
        
        return false;
    }

    containsPoint(x, y) { 
        const hitRadius = 80;
        
        const distToBase = Phaser.Math.Distance.Between(x, y, this.x, this.y);
        if (distToBase < hitRadius) return true;

        const top = this.top();
        if (top) {
            const distToTop = Phaser.Math.Distance.Between(x, y, top.x, top.y);
            if (distToTop < hitRadius) return true;
        }

        return false;
    }

    // Метод для оновлення видимості карт (тільки верхня активна)
    enforceTopCardVisibility() {
            if (this.scene.isShuffling) return;
            if (this.type === 'foundation') return;

            const topIndex = this.cards.length - 1;

            this.cards.forEach((card, index) => {
                if (index === topIndex) {
                    // --- ВЕРХНЯ КАРТА ---
                    if (!card.faceUp) {
                        if (this.type !== 'foundation') { 
                        card.faceUp = true;
                        if (card.refresh) card.refresh(); 
                        else card.flipUp(); 
                    }

                    }
                    
                    card.clearTint();
                    card.setInteractive(); 
                    // Draggable встановлюється в updatePositions для Tableau
                } else {
                    // --- НИЖНІ КАРТИ ---
                    /*if (card.faceUp) {
                        card.flipDown(); 
                    }*/
                    
                    card.setTint(0x999999); 
                    card.disableInteractive();
                }
            });
        }
}