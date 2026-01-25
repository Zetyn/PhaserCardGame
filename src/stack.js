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

    top() {
        return this.cards[this.cards.length - 1];
    }

    updatePositions() {
        // 1. Налаштування вектору зміщення
        
        const dirX = Math.sin(this.rotation); // dirX - зміщення по горизонталі, dirY - по вертикалі
        const dirY = Math.cos(this.rotation); // Math.sin/cos дозволяють картам слідувати за поворотом стеку


        // 2. Відступ між картами (Ефект "Товстої колоди")
        // 1.5 пікселя - це товщина однієї карти. 
        // Якщо хочеш, щоб було видно трохи більше малюнка карти знизу, постав 20 або 30.
        // Але для "щільної стопки" залиш 1.5 або 2.
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
        
        // Якщо це фундація (Тузи), ми зазвичай не тягаємо звідти карти (або тягаємо - залежить від правил)
        if (this.type === 'foundation') {
            // Якщо хочеш дозволити брати карти з фундації назад на стіл - розкоментуй:
            // top.setInteractive(); 
            // top.scene.input.setDraggable(top);
            return;
        }

        // Вмикаємо інтерактивність ТІЛЬКИ для верхньої карти
        //top.setInteractive(); 

        if (top) {
            top.scene.input.setDraggable(top);
        }
        top.scene.input.setDraggable(top);
    }

// src/stack.js

    canPlace(card) {
        // --- TABLEAU (Ігрове поле - Твої нові правила) ---
        if (this.type === 'tableau') {
            // 1. На пусте місце кладемо будь-що (або додай умову для Короля)
            if (this.cards.length === 0) return true; 

            const top = this.top();

            // --- Правило 1: Тільки однакові масті ---
            if (card.suit !== top.suit) {
                console.log(`❌ Відмова: Потрібна масть ${top.suit}, а ти кладеш ${card.suit}`);
                return false;
            }

            // --- Правило 2: Різниця в 1 (вгору або вниз) ---
            // Math.abs перетворює мінус на плюс. 
            // 6 - 5 = 1 
            // 6 - 7 = -1 (Math.abs зробить це 1)
            const diff = Math.abs(card.value - top.value);

            if (diff !== 1) {
                console.log(`❌ Відмова: Карта має бути на 1 більша або менша (різниця зараз: ${diff})`);
                return false;
            }
            
            return true;
        }
        
        // --- FOUNDATION (Бази зверху - залишаємо стандартні правила) ---
        // Якщо хочеш і тут змінити - скажи. Поки що тут: одна масть + суворий порядок.
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
        // [FIX] Перевіряємо відстань і до БАЗИ стеку, і до ВЕРХНЬОЇ карти.
        // Це дозволяє "влучити" в стек, навіть якщо він довгий або вигнутий.
        
        const hitRadius = 80; // Ще трохи збільшив для надійності
        
        // 1. Дистанція до основи (порожнього місця)
        const distToBase = Phaser.Math.Distance.Between(x, y, this.x, this.y);
        if (distToBase < hitRadius) return true;

        // 2. Дистанція до верхньої карти (якщо вона є)
        const top = this.top();
        if (top) {
            const distToTop = Phaser.Math.Distance.Between(x, y, top.x, top.y);
            if (distToTop < hitRadius) return true;
        }

        return false;
    }

    // Метод для оновлення видимості карт (тільки верхня активна)
    enforceTopCardVisibility() {
            // 🔧 ВИПРАВЛЕННЯ 3: Обов'язкова перевірка на шафл!
            // Якщо сцена зараз перемішує карти, стек не повинен втручатися.
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
                    if (card.faceUp) {
                        // Перевірка, чи це фундація. У фундації часто всі карти лежать лицем догори.
                        // Якщо ти хочеш, щоб у фундації теж була видна тільки верхня - залиши як є.
                        // Якщо у фундації мають бути видні всі - додай умову if (this.type !== 'foundation')
                        card.flipDown(); 
                    }
                    
                    card.setTint(0x999999); 
                    card.disableInteractive();
                }
            });
        }
}