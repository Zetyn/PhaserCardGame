import Deck from '../deck.js';
import Stack from '../stack.js';
import TutorialManager from '../TutorialManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.draggedCard = null;
        this.shufflesLeft = 100;
        this.history = [];
        this.isShuffling = false;
    }

    init(data) {
        this.currentLevel = data.level || 1;
        this.currentRound = data.round || 1;
        this.isWinTriggered = false;
        if (data.matchData) {
            this.matchData = data.matchData;
            this.isTournament = true; // Прапорець, що ми в режимі турніру
        } else {
            this.matchData = {
                player: { name: 'YOU', avatar: 'user0', frame: 'ava_competitor_player' },
                opponents: [] // Тут пусто, заповнимо в createGameUI тільки якщо !isTournament
            };
            this.isTournament = false;
        }

        console.log("Матч почався проти:", this.matchData.opponents);
        this.isSettingsOpen = false; //  Ось тут ідеальне місце
        this.shufflesLeft = 100;
        this.history = [];
        this.draggedCard = null;
        this.isShuffling = false;
        
        console.log(`Starting Level: ${this.currentLevel}`);
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

        this.isSettingsOpen = false;
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

        const row1Count = 10; // Кількість у першому ряду
        const row1Y = 200; 
        const row2Y = 450; // Другий ряд нижче

        // Налаштування ширини та перекриття
        const cardWidth = 115; // Приблизна ширина карти/спрайта
        const overlap = 12; 

        const spacingX = cardWidth - overlap; // Відстань між центрами стеків

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

        this.createGameUI();

       if (this.currentLevel === 1) {
             const curtain = this.add.rectangle(
                this.scale.width / 2, this.scale.height / 2,
                this.scale.width, this.scale.height,
                0x000000
            ).setDepth(30000);

            this.setTutorialVisuals(true);

            this.time.delayedCall(250, () => {

            // Створюємо менеджера
            this.tutorialManager = new TutorialManager(this);

            if (this.currentRound === 1) {
                // --- РАУНД 1: КАРТИ ---
                this.setupTutorialBoardRigged(); // Розстановка для карт
                this.tutorialManager.setScenario('cards'); // Вказуємо сценарій

                this.tutorialManager.onComplete = () => {
                    // Логіка після завершення туторіалу карт
                    this.tableau.forEach(stack => {
                        stack.updatePositions();
                        stack.enforceTopCardVisibility(); 
                    });
                    this.sortDisplayOrder();
                };

            } else if (this.currentRound === 2) {
                // --- РАУНД 2: БОНУСИ ---
                // Тут розстановка звичайна (рандомна), нічого рігати не треба
                this.tutorialManager.setScenario('powerups'); // Новий сценарій

                this.tutorialManager.onComplete = () => {
                    // Після завершення просто продовжуємо гру
                    console.log("Powerup tutorial finished");
                };
            }

            // Анімація зникнення шторки і старт
            this.tweens.add({
                targets: curtain,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    curtain.destroy();
                    this.tutorialManager.start();
                }
            });
        });
        }

        // Створюємо UI для діамантів та бонусів
        //this.createGameUI();

        // DRAG & DROP
        this.input.on('dragstart', (pointer, card) => {
            if (this.isShuffling) return;

            // Якщо зараз інша карта летить додому - зупиняємо її МИТТЄВО
            if (this.returningCard && this.returningCard !== card) {
                this.tweens.killTweensOf(this.returningCard);
                this.returningCard.isReturning = false;
                
                // Миттєво телепортуємо її додому БЕЗ анімації
                this.returningCard.x = this.returningCard.homeX;
                this.returningCard.y = this.returningCard.homeY;
                this.returningCard.rotation = this.returningCard.startRotation || 0;
                this.returningCard.setScale(1.3);
                
                // Повертаємо в правильний шар
                if (this.returningCard.sourceStack) {
                    if (this.returningCard.sourceStack.type === 'tableau' && this.tableauLayer) {
                        this.tableauLayer.add(this.returningCard);
                    } else if (this.returningCard.sourceStack.type === 'foundation' && this.foundationLayer) {
                        this.foundationLayer.add(this.returningCard);
                    }
                }
                
                this.returningCard = null;
            }

            // Якщо карта летіла додому, а ми її схопили — зупиняємо політ
            if (card.isReturning) {
                card.isReturning = false;
                this.returningCard = null;
            }

            // Туторіал
            if (this.tutorialManager && this.tutorialManager.isActive) {
                const step = this.tutorialManager.steps[this.tutorialManager.currentStepIndex];
                
                if (step.action === 'pick') {
                    if (card.value !== step.card?.value || card.suit !== step.card?.suit) {
                        console.log(" TUTORIAL BLOCK: Цю карту чіпати не можна!");
                        this.shakeCard(card);
                        return; 
                    }
                    this.tutorialManager.onDragStart(card);
                }
            }

            // Зупиняємо ВСІ твіни цієї карти
            this.tweens.killTweensOf(card);
            
            // Встановлюємо draggedCard ОДРАЗУ
            this.draggedCard = card;

            // Виймаємо з контейнера
            if (card.parentContainer) {
                card.parentContainer.remove(card);
            }
            this.add.existing(card);

            // Отримуємо світові координати
            const matrix = card.getWorldTransformMatrix();
            card.x = matrix.tx; 
            card.y = matrix.ty;

            card.setDepth(99999);
            card.startRotation = card.rotation;

            // Анімація підйому
            this.tweens.add({
                targets: card,
                scale: 1.5,
                rotation: 0,
                duration: 150,
                ease: 'Cubic.out'
            });

            // Відкриваємо карту під нею
            const stack = card.sourceStack;
            if (stack && stack.cards.length > 1) {
                const myIndex = stack.cards.indexOf(card);
                
                if (myIndex > 0) {
                    const cardBelow = stack.cards[myIndex - 1];
                    
                    if (!cardBelow.faceUp) {
                        cardBelow.faceUp = true;
                        
                        if (cardBelow.refresh) cardBelow.refresh();
                        else cardBelow.flipUp();
                        
                        cardBelow.setInteractive();
                        cardBelow.clearTint();
                        
                        if (stack.type === 'tableau') {
                            this.input.setDraggable(cardBelow);
                        }
                    }
                }
            }

            // Історія
            this.history.push({
                card: card,
                fromStack: card.sourceStack
            });
            
            if (this.history.length > 5) this.history.shift();
        });

        this.input.on('drag', (pointer, card) => {
            if (this.draggedCard !== card) return;

            card.x = pointer.x;
            card.y = pointer.y;
        });

        this.input.on('dragend', (pointer, card) => {
            if (!card || !card.scene) return;

            // Перевіряємо, чи це та карта, яку ми тягнемо
            if (this.draggedCard !== card) {
                console.warn(" DragEnd для не-draggedCard, ігноруємо");
                return;
            }

            //Миттєво звільняємо "руку"
            this.draggedCard = null;

            //Зупиняємо всі твіни цієї карти
            this.tweens.killTweensOf(card);

            card.clearTint();
            let placed = false;
            
            const allStacks = [...this.tableau, ...this.foundation];
            
            // Перевірка дропу
            for (let stack of allStacks) {
                if (stack === card.sourceStack) continue;

                const isOver = stack.containsPoint(card.x, card.y);
                
                if (isOver) {
                    let canDrop = stack.canPlace(card);

                    // Туторіал
                    if (canDrop && this.tutorialManager && this.tutorialManager.isActive) {
                        const allowedByTutorial = this.tutorialManager.validateDrop(card, stack);
                        if (!allowedByTutorial) canDrop = false;
                    }

                    // Не класти назад на ту саму купу
                    if (canDrop && stack.cards.length === 0 && stack.type === 'tableau') {
                        const sourceStack = card.sourceStack;
                        const cardIndex = sourceStack.cards.indexOf(card);
                        if (cardIndex === 0) canDrop = false; 
                        if (cardIndex > 0) {
                            const cardBelow = sourceStack.cards[cardIndex - 1];
                            if (cardBelow && cardBelow.faceUp) canDrop = false;
                        }
                    }

                    if (canDrop) {
                        // ═══════════════════════════════════════════
                        // УСПІШНИЙ ДРОП
                        // ═══════════════════════════════════════════
                        
                        const oldStack = card.sourceStack;
                        if (oldStack) {
                            oldStack.pop(); 
                            oldStack.updatePositions(); 
                        }

                        stack.push(card);
                        placed = true;
                        
                        // Зберігаємо цільові координати
                        const targetX = card.homeX; // stack.push() вже встановив homeX/homeY
                        const targetY = card.homeY;
                        const targetRotation = stack.rotation || 0;

                        // Виймаємо з контейнера для анімації
                        if (card.parentContainer) card.parentContainer.remove(card);
                        this.add.existing(card);
                        
                        // Повертаємо до позиції мишки для "вльоту"
                        card.x = pointer.x;
                        card.y = pointer.y;

                        if (stack.type === 'foundation') this.updateScore();
                        
                        if (this.tutorialManager && this.tutorialManager.isActive) {
                            this.tutorialManager.onCardPlaced(card, stack);
                        }

                        // Анімація вльоту
                        this.tweens.add({
                            targets: card,
                            x: targetX,
                            y: targetY,
                            rotation: targetRotation,
                            scale: 1.3,
                            duration: 150,
                            ease: 'Cubic.out',
                            onComplete: () => {
                                // Повертаємо в правильний шар
                                if (stack.type === 'tableau' && this.tableauLayer) {
                                    this.tableauLayer.add(card);
                                } else if (stack.type === 'foundation' && this.foundationLayer) {
                                    this.foundationLayer.add(card);
                                }
                                
                                // Страхуємо координати
                                card.x = targetX;
                                card.y = targetY;
                                
                                this.sortDisplayOrder(); 
                                this.checkWin();
                            }
                        });
                        
                        break; 
                    }
                }
            }
            
            // ═══════════════════════════════════════════
            // ПОВЕРНЕННЯ ДОДОМУ (якщо не поклали)
            // ═══════════════════════════════════════════
            
            if (!placed) {
                // Очищаємо історію
                if (this.history.length > 0) {
                    const lastAction = this.history[this.history.length - 1];
                    if (lastAction.card === card) this.history.pop();
                }

                if (this.tutorialManager && this.tutorialManager.isActive) {
                    this.tutorialManager.onMoveCancelled();
                }

                // Позначаємо цю карту як "що повертається"
                this.returningCard = card;
                card.isReturning = true;

                // Розраховуємо швидкість
                const dist = Phaser.Math.Distance.Between(card.x, card.y, card.homeX, card.homeY);
                const dynamicDuration = Math.min(250, Math.max(100, dist / 2));

                // НЕ disableInteractive()! Карту можна перехопити.

                this.tweens.add({
                    targets: card,
                    x: card.homeX,       
                    y: card.homeY,
                    rotation: card.startRotation || 0, 
                    scale: 1.3,          
                    duration: dynamicDuration,       
                    ease: 'Back.out',    
                    onComplete: () => {
                        // Перевіряємо, чи карта не була перехоплена
                        if (card.isReturning) {
                            card.isReturning = false;
                            this.returningCard = null;
                            
                            if (this.scene.isActive()) {
                                // Повертаємо в шар
                                if (card.sourceStack) {
                                    if (card.sourceStack.type === 'tableau' && this.tableauLayer) {
                                        this.tableauLayer.add(card);
                                    } else if (card.sourceStack.type === 'foundation' && this.foundationLayer) {
                                        this.foundationLayer.add(card);
                                    }
                                }
                                this.sortDisplayOrder();
                            }
                        }
                    },
                    onUpdate: (tween, target) => {
                        // Якщо під час анімації карту знову схопили - зупиняємо твін
                        if (!target.isReturning) {
                            tween.stop();
                        }
                    }
                });
            } else {
                this.sortDisplayOrder();
                this.updateUndoButtonState();
            }
        });

        this.returningCard = null;
        //this.input.enableDebug(this.tableauLayer); 
        // або просто натисни клавішу, щоб увімкнути дебаг для всіх об'єктів
        this.input.keyboard.on('keydown-D', () => {
            this.tableau.forEach(stack => {
                stack.cards.forEach(card => {
                    if(card.input) this.input.enableDebug(card);
                });
            });
        });

        // Тимчасовий код для тестування спрайта
        //const testSprite = this.add.sprite(this.scale.width / 2, this.scale.height / 2, 'common2', 'cup_tournament');
        //testSprite.setDepth(2000).setScale(2); // Робимо великим і зверху
        function calculateCurvedPosition(index, totalCount, baseY) {
            const centerIndex = (totalCount - 1) / 2;
            const diff = index - centerIndex;
            
            // Параболічна крива (x² дає плавність)
            const normalizedDiff = diff / centerIndex; // -1..0..+1
            const curveOffset = Math.pow(normalizedDiff, 2) * curveStrength * cardWidth;
            
            // Поворот (лінійний, але з плавною прогресією)
            const rotation = normalizedDiff * rotationStrength;
            
            // Y-зміщення (парабола)
            const y = baseY + curveOffset;
            
            return { diff, normalizedDiff, curveOffset, rotation, y };
        }
    
    }

    prepareStacksForShuffle() {
    // Проходимось по всіх стовпцях (Tableau)
    this.tableau.forEach(stack => {
        // Якщо в стопці немає карт - пропускаємо
        if (stack.cards.length === 0) return;

        // Індекс верхньої карти
        const topIndex = stack.cards.length - 1;

        stack.cards.forEach((card, index) => {
            const isTopCard = (index === topIndex);

            if (!isTopCard) {
                // --- ЦЕ КАРТА ПІД НИЗОМ ---
                
                // Якщо вона раптом відкрита — закриваємо її
                if (card.faceUp) {
                    card.faceUp = false; 
                    card.flipDown(); // Запускаємо анімацію повороту спиною
                }
                
                // Про всяк випадок вимикаємо інтерактивність і затемнюємо
                card.disableInteractive();
                card.setTint(0x999999); 
            } else {
                // --- ЦЕ ВЕРХНЯ КАРТА ---
                // Її поки не чіпаємо, вона має бути відкрита до моменту збору карт
                if (!card.faceUp) {
                    card.faceUp = true;
                    card.flipUp();
                }
                card.clearTint();
            }
        });
    });
}

    shakeCard(card) {
        // Захист від подвійного виклику (щоб карту не ковбасило, якщо клікати як скажений)
        if (card.isShaking) return;
        
        card.isShaking = true;
        const startX = card.x;

        this.tweens.add({
            targets: card,
            x: startX + 10, // Рух вправо
            duration: 50,
            yoyo: true,     // Повернення назад
            repeat: 3,      // Кількість повторів (туди-сюди 3 рази)
            onComplete: () => {
                card.x = startX; // Гарантуємо повернення на місце
                card.isShaking = false;
            }
        });
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
        
        this.tableau.forEach((stack, stackIndex) => {
            
            stack.cards.forEach((card, cardIndex) => {
                this.tableauLayer.add(card);
                

                const depth = (100 - stackIndex) * 100 + cardIndex;
                card.setDepth(depth);
            });
            
            stack.updatePositions();
        });

        if (this.draggedCard) {
            this.draggedCard.setDepth(20000); 
        }
    }

    // Додаємо параметр forceWin = false за замовчуванням. 
    // Це означає, що звичайна гра викликає this.checkWin() і параметр буде false.
    checkWin(forceWin = false) {
        // 1. Перевіряємо умови перемоги
        const playerDone = this.foundation.every(s => s.cards.length === 13);
        const activeParticipants = this.participants.filter(p => !p.eliminated);
        const botDone = activeParticipants.some(p => !p.isPlayer && p.score >= 96);

        // Якщо хтось виграв або натиснули чіт
        if (forceWin || playerDone || botDone) {
            
            // Захист від подвійного виклику
            if (this.isWinTriggered) return; 
            this.isWinTriggered = true;

            if (this.tutorialManager && this.tutorialManager.isActive) {
                console.log("Force ending tutorial due to Win condition");
                this.tutorialManager.endTutorial();
            }   
            this.currentRound++;

            // Зупиняємо ботів
            if (this.botTimer) {
                this.botTimer.remove();
                this.botTimer = null;
            }

            // Якщо чіт-код: даємо гравцю максимум, щоб він переміг
            if (forceWin) {
                const player = this.participants.find(p => p.isPlayer);
                if (player) {
                    player.score = 96;
                    this.updateParticipantUI(player); // Оновлюємо візуал
                }
            }

            // --- ЛОГІКА ВИБОРУ ЕКРАНУ ---

            // Якщо залишилось 2 учасники (або менше) — це ФІНАЛ
            if (activeParticipants.length <= 2) {
                // === ЦЕ ФІНАЛ ===
                // Шукаємо переможця (того, у кого найбільше очок або 96)
                // Сортуємо від більшого до меншого
                const sortedByScore = [...activeParticipants].sort((a, b) => b.score - a.score);
                const winner = sortedByScore[0]; 

                console.log("CHAMPION:", winner.name);
                this.showMatchWinner(winner);

            } else {
                // === ЦЕ ВІДБІРКОВИЙ РАУНД ===
                // Шукаємо лузера (найменше очок)
                // Сортуємо від меншого до більшого
                const sortedByScore = [...activeParticipants].sort((a, b) => a.score - b.score);
                const loser = sortedByScore[0]; 

                console.log("ELIMINATED:", loser.name);
                this.showRoundResults(loser.id);
            }
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
            
            // ЗНОВУ ЙО-ЙО
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
        
        // 1. БЛОКУЄМО гру і стеки
        this.isShuffling = true; 

        // 2. СПОЧАТКУ наводимо лад в нижніх картах (твоя нова функція)
        // Вона переверне всі карти під низом сорочкою догори
        this.prepareStacksForShuffle();

        // 3. Робимо паузу 250мс, щоб анімація закриття нижніх карт почалася
        // і виглядала природно перед тим, як почнуть крутитися верхні
        this.time.delayedCall(250, () => {

            // Знаходимо всі верхні карти, які зараз відкриті
            const topCards = [];
            this.tableau.forEach(stack => {
                const card = stack.top();
                if (card) topCards.push(card);
            });

            if (topCards.length === 0) {
                // Якщо карт немає, просто запускаємо логіку перемішування
                this.performInternalShuffle();
                return;
            }

            // АНІМАЦІЯ: Face -> Back для верхніх карт
            this.tweens.add({
                targets: topCards,
                scaleX: 0,        // Стискаємо до 0
                duration: 150,    // Швидкість стискання
                delay: this.tweens.stagger(40), // Хвиля
                
                yoyo: true,       // Автоматично розширює назад
                
                // Ця функція спрацює в момент, коли scaleX = 0 (карта невидима)
                onYoyo: (tween, target) => {
                    target.flipDown(); // Верхні карти теж стають сорочкою
                },

                // Коли ВСІ верхні карти перевернулися
                onComplete: () => {
                    // Тепер абсолютно всі карти на столі лежать сорочкою догори (і нижні, і верхні).
                    // Можна сміливо збирати їх в колоду і мішати.
                    this.performInternalShuffle(); 
                }
            });
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
            if (this.tutorialManager && this.tutorialManager.isActive) return;
            this.undoMove();
        });
        // ПІДГАНЯЄМО ТІЛЬКИ undo_icon
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
            console.log(" CHEAT: Примусова перемога!");
            // Викликаємо функцію перевірки перемоги з прапорцем true
            this.checkWin(true); 
        });
        
        this.diamondText = diamondBtn.label;
        this.diamondText.setFontSize('24px');
        this.diamondText.setY(this.diamondText.y - 29); // Підняти текст вгору на 15 пікселів
        this.sidePanel.add([diamondBtn.bg, diamondBtn.icon, diamondBtn.label]);
        // Shuffle (праворуч, нижній ряд)
        const shuffleBtn = this.createMenuButton(colRight, row2Y, 'common1', 'magnet_icon', ``, () => {
            if (this.tutorialManager && this.tutorialManager.isActive) return;
            if (this.isAnimatingBonus || this.isShuffling) return;;
            this.animateShuffleSequence();
        });
        this.shuffleBg = shuffleBtn.bg;
        this.sidePanel.add([shuffleBtn.bg, shuffleBtn.icon]);

        // 1. Фіксовані позиції Y для 1-го, 2-го і 3-го місця
        const startY = row2Y + 118;
        const spacing = 125;
        
        // Координати слотів (де повинні стояти панелі)
        this.rankPositions = [
            startY,              // 1-ше місце
            startY + spacing,    // 2-ге місце
            startY + spacing * 2 // 3-тє місце
        ];

        // 2. Створюємо масив учасників
        this.participants = [];

        // ДАНІ ГРАВЦЯ (YOU)
        const playerData = this.matchData ? this.matchData.player : { name: 'YOU', avatar: 'user0', frame: 'ava_competitor_player' };
        
        // ДАНІ БОТІВ
        let opponents = (this.matchData && Array.isArray(this.matchData.opponents)) ? this.matchData.opponents.slice() : [];
        //opponents = opponents.map((op, i) => ({ ...op, id: op.id || `bot${i+1}` }));
        if (this.matchData && Array.isArray(this.matchData.opponents)) {
            this.matchData.opponents = this.matchData.opponents.map((op, i) => ({ ...op, id: op.id || `bot${i+1}` }));
            opponents = this.matchData.opponents.slice();
        }
        // Якщо це не режим турніру і зовсім немає опонентів — додаємо 2 заглушки
        if (!this.isTournament && opponents.length === 0) {
            opponents = [
                { name: 'BOT 1', avatar: 'user1', frame: 'ava_competitor', id: 'bot1' },
                { name: 'BOT 2', avatar: 'user2', frame: 'ava_competitor', id: 'bot2' }
            ];
        }

        // Об'єднуємо всіх в один список
        // id потрібен для ідентифікації
        const allRacers = [
            { ...playerData, isPlayer: true, id: 'player' },
            ...opponents.map((op, i) => ({ ...op, isPlayer: false, id: op.id || `bot${i+1}` }))
        ];

        // 3. Створюємо панелі для кожного і ставимо на стартові позиції
        allRacers.forEach((racer, index) => {
            // Створюємо панель і отримуємо посилання на об'єкти всередині
            const uiObj = this.createPlayerPanel(137, this.rankPositions[index], racer, racer.isPlayer);
            
            this.participants.push({
                id: racer.id,
                isPlayer: racer.isPlayer,
                name: racer.name,
                container: uiObj.container,
                scoreText: uiObj.scoreText,
                progressBar: uiObj.progressBar,
                score: 0,
                rank: index,
                eliminated: false // <-- додано
            });
        });

        // 4. Запускаємо "Мозок ботів"
        this.startBotAI();

        // Magic бонус (ліворуч, низ)
        const btnLeftX = 80;
        const btnRightX = 190;
        
        this.magicBg = this.add.sprite(btnLeftX, bottomY, 'common1', 'b_magic_out')
            .setInteractive({ useHandCursor: true })
            .setScale(1);

        this.magicBg.on('pointerdown', () => {
            if (this.tutorialManager && this.tutorialManager.isActive) {
                const step = this.tutorialManager.steps[this.tutorialManager.currentStepIndex];

                // Якщо зараз саме крок "Натисни магію"
                if (step.action === 'click_ui' && step.targetBtn === 'magic') {
                    // 1. Повідомляємо туторіал, що ми натиснули
                    this.tutorialManager.onUIButtonClicked('magic');

                } else {
                    return; // Блокуємо, якщо зараз не час магії
                }
            }
            
            this.useAutoMoveBonus(1, 25, 'magic');
        });
        this.sidePanel.add(this.magicBg);

        // Joker бонус (праворуч, низ)
        this.jokerBg = this.add.sprite(btnRightX, bottomY, 'common1', 'b_joker_out')
            .setInteractive({ useHandCursor: true })
            .setScale(1);

        this.jokerBg.on('pointerdown', () => {
            if (this.tutorialManager && this.tutorialManager.isActive) {
                const step = this.tutorialManager.steps[this.tutorialManager.currentStepIndex];

                if (step.action === 'click_ui' && step.targetBtn === 'joker') {
                    this.tutorialManager.onUIButtonClicked('joker');
                    // Код піде далі й виконає джокера
                } else {
                    return;
                }
            }

            this.useAutoMoveBonus(8, 100, 'joker');
        }); 
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

        console.log('createGameUI - matchData.opponents:', JSON.parse(JSON.stringify(this.matchData.opponents || [])));
        console.log('createGameUI - allRacers:', JSON.parse(JSON.stringify(allRacers)));
    }

    createPlayerPanel(x, y, data, isPlayer) {
        const container = this.add.container(x, y);

        // 1. Фон панелі
        const bgTexture = isPlayer ? 'panel_norm_bg_player' : 'panel_norm_bg';
        const bg = this.add.image(0, 0, 'common1', bgTexture);

        bg.setScale(1, 1.15); 
        container.add(bg);

        // 2. Аватар (Зліва)
        const avaX = -75;
        const avaY = -15; 

        // Фон під аватаркою
        const avaBg = this.add.image(avaX, avaY, 'common1', 'competitor_bg');
        avaBg.setScale(0.7); 
        container.add(avaBg);

        const avatarKey = data.avatar || 'user0';
        const frameKey = data.frame || (isPlayer ? 'ava_competitor_player' : 'ava_competitor');
        const displayName = data.name || '';

        // Картинка
        const avatar = this.add.image(avaX, avaY, 'common1', avatarKey);
        avatar.setScale(0.7);
        container.add(avatar);

        // Рамка
        const frame = this.add.image(avaX, avaY, 'common1', frameKey);
        frame.setScale(1.1);
        container.add(frame);

        // Розрахунки для центрування тексту (залишаємо як було)
        const panelRightEdge = bg.displayWidth / 2;
        const avatarRightEdge = avaX + (avaBg.displayWidth / 2);
        const textCenterX = (avatarRightEdge + panelRightEdge) / 2;

        // Зміщення по висоті
        const nameOffsetY = -15; // Нік вище
        const scoreOffsetY = 10; // Рахунок нижче
        
        // avaY (-15) + 40 = +25 (це буде в нижній частині панелі)
        const barOffsetY = 50;   

        // 3. НІКНЕЙМ
        const nameText = this.add.text(textCenterX, avaY + nameOffsetY, displayName, {             fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2 
        });
        nameText.setOrigin(0.5, 0.5);
        container.add(nameText);

        // 4. ЛІЧИЛЬНИК (Медалька + Цифри)
        const scoreIcon = this.add.image(textCenterX - 5, avaY + scoreOffsetY, 'common2', 'task_icon_rating_points');
        scoreIcon.setScale(0.4);
        scoreIcon.setOrigin(1.5, 0.5);
        container.add(scoreIcon);

        const startScore = isPlayer ? "0/96" : "0/96";
        const scoreText = this.add.text(textCenterX + 5, avaY + scoreOffsetY, startScore, {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        scoreText.setOrigin(0.5, 0.5);
        container.add(scoreText);

        const padding = 18; // +- 4 пікселі з боків
        //  Ширина тепер рахується від ширини ВСЬОГО фону
        const barWidth = bg.displayWidth - (padding * 2);

        // B. Лінія прогресу
        // Початок лінії: зсуваємо вліво на половину ширини бару + маленький відступ для краси
        const progressBarLine = this.add.image(
            -(barWidth / 2) + 2, 
            avaY + barOffsetY, 
            'common1', 
            'pb_line'
        );
        progressBarLine.setOrigin(0, 0.5); 
        progressBarLine.setDisplaySize(0, 12);
        container.add(progressBarLine);

        // A. Фон бару
        // Ставимо по центру контейнера (x=0), а не тексту
        const progressBarBg = this.add.image(0, avaY + barOffsetY, 'common1', 'pb_top');
        progressBarBg.setDisplaySize(barWidth, 22);
        container.add(progressBarBg);

        // Зберігаємо макс. ширину для заповнення
        progressBarLine.maxFillWidth = barWidth - 4; 

        this.sidePanel.add(container);

        // Повертаємо посилання, щоб зберегти їх у масиві participants
        return { 
            container, 
            scoreText, 
            progressBar: progressBarLine 
        };
    }

    updateScore() {
        // 1. Рахуємо карти у ГРАВЦЯ
        let totalCards = 0;
        this.foundation.forEach(stack => {
            const count = Math.max(0, stack.cards.length - 1);
            totalCards += count;
        });

        // 2. Оновлюємо дані Гравця в UI
        const player = this.participants.find(p => p.isPlayer);
        if (player) {
            player.score = totalCards;
            this.updateParticipantUI(player); 
            this.checkRankings(); 
        }

        this.checkWin(false);
    }

    showMatchWinner(winner) {
        this.input.enabled = false;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // 1. Темний фон
        const blocker = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.8);
        blocker.setDepth(30000);

        // 2. Контейнер
        const popup = this.add.container(cx, cy);
        popup.setDepth(30001);

        // 3. Великий напис "LEVEL WINNER"
        const title = this.add.text(0, -100, 'LEVEL WINNER', {
            fontFamily: 'Arial', 
            fontSize: '48px', 
            color: '#ffd700', // Золотий
            fontStyle: 'bold',
            stroke: '#000000', 
            strokeThickness: 6
        }).setOrigin(0.5);
        popup.add(title);

        // 4. Ім'я переможця
        const winnerNameText = this.add.text(0, -20, winner.name.toUpperCase(), {
            fontFamily: 'Arial', 
            fontSize: '64px', 
            color: '#ffffff', 
            fontStyle: 'bold',
            stroke: '#000000', 
            strokeThickness: 4
        }).setOrigin(0.5);
        popup.add(winnerNameText);

        // 5. Кубок (величезний)
        const cup = this.add.image(0, 150, 'common2', 'cup_tournament');
        cup.setScale(1.5);
        popup.add(cup);

        this.tweens.add({
            targets: [title, winnerNameText],
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Обертання променів світла (якщо є спрайт 'light_rays', можна додати)
        // Якщо немає, просто додамо твін появи
        popup.setScale(0);
        this.tweens.add({
            targets: popup,
            scale: 1,
            duration: 500,
            ease: 'Back.out'
        });

        // --- ЛОГІКА ЗБЕРЕЖЕННЯ І ВИХОДУ ---
        
        let justUnlocked = false; // Створюємо змінну тут, щоб її бачив таймер

        if (winner.isPlayer) {
            const maxLevel = parseInt(localStorage.getItem('solitaire_max_level')) || 1;
            
            // Якщо ми пройшли поточний рівень і він був максимальним
            if (this.currentLevel >= maxLevel) {
                localStorage.setItem('solitaire_max_level', this.currentLevel + 1);
                justUnlocked = true; // Запам'ятовуємо, що ми щойно відкрили рівень!
            }
        }

        // Таймер переходу на вибір рівнів
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: popup,
                scale: 0,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    // Використовуємо змінну justUnlocked, яку ми вирахували РАНІШЕ
                    this.scene.start('LevelSelectScene', { 
                        animateFromLevel: justUnlocked ? this.currentLevel : null 
                    });
                }
            });
        });
    }

    startBotAI() {
        const bots = this.participants.filter(
            p => !p.isPlayer && !p.eliminated
        );
        // Чим вищий рівень, тим швидше боти набирають очки
        // Наприклад: рівень 1 -> інтервал 2000мс, рівень 20 -> 500мс
        let baseInterval = 2000; 
        const levelFactor = (this.currentLevel || 1) * 50; 
        let interval = Math.max(500, baseInterval - levelFactor);

        // Таймер, який спрацьовує постійно
        this.botTimer = this.time.addEvent({
            delay: interval,
            loop: true,
            callback: () => {
                //  ДОДАТКОВА ПЕРЕВІРКА: Якщо гра закінчилась, не працюємо
                if (this.isWinTriggered) return;

                if (Math.random() > 0.5) {
                    const bots = this.participants.filter(p => !p.isPlayer && !p.eliminated);
                    if (bots.length === 0) return;
                    const randomBot = bots[Math.floor(Math.random() * bots.length)];
                    if (randomBot.score < 96) {
                        randomBot.score += 1;
                        this.updateParticipantUI(randomBot);
                        this.checkRankings();
                    }
                }
            }
        });
    }

    updateParticipantUI(participant) {
        if (!participant || participant.eliminated) return; // <-- guard
        if (participant.eliminated) return;

        const maxScore = 96;
        participant.scoreText.setText(`${participant.score}/${maxScore}`);
        const progress = participant.score / maxScore;
        const newWidth = participant.progressBar.maxFillWidth * progress;

        this.tweens.add({
            targets: participant.progressBar,
            displayWidth: newWidth,
            duration: 300,
            ease: 'Power2'
        });
    }

    checkRankings() {
        // Враховуємо тільки живих учасників
        const active = this.participants.filter(p => !p.eliminated);
        const sortedList = [...this.participants]
            .filter(p => !p.eliminated)
            .sort((a, b) => b.score - a.score);
        sortedList.forEach((participant, newRank) => {
            if (participant.rank !== newRank) {
                participant.rank = newRank;
                const targetY = this.rankPositions[newRank];

                this.tweens.add({
                    targets: participant.container,
                    y: targetY,
                    duration: 600,
                    ease: 'Cubic.inOut'
                });
            }
        });
    }

    updateUndoButtonState() {
        // Перевіряємо, чи існує кнопка (щоб не було помилок на старті)
        if (!this.undoBg) return;

        if (this.tutorialManager && this.tutorialManager.isActive) {
            this.undoBg.setTexture('common1', 'but_undo_gray'); 
            this.undoBg.disableInteractive(); 
            this.undoIcon.setVisible(false);
            return; // Виходимо, щоб логіка нижче не спрацювала
        }

        // НАЛАШТУВАННЯ РОЗМІРІВ (Маніпулюй цими цифрами)
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
    setTutorialVisuals(isActive) {
        // 1. Спочатку оновлюємо Undo (воно саме підтягне стан через isActive)
        this.updateUndoButtonState();

        // 2. Налаштування для бонусів (Shuffle, Magic, Joker)
        const alpha = isActive ? 0.5 : 1; // 0.5 = напівпрозорий
        
        // Список кнопок бонусів
        const buttons = [this.magicBg, this.jokerBg, this.shuffleBg];

        buttons.forEach(btn => {
            if (btn) {
                btn.setAlpha(alpha); // Робимо блідими

                if (isActive) {
                    btn.disableInteractive(); // Вимикаємо кліки
                } else {
                    // Вмикаємо назад (для Shuffle є додаткова умова shufflesLeft > 0, але setInteractive базово ок)
                    if (btn === this.shuffleBg && this.shufflesLeft <= 0) {
                        // Якщо шафлів 0, не вмикаємо
                    } else {
                        btn.setInteractive();
                    }
                }
            }
        });
    }

    highlightButtonForTutorial(btnBg) {
        if (btnBg) {
            btnBg.setAlpha(1); // Яскрава
            btnBg.setInteractive(); // Клікабельна
        }
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

                // Вимикаємо всі кнопки одним рядком
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

  playMagicTrail(startX, startY, targetCard, onComplete) {
    // 1. Створюємо "голову" (снаряд) - робимо трохи більшою
    const projectile = this.add.image(startX, startY, 'common2', '1st_place_star')
        .setScale(1.2) 
        .setDepth(2000); 

    // 2. Додаємо ефект шлейфу (particles)
    const particles = this.add.particles(0, 0, 'common2', {
        frame: '1st_place_star',
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        speed: { min: 50, max: 100 },
        lifespan: 450, 
        frequency: 5, 
        quantity: 2,
        blendMode: 'ADD', 
        follow: projectile,
        emitZone: { 
            type: 'random', 
            source: new Phaser.Geom.Circle(0, 0, 10) 
        }
    });
    particles.setDepth(1999);

    // 3. Розрахунок часу
    const dist = Phaser.Math.Distance.Between(startX, startY, targetCard.x, targetCard.y);
    const duration = Math.max(300, dist * 0.6); 

    // 4. Анімація польоту
    this.tweens.add({
        targets: projectile,
        x: targetCard.x,
        y: targetCard.y,
        duration: duration,
        ease: 'Sine.easeIn', // Розганяється в кінці
        onComplete: () => {
            // Ефект влучання (Великий вибух зірочок!)
            // Збільшив кількість частинок при ударі до 30
            particles.emitParticleAt(targetCard.x, targetCard.y, 30);
            
            projectile.destroy(); // Видаляємо голову
            
            // Даємо хвосту догоріти (500мс) перед повним видаленням
            this.time.delayedCall(500, () => particles.destroy());

            // Викликаємо колбек - починаємо рух карти
            if (onComplete) onComplete();
        }
    });
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
        this.settingsContainer.setDepth(50000); // Ще вище, ніж затемнення

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
            this.openLanguageMenu(); // Новий метод
        });
        this.langSettingsIcon = langBtn.icon;
        // Кнопка 4: ВИХІД (Exit)
        // Використовуємо game_exit_icon_small з common2
        this.createOptionButton(startX + spacing * 3, 0, 'common2', 'game_exit_icon_small', () => {
             // Замість прямого виходу — показуємо попап
             this.showExitPopup();
        });
    }

    showExitPopup() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // 1. ЗАТЕМНЕННЯ ФОНУ
        const blocker = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6);
        blocker.setInteractive();
        blocker.setDepth(50000);

        // 2. КОНТЕЙНЕР ПОПАПУ
        const popup = this.add.container(cx, cy);
        popup.setDepth(50001);

        // 3. ФОН ПАНЕЛІ (common2)
        const panelWidth = 540;
        const panelHeight = 680;

        const panelBg = this.add.image(0, 0, 'common2', 'win_bg');
        panelBg.setDisplaySize(panelWidth, panelHeight);
        popup.add(panelBg);

        const layout = {
            title: -130,      
            icon: 20,        
            warning: 150,      
            button: 300,      
            closeBtn: {       
                x: (panelWidth / 2) - 50, // Відступ від правого краю
                y: -(panelHeight / 2) + 70 // Відступ від верху
            }
        };

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // A. ТЕКСТ ПИТАННЯ
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        const titleText = this.add.text(0, layout.title, "Do you really want\nto exit?", {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        popup.add(titleText);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // B. ІКОНКА (common2)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        const exitIcon = this.add.image(0, layout.icon, 'common2', 'game_exit_icon');
        exitIcon.setScale(1.1);
        popup.add(exitIcon);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // C. ПОПЕРЕДЖЕННЯ
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        const loseText = this.add.text(0, layout.warning, "You will lose!", {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        popup.add(loseText);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // D. КНОПКА "EXIT" (common1)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        const btnContainer = this.add.container(0, layout.button);
        
        const btnBg = this.add.image(0, 0, 'common1', 'but_red_out');
        btnBg.setScale(0.9);
        
        const btnText = this.add.text(0, 0, 'EXIT', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnText]);
        popup.add(btnContainer);

        // Інтерактивність кнопки
        btnBg.setInteractive({ useHandCursor: true });
        
        btnBg.on('pointerover', () => {
            btnBg.setFrame('but_red_over');
            btnContainer.setScale(1.05);
        });
        
        btnBg.on('pointerout', () => {
            btnBg.setFrame('but_red_out');
            btnContainer.setScale(1);
        });
        
        btnBg.on('pointerdown', () => {
            this.tweens.add({
                targets: btnContainer,
                scale: 0.9,
                yoyo: true,
                duration: 50,
                onComplete: () => {
                    popup.destroy();
                    blocker.destroy();
                    
                    this.scene.start('LevelSelectScene', { 
                        level: this.currentLevel,       // Залишаємось на поточному рівні
                        animateFromLevel: null,         // ЗАБОРОНЯЄМО анімацію перельоту
                        isGameFinished: false           // Прапорець, що ми просто вийшли
                    });
                }
            });
        });

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 4. ХРЕСТИК (CLOSE) - НОВІ АСЕТИ (common1)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        const closeContainer = this.add.container(layout.closeBtn.x, layout.closeBtn.y);

        // 1. Фон кнопки (but_out / but_over)
        const closeBg = this.add.image(0, 0, 'common1', 'but_out');
        // closeBg.setScale(0.8); // Якщо кнопка завелика, розкоментуй це

        // 2. Сама іконка хрестика (icon_close)
        const closeIcon = this.add.image(0, 0, 'common1', 'icon_close');
        
        closeContainer.add([closeBg, closeIcon]);
        popup.add(closeContainer);

        // Логіка інтерактивності
        closeBg.setInteractive({ useHandCursor: true });

        // Наведення: міняємо фон на but_over
        closeBg.on('pointerover', () => {
            closeBg.setFrame('but_over');
            // Можна додати легке збільшення
             this.tweens.add({ targets: closeContainer, scale: 1.1, duration: 100 });
        });
        
        // Курсор пішов: повертаємо but_out
        closeBg.on('pointerout', () => {
            closeBg.setFrame('but_out');
             this.tweens.add({ targets: closeContainer, scale: 1, duration: 100 });
        });

        // Клік: закриваємо
        closeBg.on('pointerdown', () => {
            this.tweens.add({
                targets: popup,
                scale: 0,
                duration: 200,
                ease: 'Back.in',
                onComplete: () => {
                    popup.destroy();
                    blocker.destroy();
                }
            });
        });

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 5. АНІМАЦІЯ ПОЯВИ
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        popup.setScale(0);
        this.tweens.add({
            targets: popup,
            scale: 1,
            duration: 300,
            ease: 'Back.out'
        });
    }

    // Допоміжний метод для створення круглої кнопки опцій
    createOptionButton(x, y, iconAtlas, iconFrame, callback) {
        // НАЛАШТУВАННЯ РОЗМІРУ ФОНУ
        // 1.0 = оригінал (106px). 1.2 = +20% (127px). 1.3 = +30% тощо.
        const bgScale = 1.3; 

        // 1. Фон кнопки
        const bg = this.add.sprite(x, y, 'common1', 'but_options3')
            .setInteractive({ useHandCursor: true })
            .setScale(bgScale); // Застосовуємо розмір відразу

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

        // НАЛАШТУВАННЯ СІТКИ
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
            duration: 5000, // Було 800, стало 2000 (2 секунди) — тепер дуже плавно
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

    // Якщо ходів немає - завершуємо
    if (!move) {
        this.finishBonusAnimation(); // Переконайся, що цей метод існує, або скопіюй логіку з if (movesLeft <= 0)
        return;
    }

    // --- ЛОГІКА КООРДИНАТ ---
    let startX = 0;
    let startY = 0;
    let sourceObject = null;

    // Визначаємо об'єкт-джерело
    if (this.activeBonusType === 'magic') {
        sourceObject = this.magicBg;
    } else if (this.activeBonusType === 'joker') {
        sourceObject = this.jokerBg;
    }


    if (sourceObject) {
        const matrix = sourceObject.getWorldTransformMatrix();
        startX = matrix.tx;
        startY = matrix.ty;
    } else {
        // Фолбек (центр екрану), якщо щось пішло не так
        startX = this.scale.width / 2;
        startY = this.scale.height / 2;
    }

    const { card, targetStack } = move;

    // Запускаємо ефект
    this.playMagicTrail(startX, startY, card, () => {
        
        // --- Цей код виконується ПІСЛЯ влучання ---
        
        const oldStack = card.sourceStack;

        if (oldStack) {
            oldStack.pop(); 
            oldStack.updatePositions(); 
        }

        if (card.parentContainer) {
            card.parentContainer.remove(card);
        }
        this.add.existing(card);
        card.setDepth(99999); 

        // Розрахунок позиції цілі
        let finalX = targetStack.x;
        let finalY = targetStack.y;

        if (targetStack.type === 'tableau' && targetStack.cards.length > 0) {
            const lastCard = targetStack.top();
            finalX = lastCard.x; 
            finalY = lastCard.y + 30; // 30 - це cardOverlap (перевір у Stack.js, якщо там інше число)
        }

        this.tweens.add({
            targets: card,
            x: finalX,
            y: finalY,
            scale: 1.3, // Якщо карта була зменшена
            rotation: targetStack.rotation, 
            duration: 250,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                targetStack.push(card);
                targetStack.updatePositions();
                
                this.sortDisplayOrder();
                this.updateScore();
                this.checkWin();

                // РЕКУРСІЯ
                this.time.delayedCall(100, () => {
                    this.performAutoMovesSequence(movesLeft - 1);
                });
            }
        });
    });
}
finishBonusAnimation() {
    this.isAnimatingBonus = false;
    this.activeBonusType = null;
    this.setBonusButtonsState(true); // Вмикаємо кнопки назад
    console.log(" Bonus sequence finished");
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

        // Блокування прямокутного Shuffle
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
        // 1. Спочатку шукаємо ходи у ФУНДАЦІЮ (це завжди пріоритет)
        for (let tStack of this.tableau) {
            if (tStack.cards.length > 0) {
                const card = tStack.top();
                for (let fStack of this.foundation) {
                    if (fStack.canPlace(card)) {
                        return { card: card, targetStack: fStack };
                    }
                }
            }
        }

        // 2. Шукаємо ходи між стопками ТАБЛО
        for (let sourceStack of this.tableau) {
        // Якщо стопка пуста, брати нічого
        if (sourceStack.cards.length === 0) continue;
        
        const card = sourceStack.top();
        
        for (let targetStack of this.tableau) {
            // Не перекладати в ту саму стопку
            if (sourceStack === targetStack) continue;

            if (targetStack.cards.length === 0) continue;

            // Якщо це не порожній стек, перевіряємо правила гри
            if (targetStack.canPlace(card)) {
                return { card: card, targetStack: targetStack };
            }
        }
    }

        return null; // Ходів не знайдено
    }

    showRoundResults(loserId) {
        // --- Зупинка і базова підготовка ---
        if (this.botTimer) {
            this.botTimer.remove();
            this.botTimer = null;
        }
        this.input.enabled = false;
        if (this.isWinTriggered) this.isWinTriggered = true; // додаткова страховка

        // --- ЗНАХОДИМО ЛУЗЕРА І ЕЛІМІНУЄМО ЙОГО ОДРАЗУ ---
        const loserObj = this.participants.find(p => p.id === loserId);

        if (loserObj) {
            // Позначаємо як eliminated
            loserObj.eliminated = true;

            // Якщо панель є у sidePanel - краще явно прибрати її
            if (this.sidePanel && loserObj.container && this.sidePanel.getIndex) {
                // remove(child, destroyChild) — якщо хочеш, щоб container сам видалився
                try {
                    this.sidePanel.remove(loserObj.container, true);
                } catch (e) {
                    // на всякий — якщо remove недоступний, пробуємо destroy — Phaser нормально впорається
                }
            }

            // Викликаємо destroy на контейнері (видаляє children)
            if (loserObj.container && loserObj.container.destroy) {
                loserObj.container.destroy(true);
            }

            // Видаляємо зі списку учасників, щоб інші системи вже не бачили цього об'єкта
            this.participants = this.participants.filter(p => p.id !== loserId);

            // Оновлюємо ранжування, щоб інші панелі пересунулися на вільні місця
            this.checkRankings();
        }

        // --- Побудова попапу ---
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const blocker = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
        blocker.setDepth(30000);

        const popup = this.add.container(cx, cy);
        popup.setDepth(30001);

        const bg = this.add.image(0, 0, 'common2', 'win_bg_big');
        popup.add(bg);

        const panel1 = this.add.image(0, 210, 'common1', 'panel1');
        popup.add(panel1);

        const timerText = this.add.text(0, 210, 'NEXT ROUND IN 4...', {
            fontFamily: 'Arial', fontSize: '24px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5);
        popup.add(timerText);

        const title = this.add.text(0, -255, 'ROUND COMPLETE!', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        popup.add(title);

        // Кубки ітд (як у тебе)...
        const miniCupContainer = this.add.container(-410, -250);
        miniCupContainer.add([this.add.image(0, 0, 'common2', 'icon_bg'), this.add.image(0, 0, 'common2', 'cup_ico')]);
        popup.add(miniCupContainer);

        const cup = this.add.image(0, -100, 'common2', 'cup_tournament').setScale(0.9);
        popup.add(cup);

        // --- ПІДГОТОВКА ДАНИХ ДЛЯ ПОПАПУ (використовуємо надійне джерело) ---
        const activeParticipantsForPopup = [];

        // гравець (якщо був)
        const p1 = this.matchData && this.matchData.player ? { ...this.matchData.player, id: 'player', isPlayer: true } : null;
        if (p1) activeParticipantsForPopup.push(p1);

        // Боти — беремо з matchData.opponents, але надаємо id якщо його немає
        const opponents = Array.isArray(this.matchData.opponents) ? this.matchData.opponents.slice() : [];
        for (let i = 0; i < 2; i++) {
            const op = opponents[i] || { name: `BOT ${i+1}`, avatar: `user${i+1}`, frame: 'ava_competitor' };
            const id = op.id || `bot${i+1}`;
            activeParticipantsForPopup.push({ ...op, id, isPlayer: false });
        }

        // Тепер створюємо аватари у попапі, беручи до уваги вже відміченого лузера
        const spacing = 280;
        const createResultAvatar = (x, y, participant) => {
            const c = this.add.container(x, y);
            const avatarOffsetY = -10;
            const bgA = this.add.image(0, avatarOffsetY, 'common1', 'competitor_bg').setScale(2);
            const userIcon = this.add.image(0, avatarOffsetY, 'common1', participant.avatar || 'user0').setScale(1.2);
            const frameName = participant.isPlayer ? 'ava_competitor_player' : 'ava_competitor';
            const frame = this.add.image(0, avatarOffsetY, 'common1', frameName).setScale(2);
            const nameText = this.add.text(0, 60, participant.name, { fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);

            c.add([bgA, userIcon, frame, nameText]);

            if (participant.id === loserId) {
                userIcon.setTint(0x555555);
                frame.setTint(0x555555);
                const cross = this.add.image(0, avatarOffsetY, 'common1', 'icon_close').setScale(3).setTint(0xff0000);
                c.add(cross);
                nameText.setText('ELIMINATED');
                nameText.setColor('#ff0000');
            }

            popup.add(c);
        };

        // Розміщуємо (player зліва, бот1 center, бот2 right)
        if (activeParticipantsForPopup[0]) createResultAvatar(-spacing, 100, activeParticipantsForPopup[0]);
        if (activeParticipantsForPopup[1]) createResultAvatar(0, 100, activeParticipantsForPopup[1]);
        if (activeParticipantsForPopup[2]) createResultAvatar(spacing, 100, activeParticipantsForPopup[2]);

        // --- ВІДЛІК ТА ПЕРЕХІД ---
        let count = 4;
        const countdown = this.time.addEvent({
            delay: 1000,
            repeat: 4,
            callback: () => {
                if (!this.sys || !this.sys.isActive()) return; 

                count--;
                if (count > 0) {
                    timerText.setText(`NEXT ROUND IN ${count}...`);
                } else {
                    // В залежності від того хто лузер
                    if (loserId === 'player') {
                        timerText.setText("GAME OVER");
                        this.tweens.add({
                            targets: popup, scale: 0, duration: 300,
                            onComplete: () => this.scene.start('LevelSelectScene')
                        });
                    } else {
                        // Оновлюємо matchData.opponents — фільтруємо по id або по name як fallback
                        let nextOpponents;
                        if (this.matchData && Array.isArray(this.matchData.opponents) && this.matchData.opponents.some(op => op.id !== undefined)) {
                            nextOpponents = this.matchData.opponents.filter(op => op.id !== loserId);
                        } else {
                            // fallback: по імені
                            const loserName = loserObj ? loserObj.name : null;
                            nextOpponents = this.matchData.opponents.filter(op => op.name !== loserName);
                        }

                        if (nextOpponents.length > 0) {
                            timerText.setText("NEXT ROUND STARTING!");
                            this.tweens.add({
                                targets: popup, scale: 0, duration: 300,
                                onComplete: () => {
                                    // ВИПРАВЛЕННЯ ТУТ:
                                    this.scene.restart({
                                        level: this.currentLevel,
                                        round: this.currentRound, // <--- ВАЖЛИВО! Передаємо поточний (вже збільшений) раунд
                                        matchData: { player: this.matchData.player, opponents: nextOpponents }
                                    });
                                }
                            });
                        } else {
                            // ТУРНІР ВИГРАНО
                            timerText.setText("TOURNAMENT WON!");
                            title.setText("CHAMPION!");
                            // (збереження прогресу як у тебе)
                            const maxLevel = parseInt(localStorage.getItem('solitaire_max_level')) || 1;
                            let justUnlocked = false;
                            if (this.currentLevel >= maxLevel) {
                                localStorage.setItem('solitaire_max_level', this.currentLevel + 1);
                                justUnlocked = true;
                            }

                            this.tweens.add({
                                targets: popup, scale: 1.1, alpha: 0, duration: 500, delay: 1000,
                                onComplete: () => this.scene.start('LevelSelectScene', { animateFromLevel: justUnlocked ? this.currentLevel : null })
                            });
                        }
                    }
                }
            }
        });

        // Поява попапу
        popup.setScale(0);
        this.tweens.add({ targets: popup, scale: 1, duration: 400, ease: 'Back.out' });
    }

setupTutorialBoardRigged() {
    console.log(" Setting up Tutorial Board - FINAL BALANCED VERSION");
    this.isShuffling = true;

    // ══════════════════════════════════════════════════════════
    // КРОК 1: СКИДАННЯ - збираємо всі карти назад
    // ══════════════════════════════════════════════════════════
    console.log(" КРОК 1: Збираємо всі карти...");
    
    const allCards = [];
    
    this.tableau.forEach((stack) => {
        while (stack.cards.length > 0) {
            const card = stack.pop();
            card.faceUp = false; card.flipDown(); 
            allCards.push(card);
        }
    });
    
    this.foundation.forEach((stack) => {
        const baseCard = stack.cards[0];
        while (stack.cards.length > 1) {
            const card = stack.cards.pop();
            card.faceUp = false; card.flipDown();
            allCards.push(card);
        }
        if (baseCard && stack.cards.length === 0) stack.cards = [baseCard];
    });
    
    this.deck.cards = allCards;
    console.log(` Зібрано ${this.deck.cards.length} карт`);

    // ══════════════════════════════════════════════════════════
    // КРОК 2: РЕЗЕРВУВАННЯ (7 карт)
    // ══════════════════════════════════════════════════════════
    console.log("\n КРОК 2: Резервуємо спеціальні карти...");
    
    const findAndReserve = (val, suit) => {
        const card = this.deck.cards.find(c => c.value === val && c.suit === suit);
        if (card) {
            const idx = this.deck.cards.indexOf(card);
            if (idx > -1) this.deck.cards.splice(idx, 1);
        }
        return card;
    };

    const reserved = {
        k_clubs: findAndReserve(13, 'clubs'),
        q_clubs: findAndReserve(12, 'clubs'),
        j_clubs: findAndReserve(11, 'clubs'),
        two_hearts: findAndReserve(2, 'hearts'),
        ten_spades: findAndReserve(10, 'spades'),
        j_spades: findAndReserve(11, 'spades'),
        three_hearts: findAndReserve(3, 'hearts')
    };

let foundationKing = null;
    for (const stack of this.foundation) {
        // Шукаємо Короля Хрести саме в фундації
        const k = stack.cards.find(c => c.value === 13 && c.suit === 'clubs');
        if (k) {
            foundationKing = k;
            break;
        }
    }

    // Якщо знайшли у фундації - вішаємо тег на нього (пріоритет!)
    if (foundationKing) {
        foundationKing.tutorialTag = 'k_clubs';
        console.log(" Tagged Foundation King for Tutorial Arrow!");
    } else {
        // Фолбек: якщо раптом у фундації немає, вішаємо на того, що в руці
        if (reserved.k_clubs) reserved.k_clubs.tutorialTag = 'k_clubs';
    }

    //if (reserved.k_clubs) reserved.k_clubs.tutorialTag = 'k_clubs';
    if (reserved.q_clubs) reserved.q_clubs.tutorialTag = 'q_clubs';
    if (reserved.j_clubs) reserved.j_clubs.tutorialTag = 'j_clubs';
    if (reserved.two_hearts) reserved.two_hearts.tutorialTag = 'two_hearts';
    if (reserved.ten_spades) reserved.ten_spades.tutorialTag = 'ten_spades';
    if (reserved.j_spades) reserved.j_spades.tutorialTag = 'j_spades';
    if (reserved.three_hearts) reserved.three_hearts.tutorialTag = 'three_hearts';

    // ══════════════════════════════════════════════════════════
    // КРОК 3: РОЗДАЧА (89 карт)
    // ══════════════════════════════════════════════════════════
    console.log("\n КРОК 3: Роздаємо карти (з дефіцитом)...");
    
    Phaser.Utils.Array.Shuffle(this.deck.cards);

    // Роздаємо, скільки вистачить. 
    // Стеки 0-13 отримають 6 карт. Стек 14 отримає 5. Стек 15 отримає 0.
    this.tableau.forEach((stack) => {
        for(let i = 0; i < 6; i++) { 
            if (this.deck.cards.length > 0) {
                const card = this.deck.cards.shift();
                card.faceUp = false;
                card.flipDown();
                stack.push(card);
            }
        }
    });

    // ══════════════════════════════════════════════════════════
    // КРОК 4: ВСТАВКА СЦЕНАРІЮ (Повертає 7 "жертв" у колоду)
    // ══════════════════════════════════════════════════════════
    console.log("\n КРОК 4: Вставляємо спеціальні карти...");
    
    const placeReserved = (card, stackIdx, position) => {
        if (!card) return;
        const targetStack = this.tableau[stackIdx];
        
        // Якщо місце зайняте - міняємо (Swap)
        if (position < targetStack.cards.length) {
            const victim = targetStack.cards[position];
            if (victim && victim !== card) {
                if (targetStack.remove) targetStack.remove(victim);
                victim.setVisible(false);
                victim.faceUp = false;
                victim.flipDown();
                
                // Жертва повертається в колоду!
                this.deck.cards.push(victim);
                console.log(`  Returned to deck: ${victim.value} ${victim.suit}`);
            }
            targetStack.cards[position] = card;
        } else {
            targetStack.cards.push(card);
        }
        
        card.sourceStack = targetStack;
        if (this.tableauLayer) this.tableauLayer.add(card);
        else this.add.existing(card);
    };

    placeReserved(reserved.k_clubs, 0, 5);
    placeReserved(reserved.q_clubs, 1, 5);
    placeReserved(reserved.j_clubs, 2, 5);
    placeReserved(reserved.two_hearts, 3, 5);
    placeReserved(reserved.ten_spades, 4, 5);
    placeReserved(reserved.j_spades, 5, 5);
    placeReserved(reserved.three_hearts, 5, 4);

    // ══════════════════════════════════════════════════════════
    //  КРОК 4.5: ЗАПОВНЕННЯ ДІРОК (SMART FILL) 
    // ══════════════════════════════════════════════════════════
    console.log(`\n КРОК 4.5: Заповнюємо прогалини в останніх стеках (${this.deck.cards.length} карт)...`);
    
    // Проходимо по всіх стеках і докидаємо тим, у кого менше 6 карт
    this.tableau.forEach((stack, idx) => {
        while (stack.cards.length < 6 && this.deck.cards.length > 0) {
            const card = this.deck.cards.pop();
            
            card.faceUp = false;
            card.flipDown();
            stack.push(card);
            
            if (this.tableauLayer) this.tableauLayer.add(card);
            else this.add.existing(card);
            
            console.log(`  Filled gap in Stack ${idx} (now ${stack.cards.length})`);
        }
    });

    // ══════════════════════════════════════════════════════════
    // КРОК 5 & 6: ФІНАЛ
    // ══════════════════════════════════════════════════════════
    
    // Перевірка фундацій (код без змін)
    this.foundation.forEach((stack, idx) => {
        if (stack.cards.length === 0) { /* логіка відновлення, якщо треба */ }
    });

    this.isShuffling = false; 
    this.forceBoardCleanupForTutorial();
    this.verifyCardCount();
}

// ══════════════════════════════════════════════════════════
// ПЕРЕВІРКА КАРТ (для 2 колод)
// ══════════════════════════════════════════════════════════

verifyCardCount() {
    const counts = {
        tableau: this.tableau.reduce((sum, s) => sum + s.cards.length, 0),
        foundation: this.foundation.reduce((sum, s) => sum + s.cards.length, 0),
        deck: this.deck.cards.length
    };
    
    counts.total = counts.tableau + counts.foundation + counts.deck;
    
    const EXPECTED = 104; // ДВІ КОЛОДИ!
    
    console.log(`
╔════════════════════════════════════════╗
║   АУДИТ КАРТ (2 КОЛОДИ - 104 КАРТИ)    ║
╠════════════════════════════════════════╣
║  На столі (Tableau):   ${String(counts.tableau).padStart(3)}        ║
║   У фундації (8 баз):  ${String(counts.foundation).padStart(3)}        ║
║  В колоді:              ${String(counts.deck).padStart(3)}        ║
╟────────────────────────────────────────╢
║  ВСЬОГО:                ${String(counts.total).padStart(3)}        ║
║  Очікується:            ${EXPECTED}        ║
╟────────────────────────────────────────╢
║ ${counts.total === EXPECTED ? ' ВСЕ ОК! ГРА ГОТОВА!' : ' ПОМИЛКА! КАРТИ ЗНИКЛИ!'}       ║
╚════════════════════════════════════════╝
    `);
    
    // Детальний розклад фундацій
    console.log("\n ДЕТАЛЬНИЙ СТАН ФУНДАЦІЙ:");
    this.foundation.forEach((stack, idx) => {
        const base = stack.cards[0];
        const type = stack.buildUp ? 'A→K' : 'K→A';
        console.log(`  Foundation[${idx}] (${type}): ${stack.cards.length} карт, база: ${base ? base.value + ' ' + base.suit : 'ПОРОЖНЯ!'}`);
    });
    
    if (counts.total !== EXPECTED) {
        console.error(' КРИТИЧНА ПОМИЛКА!');
        this.detailedCardAudit();
    } else {
        this.checkForDuplicates();
    }
    
    return counts.total === EXPECTED;
}

// ══════════════════════════════════════════════════════════
// ДЕТАЛЬНИЙ АУДИТ (без змін)
// ══════════════════════════════════════════════════════════

detailedCardAudit() {
    const cardMap = new Map();
    
    this.tableau.forEach((stack, i) => {
        stack.cards.forEach((card, j) => {
            const key = `${card.value}-${card.suit}`;
            if (!cardMap.has(key)) cardMap.set(key, []);
            cardMap.get(key).push(`Tableau[${i}][${j}]`);
        });
    });
    
    this.foundation.forEach((stack, i) => {
        stack.cards.forEach((card, j) => {
            const key = `${card.value}-${card.suit}`;
            if (!cardMap.has(key)) cardMap.set(key, []);
            cardMap.get(key).push(`Foundation[${i}][${j}]`);
        });
    });
    
    this.deck.cards.forEach((card, i) => {
        const key = `${card.value}-${card.suit}`;
        if (!cardMap.has(key)) cardMap.set(key, []);
        cardMap.get(key).push(`Deck[${i}]`);
    });
    
    console.log('\n ПЕРЕВІРКА НА ДУБЛІКАТИ:');
    let duplicatesFound = false;
    
    cardMap.forEach((locations, key) => {
        // Для 2 колод ОЧІКУЄМО 2 входження кожної карти!
        if (locations.length > 2) {
            console.error(` ДУБЛІКАТ (${locations.length}x): ${key} в: ${locations.join(', ')}`);
            duplicatesFound = true;
        } else if (locations.length === 1) {
            console.warn(` ТІЛЬКИ 1 КОПІЯ: ${key} в ${locations[0]}`);
        }
    });
    
    if (!duplicatesFound) {
        console.log(' Критичних дублікатів не знайдено');
    }
    
    // Перевірка на відсутні карти (кожна має бути двічі!)
    console.log('\n ПЕРЕВІРКА ПОВНОТИ КОЛОД:');
    const allExpected = [];
    ['hearts', 'diamonds', 'clubs', 'spades'].forEach(suit => {
        for (let v = 1; v <= 13; v++) {
            allExpected.push(`${v}-${suit}`);
        }
    });
    
    const missingCards = [];
    allExpected.forEach(key => {
        const count = cardMap.get(key)?.length || 0;
        if (count < 2) {
            missingCards.push(`${key} (${count}/2)`);
        }
    });
    
    if (missingCards.length > 0) {
        console.error(` НЕПОВНІ КАРТИ: ${missingCards.join(', ')}`);
    } else {
        console.log(' Всі 52 типи карт присутні по 2 рази');
    }
}

checkForDuplicates() {
    const cardCount = new Map();
    
    const countCards = (stack, name) => {
        stack.cards.forEach(card => {
            const key = `${card.value}-${card.suit}`;
            cardCount.set(key, (cardCount.get(key) || 0) + 1);
        });
    };
    
    this.tableau.forEach((s, i) => countCards(s, `Tableau ${i}`));
    this.foundation.forEach((s, i) => countCards(s, `Foundation ${i}`));
    countCards({ cards: this.deck.cards }, 'Deck');
    
    let hasErrors = false;
    cardCount.forEach((count, key) => {
        if (count > 2) {
            console.error(` ДУБЛІКАТ (${count}x): ${key}`);
            hasErrors = true;
        } else if (count < 2) {
            console.warn(` ТІЛЬКИ ${count}x: ${key}`);
        }
    });
    
    if (!hasErrors) {
        console.log(' Перевірка дублікатів ОК');
    }
}


forceBoardCleanupForTutorial() {

    console.log(" Tutorial Cleanup: Layers & Visuals Sync...");
    const allStacks = [...this.tableau, ...this.foundation];

    // 1. Оновлюємо координати (щоб homeX/homeY були актуальні)
    allStacks.forEach(s => s.updatePositions());

    allStacks.forEach(stack => {
        // Якщо раптом у контейнері стека завалялась карта (чого бути не має) - видаляємо
        if (stack.list) {
            [...stack.list].forEach(child => {
                if (child.constructor.name === 'Card') {
                    stack.remove(child); // Виймаємо з контейнера стека
                }
            });
        }

        // --- ЕТАП 2: РОБОТА З ЛОГІЧНИМИ КАРТАМИ ---
        const topCard = stack.cards[stack.cards.length - 1];

        stack.cards.forEach((card) => {
            this.tweens.killTweensOf(card);

            // Координати
            if (card.homeX !== undefined) {
                card.x = card.homeX;
                card.y = card.homeY;
                card.rotation = stack.rotation || 0;
            }

            if (stack.type === 'foundation' && this.foundationLayer) {
                this.foundationLayer.add(card);
            } else if (stack.type === 'tableau' && this.tableauLayer) {
                this.tableauLayer.add(card);
            } else {
                // Фолбек, якщо шарів немає (наприклад, просто на сцену)
                this.add.existing(card);
            }

            // ВІЗУАЛ (Лице/Спина)
            if (stack.type === 'tableau') {
                if (card === topCard) {
                    // Верхня - відкрита
                    card.faceUp = true;
                    if (card.refresh) card.refresh();
                    else card.flipUp();
                    card.setInteractive();
                } else {

                    // Нижня - закрита
                    card.faceUp = false;
                    card.flipDown();
                    card.disableInteractive();
                }

            } else if (stack.type === 'foundation') {

                // Фондейшн - завжди відкритий
                card.faceUp = true;
                if (card.refresh) card.refresh();
                card.disableInteractive();
            }

            // Робимо видимим
            card.setVisible(true);
            card.setAlpha(1);
        });
    });

    // --- ЕТАП 3: ОЧИЩЕННЯ КОЛОДИ (Прибираємо жертв) ---
    if (this.deck && this.deck.cards) {
        this.deck.cards.forEach(card => {
            // Перевіряємо, чи ця карта часом не на столі (подвійна перевірка)
            const isOnBoard = allStacks.some(s => s.cards.includes(card));

            if (!isOnBoard) {
                this.tweens.killTweensOf(card);
                card.setVisible(false);
                card.x = -5000; // Ховаємо далеко
                card.disableInteractive();

                // Якщо карта лежить у шарі - прибираємо її звідти, щоб не заважала
                if (card.parentContainer) {
                    card.parentContainer.remove(card);
                }
            }
        });
    }

    // Сортування порядку відображення
    if (this.sortDisplayOrder) this.sortDisplayOrder();
    console.log(" Visuals enforced. Cards returned to Layers.");
}
}