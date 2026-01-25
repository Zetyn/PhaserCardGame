import Deck from '../deck.js';
import Stack from '../stack.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.draggedCard = null;
        this.shufflesLeft = 10;
        this.history = [];
        this.isShuffling = false;
    }

    preload() {
        this.load.image('bg_gameplay', 'assets/bg_gameplay.jpg');

        this.load.atlas({
            key: 'common1',
            textureURL: 'assets/common1.png',
            atlasURL: 'assets/common1.json'
        });
        this.load.atlas({
            key: 'common2',
            textureURL: 'assets/common2.png',
            atlasURL: 'assets/common2.json'
        });
    }

    create() {

        // Розміщуємо по центру
        const gameBg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg_gameplay');
        // Підганяємо під розмір вікна гри
        gameBg.setDisplaySize(this.scale.width, this.scale.height);

        const panelWidth = 275; // Ширина вашої панелі з common1.json
        const playableWidth = this.scale.width - panelWidth; // Залишок місця для карт
        const gameCenterX = panelWidth + (playableWidth / 2); // Новий центр ігрового поля

        // Встановлюємо глибину -1, щоб фон точно був під усіма картами та UI
        gameBg.setDepth(-1);

        this.deck = new Deck(this);
        this.deck.shuffle();

        this.diamonds = 5000; // Початковий баланс

        this.tableau = [];
        this.foundation = [];
        
        this.foundationLayer = this.add.container(0, 0);
        this.tableauLayer = this.add.container(0, 0);

        this.foundationLayer.setDepth(1);
        this.tableauLayer.setDepth(2);

        this.input.setTopOnly(true);

        const aceStartX = panelWidth + 60;
        const foundationY = 700;
        const foundationSpacing = 100;

        this.currentLanguage = 'en';
        // 4 Aces (Foundation)
        for(let i = 0; i < 4; i++){
            const stack = new Stack(this, aceStartX + i * foundationSpacing, foundationY, 'foundation', true, i);
            this.foundation.push(stack);
        }

        // 4 Kings (Foundation)
        const kingStartX = this.scale.width - 60 - (3 * foundationSpacing);
        for(let i = 0; i < 4; i++){
            const stack = new Stack(this, kingStartX + i * foundationSpacing, foundationY, 'foundation', false, i + 4);
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

        const stackCount = 16;
        const centerX = gameCenterX; 
        const centerY = 1350;
        const radius = 1150;

        const row1Count = 10; // Кількість у першому ряду
        const row1Y = 200; 
        const row2Y = 450; // Другий ряд нижче

        // Налаштування ширини та перекриття
        const cardWidth = 115; // Приблизна ширина карти/спрайта
        const overlap = 12; 

        const spacingX = cardWidth - overlap; // Відстань між центрами стеків

        const startAngle = Phaser.Math.DegToRad(252); 
        const endAngle = Phaser.Math.DegToRad(288); 
        const totalAngle = endAngle - startAngle;

        const curveStrength = 0.35;  // Сила вигину (0.2-0.5 оптимально)
        const rotationStrength = 0.06; // Сила повороту (0.04-0.08)


        const curveRot = 0.04; 
        const curveY = 2; // Вигин арки (20)

        for (let i = 0; i < 16; i++) {
            let x, y, rotation;

            if (i < row1Count) {
                // --- ПЕРШИЙ РЯД ---
                const totalWidth = (row1Count - 1) * spacingX;
                const startX = gameCenterX - (totalWidth / 2);
                
                const centerIndex = (row1Count - 1) / 2;
                const diff = (i - centerIndex);

                x = startX + (i * spacingX);
                // Робимо м'якшу арку
                y = row1Y + (diff * diff * curveY);
                rotation = diff * curveRot;

            } else {
                // --- ДРУГИЙ РЯД ---
                const row2Index = i - row1Count; 
                const row2TotalCount = 16 - row1Count; 
                
                const totalWidth = (row2TotalCount - 1) * spacingX;
                const startX = gameCenterX - (totalWidth / 2);

                const centerIndex = (row2TotalCount - 1) / 2;
                const diff = (row2Index - centerIndex);

                x = startX + (row2Index * spacingX);
                y = row2Y + (diff * diff * curveY);
                rotation = diff * curveRot;
            }

            const stack = new Stack(this, x, y, 'tableau', null, i);
            stack.rotation = rotation; 

            // Роздача карт
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

        // Створюємо UI для діамантів та бонусів
        this.createGameUI();

        // DRAG & DROP
        this.input.on('dragstart', (pointer, card) => {
            this.draggedCard = card;
            if (card.parentContainer) {
                card.parentContainer.remove(card);
            }
            // Додаємо її просто на сцену
            this.add.existing(card);

            // 2. Ставимо ВЕЛИЧЕЗНУ глибину. 
            // Твої стеки мають глибину ~10000, тому 3000 було замало.
            card.setDepth(99999);
            card.startRotation = card.rotation;

            // Зупиняємо будь-які попередні анімації на цій карті, щоб не було глюків
            this.tweens.killTweensOf(card);

            // АНІМАЦІЯ ПІДЙОМУ 🚀
            this.tweens.add({
                targets: card,
                scale: 1.5,       // Трохи збільшуємо (було 1.3) -> ефект "підлітання" до камери
                rotation: 0,      // Плавно вирівнюємо
                duration: 200,    // Швидкість (0.2 сек)
                ease: 'Cubic.out' // Плавний старт
            });
            const stack = card.sourceStack;
            if (stack && stack.cards.length > 1) {
                // Знаходимо індекс нашої карти
                const myIndex = stack.cards.indexOf(card);
                
                // Якщо під нами є карта (індекс більше 0)
                if (myIndex > 0) {
                    const cardBelow = stack.cards[myIndex - 1];
                    
                    // Відкриваємо її, якщо вона закрита
                    if (!cardBelow.faceUp) {
                        cardBelow.faceUp = true;
                        
                        // Оновлюємо текстуру
                        if (cardBelow.refresh) cardBelow.refresh();
                        else cardBelow.flipUp();
                        
                        // Робимо її активною (щоб можна було потім на неї клікнути)
                        cardBelow.setInteractive();
                        cardBelow.clearTint();
                        
                        // Якщо це табло — дозволяємо тягнути
                        if (stack.type === 'tableau') {
                             this.input.setDraggable(cardBelow);
                        }
                    }
                }
            }

            this.history.push({
                card: card,
                fromStack: card.sourceStack
            });
            
            if (this.history.length > 5) this.history.shift();
        });

        this.input.on('drag', (pointer, card) => {
            card.x = pointer.x;
            card.y = pointer.y;
        });

        this.input.on('dragend', (pointer, card) => {
            card.clearTint();
            let placed = false;
            const allStacks = [...this.tableau, ...this.foundation];
            
            for (let stack of allStacks) {
                if (stack === card.sourceStack) continue;

                const isOver = stack.containsPoint(card.x, card.y);
                if (isOver) {
                    const canDrop = stack.canPlace(card);
                    if (canDrop) {
                        // УСПІХ: Карта лягає в новий стек
                        const oldStack = card.sourceStack;
                        if (oldStack) {
                            oldStack.pop(); 
                            oldStack.updatePositions(); 
                        }

                        this.draggedCard = null;
                        stack.push(card);
                        placed = true;
                        
                        // 👇 ВАЖЛИВО: Повертаємо нормальний розмір карті
                        // (бо вона все ще збільшена після dragstart)
                        this.tweens.add({
                            targets: card,
                            scale: 1.3, // Стандартний розмір (Card.SCALE)
                            duration: 200,
                            ease: 'Cubic.out'
                        });

                        this.checkWin();
                        break; 
                    }
                }
            }
            
            if (!placed) {
                // НЕВДАЧА: Повертаємо карту назад
                
                // Якщо ми просто клікнули (історія записалась), але хід не зробили — чистимо історію
                this.history.pop();

                this.tweens.add({
                    targets: card,
                    x: card.homeX,       // Позиція в стеку
                    y: card.homeY,
                    rotation: card.startRotation, // 🔄 Повертаємо старий кут нахилу!
                    scale: 1.3,          // 🔽 Повертаємо стандартний розмір (опускаємо карту)
                    duration: 300,       // Трохи повільніше для краси
                    ease: 'Back.out',    // Ефект "пружинки" при приземленні
                    onComplete: () => {
                        this.sortDisplayOrder();
                        if (this.draggedCard === card) this.draggedCard = null;
                    }
                });
            } else {
                this.sortDisplayOrder();
                this.updateUndoButtonState();
                this.draggedCard = null;
            }
        });

        this.input.enableDebug(this.tableauLayer); 
        // або просто натисни клавішу, щоб увімкнути дебаг для всіх об'єктів
        this.input.keyboard.on('keydown-D', () => {
            this.tableau.forEach(stack => {
                stack.cards.forEach(card => {
                    if(card.input) this.input.enableDebug(card);
                });
            });
        });

        // Тимчасовий код для тестування спрайта
        //const testSprite = this.add.sprite(this.scale.width / 2, this.scale.height / 2, 'common1', 'card_bg');
        //testSprite.setDepth(2000).setScale(2); // Робимо великим і зверху
        function calculateCurvedPosition(index, totalCount, baseY) {
            const centerIndex = (totalCount - 1) / 2;
            const diff = index - centerIndex;
            
            // ✅ Параболічна крива (x² дає плавність)
            const normalizedDiff = diff / centerIndex; // -1..0..+1
            const curveOffset = Math.pow(normalizedDiff, 2) * curveStrength * cardWidth;
            
            // ✅ Поворот (лінійний, але з плавною прогресією)
            const rotation = normalizedDiff * rotationStrength;
            
            // ✅ Y-зміщення (парабола)
            const y = baseY + curveOffset;
            
            return { diff, normalizedDiff, curveOffset, rotation, y };
        }
    
    }

    // Універсальний метод для створення синіх кнопок
    createMenuButton(x, y, iconTexture, iconFrame, text, callback) {
        // Налаштування розмірів
        const bgWidth = 116;
        const bgHeight = 82;
        const iconScale = 1; // Масштаб іконки

        // 1. Фон кнопки
        const bg = this.add.sprite(x, y, 'common1', 'but_gp1_1')
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(bgWidth, bgHeight);

        // 2. Іконка (центруємо відносно кнопки, трохи вище тексту)
        const icon = this.add.sprite(x, y - 5, iconTexture, iconFrame);
        
        // Якщо іконка занадто велика, скейлимо її (можна підлаштувати)
        if (icon.width > 60 || icon.height > 60) {
            icon.setScale(iconScale);
        }

        // 3. Текст (знизу)
        const label = this.add.text(x, y + 50, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // 4. Логіка наведення (Hover)
        bg.on('pointerover', () => {
            if (!this.isAnimatingBonus) {
                bg.setTexture('common1', 'but_gp1_2'); // Світла
                bg.setDisplaySize(bgWidth, bgHeight);
            }
        });

        bg.on('pointerout', () => {
            if (!this.isAnimatingBonus) {
                bg.setTexture('common1', 'but_gp1_1'); // Темна
                bg.setDisplaySize(bgWidth, bgHeight);
            }
        });

        bg.on('pointerdown', () => {
            if (!this.isAnimatingBonus) {
                bg.setTexture('common1', 'but_gp1_3'); // Натиснута
                bg.setDisplaySize(bgWidth, bgHeight);
                if (callback) callback();
            }
        });

        bg.on('pointerup', () => {
            if (!this.isAnimatingBonus) {
                bg.setTexture('common1', 'but_gp1_2'); // Повертаємо світлу (бо курсор ще там)
                bg.setDisplaySize(bgWidth, bgHeight);
            }
        });

        return { bg, icon, label };
    }

    sortDisplayOrder() {
        this.tableauLayer.removeAll(false);
        
        // ВАЖЛИВО: У дужках має бути (stack, stackIndex)
        // Якщо написати просто (stack), то змінна stackIndex не створиться!
        this.tableau.forEach((stack, stackIndex) => {
            
            stack.cards.forEach((card, cardIndex) => {
                this.tableauLayer.add(card);
                
                // Тепер stackIndex існує і ми можемо його використовувати
                // (100 - stackIndex) робить так, що 0-й стек має глибину 10000, 
                // а 1-й стек — 9900. Тобто 0-й перекриває 1-й.
                const depth = (100 - stackIndex) * 100 + cardIndex;
                card.setDepth(depth);
            });
            
            stack.updatePositions();
        });

        if (this.draggedCard) {
            this.draggedCard.setDepth(20000); 
        }
    }

    checkWin() {
        if (this.foundation.every(s => s.cards.length === 13)) {
            this.add.text(gameCenterX, 350, 'VICTORY!', { fontSize: '64px', color: '#ffd700' }).setOrigin(0.5);
        }
    }

    undoMove() {
        if (this.history.length === 0) return;

        const lastMove = this.history.pop();
        const { card, fromStack } = lastMove;

        const currentStack = card.sourceStack;

        if (currentStack) {
            currentStack.pop();
            // Оновлюємо стек, з якого забрали карту при відміні
            // (Хоча зазвичай там карта вже відкрита, але це корисно для порядку)
            currentStack.updatePositions();
        }        
        fromStack.push(card);

        this.sortDisplayOrder();
        this.updateUndoButtonState();
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

        for (let i = 0; i < allTableauCards.length; i++) {
            const stackIndex = i % this.tableau.length; // Рівномірно по стопках
            this.tableau[stackIndex].push(allTableauCards[i]);
        }

        this.shufflesLeft--;
        this.shuffleText.setText(`Shuffles: ${this.shufflesLeft}`);
        this.sortDisplayOrder();
        
        this.history = [];
        this.updateUndoButtonState();
    }

    performInternalShuffle() {
        if (this.shufflesLeft <= 0) {
             this.isShuffling = false;
             this.isAnimatingBonus = false;
             return;
        }

        let allTableauCards = [];
        
        // Забираємо карти
        this.tableau.forEach(stack => {
            while (stack.cards.length > 0) {
                allTableauCards.push(stack.pop());
            }
        });

        // Мішаємо
        Phaser.Utils.Array.Shuffle(allTableauCards);

        // Роздаємо назад
        for (let i = 0; i < allTableauCards.length; i++) {
            const stackIndex = i % this.tableau.length; 
            const card = allTableauCards[i];
            
            //  ВАЖЛИВО: Всі карти стають закритими
            card.faceUp = false;
            //card.flipDown(); // Візуально ставимо сорочку
            
            this.tableau[stackIndex].push(card);
            card.sourceStack = this.tableau[stackIndex];
        }

        // Оновлюємо позиції (візуально карти перелетять/стануть на місця, але залишаться закритими)
        this.tableau.forEach(stack => stack.updatePositions());
        this.sortDisplayOrder();

        this.shufflesLeft--;
        // Тепер переходимо до відкриття нових верхніх карт
        this.revealNewTopCards();
    }

    revealNewTopCards() {
        // Знаходимо нові верхні карти після перемішування
        const newTopCards = [];
        this.tableau.forEach(stack => {
            const card = stack.top();
            if (card) newTopCards.push(card);
        });

        //  РОЗБЛОКУЄМО стеки
        // Тепер, коли ми будемо кликати refresh/flipUp, карта "запам'ятає" це
        this.isShuffling = false; 

        // АНІМАЦІЯ 2: Back -> Face (без пауз)
        this.tweens.add({
            targets: newTopCards,
            scaleX: 0,
            duration: 150,
            delay: this.tweens.stagger(40), // Хвиля
            
            // ✅ ЗНОВУ ЙО-ЙО
            yoyo: true, 

            // Спрацьовує в момент сплющення
            onYoyo: (tween, target) => {
                target.faceUp = true; // Логічно відкриваємо
                target.refresh();     // Ставимо текстуру лиця
                
                target.clearTint();
                target.setInteractive();
            },

            onComplete: () => {
                this.isAnimatingBonus = false;
                this.setBonusButtonsState(true);
                this.checkWin();
                
                // Фінальна перевірка
                this.tableau.forEach(s => s.enforceTopCardVisibility());
            }
        });
    }

    animateShuffleSequence() {
        if (this.isAnimatingBonus) return; 

        this.setBonusButtonsState(false);
        this.isAnimatingBonus = true;
        this.isShuffling = true; // БЛОКУЄМО авто-відкриття в стеках

        // Знаходимо всі верхні карти, які зараз відкриті
        const topCards = [];
        this.tableau.forEach(stack => {
            const card = stack.top();
            if (card) topCards.push(card);
        });

        if (topCards.length === 0) {
            this.isAnimatingBonus = false;
            this.isShuffling = false;
            return;
        }

        // АНІМАЦІЯ 1: Face -> Back (без пауз)
        this.tweens.add({
            targets: topCards,
            scaleX: 0,         // Стискаємо до 0
            duration: 150,     // Швидкість стискання
            delay: this.tweens.stagger(40), // Хвиля
            
            // МАГІЯ ТУТ:
            yoyo: true,        // Автоматично розширює назад до 1.3
            
            // Ця функція спрацює в момент, коли scaleX = 0 (карта невидима)
            onYoyo: (tween, target) => {
                target.flipDown(); // Міняємо на card_shirt
            },

            // Коли ВСІ карти закінчили анімацію "туди-сюди"
            onComplete: () => {
                // Тепер, коли всі лежать сорочкою догори, мішаємо дані
                this.performInternalShuffle(); 
            }
        });
    }

    // Допоміжний метод: Переворот назад на обличчя
    flipCardsToFront(cards) {
        this.tweens.add({
            targets: cards,
            scaleX: 0,
            duration: 150,
            delay: this.tweens.stagger(30),
            onComplete: (tween, targets) => {
                targets.forEach(card => {
                    // ✅ МАГІЯ ТУТ:
                    // refresh() сам викличе getMappingData, сам знайде правильну назву (card_1r, card_10_b)
                    // і сам оновить спрайт. Нам не треба нічого вигадувати.
                    card.refresh(); 
                });
            }
        });

        this.time.delayedCall(150 + (cards.length * 30), () => {
            this.tweens.add({
                targets: cards,
                scaleX: 1, // Повертаємо нормальний розмір
                duration: 150,
                delay: this.tweens.stagger(30),
                onComplete: () => {
                    this.isAnimatingBonus = false;
                    this.checkWin();
                }
            });
        });
    }

    createGameUI() {
        // Контейнер для панелі
        this.sidePanel = this.add.container(0, this.scale.height / 2);
        this.sidePanel.setDepth(10);

        // Фон панелі
        const panelBg = this.add.sprite(0, 0, 'common1', 'gameplay_panel_bg');
        panelBg.setOrigin(0, 0.5);
        const scaleY = this.scale.height / panelBg.height;
        panelBg.setScale(1, scaleY);
        this.sidePanel.add(panelBg);

        // Налаштування сітки 2x2
        const colLeft = 75;
        const colRight = 200;
        const row1Y = -288;
        const row2Y = -198;
        const bottomY = (this.scale.height / 2) - 85;

        // Settings (ліворуч, верхній ряд)
        const settingsBtn = this.createMenuButton(colLeft, row1Y, 'common1', 'options_mini', '', () => {
            this.openSettings();
        });
        this.sidePanel.add([settingsBtn.bg, settingsBtn.icon, settingsBtn.label]);
        // Undo (праворуч, верхній ряд)
        const undoBtn = this.createMenuButton(colRight, row1Y, 'common1', 'undo_icon', '', () => {
            this.undoMove();
        });
        // 👇 ПІДГАНЯЄМО ТІЛЬКИ undo_icon
        undoBtn.icon
            .setOrigin(0.5)
            .setScale(0.9, 1)   // приплюснута по вертикалі
            .setY(undoBtn.icon.y + 2); // візуально по центру
        this.undoBg = undoBtn.bg; 
        this.undoIcon = undoBtn.icon;
        this.undoIconBaseY = undoBtn.icon.y + 2;
        //this.undoIcon.setY(this.undoIcon.y + 4);
        this.sidePanel.add([undoBtn.bg, undoBtn.icon]);
        this.updateUndoButtonState();

        // Diamonds (ліворуч, нижній ряд)
        const diamondBtn = this.createMenuButton(colLeft, row2Y, 'common1', 'diamond_ico_big', `${this.diamonds}`, () => {
            console.log("Diamonds clicked");
        });
        this.diamondText = diamondBtn.label;
        this.diamondText.setFontSize('24px');
        this.diamondText.setY(this.diamondText.y - 29); // Підняти текст вгору на 15 пікселів
        this.sidePanel.add([diamondBtn.bg, diamondBtn.icon, diamondBtn.label]);

        // Shuffle (праворуч, нижній ряд)
        const shuffleBtn = this.createMenuButton(colRight, row2Y, 'common1', 'magnet_icon', ``, () => {
            this.animateShuffleSequence();
        });
        this.shuffleBg = shuffleBtn.bg;
        this.sidePanel.add([shuffleBtn.bg, shuffleBtn.icon]);

        // Magic бонус (ліворуч, низ)
        const btnLeftX = 80;
        const btnRightX = 190;
        
        this.magicBg = this.add.sprite(btnLeftX, bottomY, 'common1', 'b_magic_out')
            .setInteractive({ useHandCursor: true })
            .setScale(1);
        
        /*const magicText = this.add.text(btnLeftX + 3, bottomY + 60, '25 💎', { 
            fontSize: '18px', 
            fontStyle: 'bold', 
            color: '#fff', 
            stroke: '#000', 
            strokeThickness: 2 
        }).setOrigin(0.5);*/

        this.magicBg.on('pointerdown', () => this.useAutoMoveBonus(1, 25, 'magic'));
        this.sidePanel.add(this.magicBg);

        // Joker бонус (праворуч, низ)
        this.jokerBg = this.add.sprite(btnRightX, bottomY, 'common1', 'b_joker_out')
            .setInteractive({ useHandCursor: true })
            .setScale(1);
        
        /*const jokerText = this.add.text(btnRightX + 3, bottomY + 60, '100 💎', { 
            fontSize: '18px', 
            fontStyle: 'bold', 
            color: '#fff', 
            stroke: '#000', 
            strokeThickness: 2 
        }).setOrigin(0.5);*/

        this.jokerBg.on('pointerdown', () => this.useAutoMoveBonus(8, 100, 'joker'));
        this.sidePanel.add(this.jokerBg);

        // Анімація появи панелі
        const panelWidth = panelBg.width;
        this.sidePanel.x = -panelWidth;
        this.tweens.add({
            targets: this.sidePanel,
            x: 0,
            duration: 500,
            ease: 'Power2'
        });

        this.createSettingsModal();
        this.createLanguageModal();
    }
    updateUndoButtonState() {
        // Перевіряємо, чи існує кнопка (щоб не було помилок на старті)
        if (!this.undoBg) return;
        // 📏 НАЛАШТУВАННЯ РОЗМІРІВ (Маніпулюй цими цифрами)
        const bgWidth = 116;
        const bgHeight = 82;
            
        const iconW = 56;     // Точна ширина іконки
        const iconH = 71;     // Точна висота іконки
        if (this.history.length === 0) {
            //Немає ходів: Сіра кнопка + неклікабельна
            this.undoBg.setTexture('common1', 'but_undo_gray'); 
            this.undoBg.disableInteractive(); 
            this.undoIcon.setVisible(false);
        } else {
            //Є ходи: Синя кнопка + клікабельна
            // Важливо повернути but_gp1_1, бо це стан спокою
            this.undoBg.setTexture('common1', 'but_gp1_1'); 
            this.undoBg.setInteractive(); 
            this.undoIcon.setVisible(true);

            this.undoIcon.setDisplaySize(iconW, iconH);
            this.undoIcon.setY(this.undoIconBaseY + 1); // Завжди одна і та ж позиція
        }
        
        // Оскільки ми змінюємо текстуру, Phaser може скинути розмір.
        // Тому про всяк випадок жорстко задаємо розмір знову (як у createMenuButton)
        this.undoBg.setDisplaySize(bgWidth, bgHeight);
    }
    // Головна функція виклику бонусу
    useAutoMoveBonus(movesCount, cost, type) {
        if (this.isAnimatingBonus) return;

            if (this.diamonds >= cost) {
                const firstMove = this.findBestMove();
                if (!firstMove) return;

                this.diamonds -= cost;
                this.diamondText.setText(`${this.diamonds}`);

                const popX = (type === 'magic') ? 80 : 190; 
                const popY = (this.scale.height / 2) - 100;

                this.showPricePop(popX, popY, cost);

                this.isAnimatingBonus = true;
                this.activeBonusType = type;

                // ✅ Вимикаємо всі кнопки одним рядком
                this.setBonusButtonsState(false);

                this.performAutoMovesSequence(movesCount);
        } else {
            // Ефект "немає грошей" (наприклад, червоний текст)
            this.tweens.add({
                targets: this.diamondText,
                scale: 1.5,
                duration: 100,
                yoyo: true,
                onStart: () => this.diamondText.setColor('#ff0000'),
                onComplete: () => this.diamondText.setColor('#ffffff')
            });
        }
    }

    // --- Створення модального вікна налаштувань ---
    createSettingsModal() {
        // 1. Оверлей (Затемнення екрану)
        // Створюємо чорний прямокутник на весь екран
        this.settingsOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000)
            .setOrigin(0, 0)
            .setAlpha(0)     // Спочатку прозорий
            .setDepth(99)    // Дуже високо (над усіма картами і панеллю)
            .setVisible(false)
            .setInteractive(); // Блокує кліки крізь себе

        // Клік по затемненню закриває меню
        this.settingsOverlay.on('pointerdown', () => {
            if (this.isLanguageOpen) {
                // Якщо відкрите меню мов — закриваємо його (воно саме викличе closeSettings в кінці)
                this.closeLanguageMenu();
            } else {
                // Якщо відкриті тільки налаштування — закриваємо їх
                this.closeSettings();
            }
        });
        // 2. Контейнер для кнопок (виїжджає знизу)
        this.settingsContainer = this.add.container(this.scale.width / 2, this.scale.height + 150);
        this.settingsContainer.setDepth(100); // Ще вище, ніж затемнення

        // --- КНОПКИ ---
        // Відстань між кнопками
        const spacing = 145;
        const startX = -(spacing * 1.5); // Центруємо 4 кнопки: -1.5, -0.5, 0.5, 1.5

        // Кнопка 1: Звук (Sound)
        // Поки немає іконки звуку, ставимо but_options3 як базу
        this.createOptionButton(startX, 0, 'common1', 'icon_sound', () => {
            console.log("Sound toggle");
        });

        // Кнопка 2: Музика (Music)
        this.createOptionButton(startX + spacing, 0, 'common1', 'icon_music', () => {
            console.log("Music toggle");
        });

        // Кнопка 3: МОВА
        // Змінюємо логіку створення, щоб зберегти іконку
        const langBtn = this.createOptionButton(startX + spacing * 2, 0, 'common1', `icon_${this.currentLanguage}`, () => {
            this.openLanguageMenu(); // ✅ Новий метод
        });
        this.langSettingsIcon = langBtn.icon;
        // Кнопка 4: ВИХІД (Exit)
        // ✅ Використовуємо game_exit_icon_small з common2
        this.createOptionButton(startX + spacing * 3, 0, 'common2', 'game_exit_icon_small', () => {
                    console.log("Exit Game");
        });
    }

    // Допоміжний метод для створення круглої кнопки опцій
    createOptionButton(x, y, iconAtlas, iconFrame, callback) {
        // 📏 НАЛАШТУВАННЯ РОЗМІРУ ФОНУ
        // 1.0 = оригінал (106px). 1.2 = +20% (127px). 1.3 = +30% тощо.
        const bgScale = 1.3; 

        // 1. Фон кнопки
        const bg = this.add.sprite(x, y, 'common1', 'but_options3')
            .setInteractive({ useHandCursor: true })
            .setScale(bgScale); // ✅ Застосовуємо розмір відразу

        // 2. Іконка (поверх фону)
        const icon = this.add.sprite(x, y, iconAtlas, iconFrame);
        
        // Якщо іконка дуже велика, зменшуємо її (тут scale не залежить від фону)
        if (icon.width > 70 || icon.height > 70) {
            icon.setScale(0.85);
        }
        
        // Запам'ятовуємо початковий розмір іконки, щоб анімація працювала правильно
        const iconBaseScale = icon.scaleX;

        // 3. ЛОГІКА ЗМІНИ СТАНІВ
        // Ми розділили анімацію фону та іконки, щоб вони зумились пропорційно своїм розмірам

        bg.on('pointerover', () => {
            bg.setTexture('common1', 'but_options1'); // Світла
            
            // Збільшуємо фон на 5% від ЙОГО розміру (bgScale)
            this.tweens.add({ targets: bg, scaleX: bgScale * 1.05, scaleY: bgScale * 1.05, duration: 100 });
            
            // Збільшуємо іконку на 5% від ЇЇ розміру
            this.tweens.add({ targets: icon, scaleX: iconBaseScale * 1.05, scaleY: iconBaseScale * 1.05, duration: 100 });
        });

        bg.on('pointerout', () => {
            bg.setTexture('common1', 'but_options3'); // Темна
            
            // Повертаємо до початкового розміру bgScale
            this.tweens.add({ targets: bg, scaleX: bgScale, scaleY: bgScale, duration: 100 });
            
            // Повертаємо іконку до норми
            this.tweens.add({ targets: icon, scaleX: iconBaseScale, scaleY: iconBaseScale, duration: 100 });
        });

        bg.on('pointerdown', () => {
            bg.setTexture('common1', 'but_options2'); // Втиснута
            icon.y += 2;
            if (callback) callback();
        });
        
        bg.on('pointerup', () => {
            bg.setTexture('common1', 'but_options1');
            icon.y -= 2;
        });

        this.settingsContainer.add([bg, icon]);

        return { bg, icon };
    }

    createLanguageModal() {
        // Створюємо контейнер для мов (поки ховаємо його внизу за межами екрану)
        this.languageContainer = this.add.container(this.scale.width / 2, this.scale.height + 300);
        this.languageContainer.setDepth(101); // Шар вище за налаштування!
    }

    // Відкриття меню
    openSettings() {
        if (this.isSettingsOpen) return;
        this.isSettingsOpen = true;

        // 1. Показуємо затемнення
        this.settingsOverlay.setVisible(true);
        this.tweens.add({
            targets: this.settingsOverlay,
            alpha: 0.7, // Напівпрозорість
            duration: 300
        });

        // 2. Виїжджають кнопки (знизу вгору)
        // Кінцева точка Y: низ екрану мінус 120 пікселів
        const targetY = this.scale.height / 2;
        
        this.tweens.add({
            targets: this.settingsContainer,
            y: targetY,
            duration: 500,
            ease: 'Back.easeOut' // Ефект пружини
        });
    }

    // Закриття меню
    closeSettings() {
        if (!this.isSettingsOpen) return;
        this.isSettingsOpen = false;

        // 1. Ховаємо затемнення
        this.tweens.add({
            targets: this.settingsOverlay,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.settingsOverlay.setVisible(false);
            }
        });

        // 2. Ховаємо кнопки (вниз)
        this.tweens.add({
            targets: this.settingsContainer,
            y: this.scale.height + 150, // Ховаємо за межі екрану
            duration: 300,
            ease: 'Cubic.easeIn'
        });
    }

    createLanguageModalContent() {
        // 1. Очищаємо старі кнопки перед створенням нових (щоб оновити кольори)
        this.languageContainer.removeAll(true);

        const languages = [
            { code: 'en', icon: 'icon_en' },
            { code: 'de', icon: 'icon_de' },
            { code: 'es', icon: 'icon_es' },
            { code: 'fr', icon: 'icon_fr' },
            { code: 'it', icon: 'icon_it' },
            { code: 'pt', icon: 'icon_pt' },
            { code: 'ru', icon: 'icon_ru' }
        ];

        // 📏 НАЛАШТУВАННЯ СІТКИ
        const spacing = 140; // Відстань між кнопками
        const row1Y = -80;   // Висота першого ряду
        const row2Y = 80;    // Висота другого ряду

        languages.forEach((lang, index) => {
            let x, y;
            if (index < 4) {
                // Перший ряд (4 кнопки) центровані: -1.5, -0.5, 0.5, 1.5
                x = (index - 1.5) * spacing;
                y = row1Y;
            } else {
                // Другий ряд (3 кнопки) центровані: -1, 0, 1
                x = (index - 4 - 1) * spacing;
                y = row2Y;
            }

            // Перевіряємо, чи вибрана ця мова зараз
            const isSelected = (this.currentLanguage === lang.code);

            this.createLanguageButton(x, y, lang, isSelected);
        });
    }

    createLanguageButton(x, y, langObj, isSelected) {
        const bgScale = 1.3;
        
        // 1. Визначаємо текстуру фону
        // Якщо мова вибрана — шукаємо фіолетову but_options4, якщо ні — звичайну but_options3
        let textureName = isSelected ? 'but_options4' : 'but_options3';
        
        // Перевіряємо, чи є but_options4 в атласі (захист від помилок)
        if (isSelected && !this.textures.get('common1').has('but_options4')) {
            textureName = 'but_options3'; // fallback на звичайну
        }

        const bg = this.add.sprite(x, y, 'common1', textureName)
            .setInteractive({ useHandCursor: true })
            .setScale(bgScale);

        // Якщо текстури but_options4 немає, фарбуємо звичайну в фіолетовий
        if (isSelected && textureName === 'but_options3') {
            bg.setTint(0xba55d3); // Гарний фіолетовий (Medium Orchid)
        }

        // 2. Іконка мови
        const icon = this.add.sprite(x, y, 'common1', langObj.icon);
        if (icon.width > 70) icon.setScale(0.8);

        const iconBaseScale = icon.scaleX;

        // 3. Поведінка
        bg.on('pointerover', () => {
            // Якщо кнопка не фіолетова, ставимо світлий фон при наведенні
            if (!isSelected) bg.setTexture('common1', 'but_options1');
            // Анімуємо ФОН (використовуємо bgScale)
            this.tweens.add({ targets: bg, scale: bgScale * 1.05, duration: 100 });
            
            // Анімуємо ІКОНКУ (використовуємо iconBaseScale)
            // Збільшуємо зовсім трішки (на 10%), щоб було красиво
            this.tweens.add({ targets: icon, scale: iconBaseScale * 1.1, duration: 100 });        
        });

        bg.on('pointerout', () => {
            if (!isSelected) bg.setTexture('common1', 'but_options3');
            // Повертаємо ФОН до bgScale
            this.tweens.add({ targets: bg, scale: bgScale, duration: 100 });
            
            // Повертаємо ІКОНКУ до її рідного iconBaseScale
            this.tweens.add({ targets: icon, scale: iconBaseScale, duration: 100 });
        });

        bg.on('pointerdown', () => {
            // Міняємо мову та закриваємо меню
            this.setLanguage(langObj.code);
        });

        this.languageContainer.add([bg, icon]);
    }

    setLanguage(langCode) {
        if (this.currentLanguage === langCode) {
            this.closeLanguageMenu(); // Просто закриваємо, якщо та сама
            return;
        }

        this.currentLanguage = langCode;
        console.log(`Language changed to: ${langCode}`);

        // 1. Оновлюємо іконку в меню налаштувань (знаходимо її)
        // Нам треба зберегти посилання на іконку мови в createSettingsModal!
        if (this.langSettingsIcon) {
            this.langSettingsIcon.setTexture('common1', `icon_${langCode}`);
        }

        // 2. Закриваємо меню мов і повертаємось до налаштувань (або закриваємо все)
        this.closeLanguageMenu();
        // this.openSettings(); // Розкоментуй, якщо хочеш повернутися в Settings
    }

    openLanguageMenu() {
        // 1. Закриваємо налаштування (але оверлей залишаємо!)
        // Ми не викликаємо closeSettings(), бо він прибере оверлей.
        // Просто ховаємо контейнер налаштувань.
        
        this.tweens.add({
            targets: this.settingsContainer,
            y: this.scale.height + 150,
            duration: 300,
            ease: 'Cubic.easeIn'
        });

        // 2. Відкриваємо мови
        // Спочатку треба перебудувати кнопки мов, щоб оновити фіолетовий колір
        this.languageContainer.removeAll(true);
        this.createLanguageModalContent(); // (Логіку створення кнопок винеси сюди)

        this.tweens.add({
            targets: this.languageContainer,
            y: this.scale.height / 2, // Центр екрану
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        this.isLanguageOpen = true;
    }

    closeLanguageMenu() {
        this.isLanguageOpen = false;
        
        // Ховаємо мови
        this.tweens.add({
            targets: this.languageContainer,
            y: this.scale.height + 300,
            duration: 300,
            onComplete: () => {
                // Повертаємо оверлей в 0 (закриваємо все)
                this.closeSettings(); 
            }
        });
    }

    showPricePop(x, y, amount) {
        // 1. Налаштування позиції (зсув праворуч на 30 пікселів)
        const shiftX = 60;
        const popContainer = this.add.container(x + shiftX, y - 60);
        this.sidePanel.add(popContainer);

        // 2. Фон ціни (tip_bg)
        const bg = this.add.sprite(0, 0, 'common1', 'tip_bg')
            .setDisplaySize(110, 50)
            .setAlpha(1);

        // ВІДЗЕРКАЛЕННЯ:
        // Якщо ніжка бабла зверху, а має бути знизу — використовуємо setFlipY(true).
        // Якщо вона має дивитися в інший бік по горизонталі — додаємо setFlipX(true).
        bg.setFlipY(true); 
        const verticalCenterOffset = -4;

        // 3. Текст ціни (залишається рівним, бо ми не фліпали контейнер)
        const priceText = this.add.text(-10, verticalCenterOffset, `-${amount}`, {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444', 
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // 4. Іконка діаманта
        const dia = this.add.sprite(priceText.width / 2 + 10, 0, 'common1', 'diamond_ico_big')
            .setDisplaySize(25, 25);

        popContainer.add([bg, priceText, dia]);

        // 5. ПОВІЛЬНА АНІМАЦІЯ
        this.tweens.add({
            targets: popContainer,
            y: y - 80,    // Піднімаємо трохи вище для краси
            alpha: 0,      // Плавно зникає
            duration: 5000, // ✅ Було 800, стало 2000 (2 секунди) — тепер дуже плавно
            ease: 'Cubic.easeOut',
            onComplete: () => {
                popContainer.destroy(); 
            }
        });
    }

    // Рекурсивна функція для виконання N ходів з затримкою
    performAutoMovesSequence(movesLeft) {
        if (movesLeft <= 0) {
            this.isAnimatingBonus = false;
            this.setBonusButtonsState(true);
            this.activeBonusType = null;
            return;
        }

        const move = this.findBestMove();

        if (move) {
            const { card, targetStack } = move;
            const oldStack = card.sourceStack;

            // 1. ✅ ВИПРАВЛЕННЯ: Видаляємо карту ТІЛЬКИ ОДИН РАЗ
            if (oldStack) {
                oldStack.pop(); 
                // Оновлюємо старий стек, щоб відкрити/вирівняти карти, що лишились
                oldStack.updatePositions(); 
            }

            // Виносимо карту на сцену для анімації
            if (card.parentContainer) {
                card.parentContainer.remove(card);
            }
            this.add.existing(card);
            card.setDepth(99999); // Щоб летіла поверх усього

            // Розрахунок позиції (використовуємо координати цільового стека)
            // Якщо це Tableau, беремо координати "віртуального" наступного місця
            let finalX = targetStack.x;
            let finalY = targetStack.y;

            if (targetStack.type === 'tableau' && targetStack.cards.length > 0) {
                // Трохи "брудна" емуляція, але точна позиція встановиться сама через updatePositions
                // Тут нам головне, щоб карта полетіла в район низу стопки
                const lastCard = targetStack.top();
                finalX = lastCard.x; 
                finalY = lastCard.y + 30; // Приблизний відступ
            }

            this.tweens.add({
                targets: card,
                x: finalX,
                y: finalY,
                scale: 1.3,      // ✅ Скидаємо розмір (якщо він був 1.5 після кліку)
                rotation: targetStack.rotation, // ✅ Повертаємо під кутом нового стека
                duration: 250,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // 2. Додаємо в новий стек
                    targetStack.push(card);
                    
                    // 3. ✅ ОБОВ'ЯЗКОВО: Оновлюємо візуальний стан
                    // Це "примагнітить" карту точно на її місце по кривій
                    targetStack.updatePositions();
                    
                    // 4. Сортуємо шари, щоб карта пішла в контейнер під/над іншими
                    this.sortDisplayOrder();
                    
                    this.checkWin();

                    // Наступний хід
                    this.time.delayedCall(100, () => {
                        this.performAutoMovesSequence(movesLeft - 1);
                    });
                }
            });
        } else {
            this.isAnimatingBonus = false;
            this.setBonusButtonsState(true);
            this.activeBonusType = null;
        }
    }

    // Керує станом усіх бонусних кнопок одночасно
    setBonusButtonsState(enabled) {
        const suffix = enabled ? 'out' : 'gray_out';
        
        // Блокування Magic та Joker
        if (this.magicBg) {
            this.magicBg.setTexture('common1', `b_magic_${suffix}`);
            enabled ? this.magicBg.setInteractive() : this.magicBg.disableInteractive();
        }
        if (this.jokerBg) {
            this.jokerBg.setTexture('common1', `b_joker_${suffix}`);
            enabled ? this.jokerBg.setInteractive() : this.jokerBg.disableInteractive();
        }

        // ✅ Блокування прямокутного Shuffle
        if (this.shuffleBg) {
            if (enabled) {
                this.shuffleBg.clearTint();
                this.shuffleBg.setTexture('common1', 'but_gp1_1'); 
                this.shuffleBg.setInteractive();
            } else {
                this.shuffleBg.setTint(0x808080); // Сірий фільтр
                this.shuffleBg.disableInteractive();
            }
        }
    }
    // "Мозок": Шукає найкращий хід
    findBestMove() {
        // 1. Спочатку шукаємо ходи у ФУНДАЦІЮ (це завжди вигідно)
        // Скануємо верхівки всіх стопок Tableau
        for (let tStack of this.tableau) {
            if (tStack.cards.length > 0) {
                const card = tStack.top();
                // Перевіряємо всі 8 фундацій
                for (let fStack of this.foundation) {
                    if (fStack.canPlace(card)) {
                        return { card: card, targetStack: fStack };
                    }
                }
            }
        }

        // 2. Якщо у фундацію ходів немає, шукаємо ходи між ТАБЛО
        // Але не перекладаємо Короля на пусте місце просто так (це безглуздо для автоходу)
        for (let sourceStack of this.tableau) {
            if (sourceStack.cards.length === 0) continue;
            
            const card = sourceStack.top();
            
            // Якщо карта вже лежить на правильному місці (наприклад, відкрила нижню карту),
            // ми не хочемо її ганяти туди-сюди. Але для простоти реалізуємо пошук:
            
            for (let targetStack of this.tableau) {
                if (sourceStack === targetStack) continue;

                if (targetStack.canPlace(card)) {
                    return { card: card, targetStack: targetStack };
                }
            }
        }

        return null; // Ходів не знайдено
    }
}