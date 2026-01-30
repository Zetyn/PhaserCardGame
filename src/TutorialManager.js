export default class TutorialManager {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentStepIndex = 0;
        this.scenario = 'cards';
        
        // UI елементи
        this.uiContainer = null;
        this.arrow = null;
        this.textPanel = null;
        this.messageText = null;
        this.highlightGraphics = null;

        // --- СЦЕНАРІЙ 1: КАРТИ (Level 1, Round 1) ---
        // action: 'pick' (взяти) або 'drop' (покласти)
        this.stepsCards = [
            // --- STEP 1: Queen Clubs -> King Clubs ---
            {
                id: 1,
                action: 'pick',
                card: { suit: 'clubs', value: 12, tag: 'q_clubs' }, // Queen
                text: "IN THE LEFT PILES\nCARDS OF THE SAME SUIT\nAND LOWER IN VALUEBY ONE\nCAN BE PLACED ON EACH OTHER.\nPICK UP THE QUEEN OF CLUBS.",
                arrowOffset: { x: -20, y: 100 },
                highlightFoundation: false,
                rotation: 90,
                panelOffset: { x: -200, y: -130 }
            },
            {
                id: 1,
                action: 'drop',
                targetCard: { suit: 'clubs', value: 13, tag: 'k_clubs' }, // King
                text: "PLACE IT ON THE KING OF CLUBS.",
                searchZone: 'foundation',
                arrowOffset: { x: 20, y: -130 },
                highlightFoundation: true,
                rotation: 270, 
                panelOffset: { x: 500, y: -150 }
            },

            // --- STEP 2: Jack Clubs -> Queen Clubs ---
            {
                id: 2,
                action: 'pick',
                card: { suit: 'clubs', value: 11, tag: 'j_clubs' }, // Jack
                text: "PICK UP THE JACK OF CLUBS.",
                arrowOffset: { x: -20, y: 100 },
                highlightFoundation: false,
                rotation: 90, 
                panelOffset: { x: -100, y: -130 }
            },
            {
                id: 2,
                action: 'drop',
                targetCard: { suit: 'clubs', value: 12, tag: 'q_clubs' }, // Queen
                text: "PLACE IT ON THE QUEEN OF CLUBS.",
                arrowOffset: { x: 20, y: -130 },
                searchZone: 'foundation',
                highlightFoundation: true,
                rotation: 270, 
                panelOffset: { x: 500, y: -150 }
            },

            // --- STEP 3: Two Hearts -> Ace Hearts (Foundation) ---
            {
                id: 3,
                action: 'pick',
                card: { suit: 'hearts', value: 2, tag: 'two_hearts' }, 
                text: "IN THE RIGHT PILES\nCARDS OF THE SAME SUIT AND HIGHER IN VALUE\nBY ONE CAN BE PLACED ON EACH OTHER.\nPICK UP THE TWO OF HEARTS.",
                arrowOffset: { x: -25, y: 100 },
                highlightFoundation: false,
                rotation: 90, 
                panelOffset: { x: 0, y: -130 }
            },
            {
                id: 3,
                action: 'drop',
                targetCard: { suit: 'hearts', value: 1 }, // Ace (Foundation)
                text: "PLACE IT ON THE ACE OF HEARTS.",
                arrowOffset: { x: 25, y: -130 },
                searchZone: 'foundation',
                highlightFoundation: true,
                rotation: 270, 
                panelOffset: { x: -380, y: -150 }
            },

            // --- STEP 4: Jack Spades -> Ten Spades ---
            {
                id: 4,
                action: 'pick',
                card: { suit: 'spades', value: 11, tag: 'j_spades' }, // Jack
                text: "IN THE TOP PILES CARDS OF THE SAME SUIT\nAND EITHER HIGHER OR LOWER IN VALUE\nBY ONE CAN BE PLACED. PICK UP THE JACK OF SPADES.",
                arrowOffset: { x: -25, y: 100 },
                highlightFoundation: false,
                rotation: 90, 
                panelOffset: { x: 200, y: -130 }
            },
            {
                id: 4,
                action: 'drop',
                targetCard: { suit: 'spades', value: 10, tag: 'ten_spades' }, // Ten
                text: "PLACE IT ON THE TEN OF SPADES.",
                arrowOffset: { x: -25, y: 100 },
                searchZone: 'stack',
                highlightFoundation: true,
                rotation: 90, 
                panelOffset: { x: 100, y: -130 }
            },

            // --- STEP 5: Freed 3 Hearts -> 2 Hearts ---
            {
                id: 5,
                action: 'pick',
                card: { suit: 'hearts', value: 3, tag: 'three_hearts' },
                text: "THIS FREED THE THREE OF HEARTS!\nPICK IT UP.",
                arrowOffset: { x: -25, y: 100 },
                //explicitPosition: { x: 1226, y: 548 },  
                highlightFoundation: false,
                rotation: 90, 
                panelOffset: { x: 200, y: -130 }
            },
            {
                id: 5,
                action: 'drop',
                targetCard: { suit: 'hearts', value: 2, tag: 'two_hearts' },
                text: "PLACE IT ON THE TWO OF HEARTS.",
                arrowOffset: { x: 25, y: -130 },
                searchZone: 'foundation',
                highlightFoundation: true,
                rotation: 270, 
                panelOffset: { x: -380, y: -150 }
            },

            // --- FINISH ---
            {
                id: 99,
                action: 'info',
                text: "CONTINUE TO TRANSFER CARDS INTO THE LOWER PILES.\nWHEN NO CARDS LEFT IN THE TOP PILES\nYOU HAVE WON!",
                isFinal: true
            }
        ];
        // --- СЦЕНАРІЙ 2: БОНУСИ (Level 1, Round 2) ---
        this.stepsPowerups = [
            {
                id: 1,
                action: 'click_ui', 
                targetBtn: 'magic', 
                text: "USE MAGIC WAND TO PULL\nTHE NECESSARY CARD.",
                arrowOffset: { x: 30, y: -95 },
                panelOffset: { x: -500, y: -120 },
                rotation: 270 
            },
            {
                id: 2,
                action: 'click_ui',
                targetBtn: 'joker',
                text: "USE JOKER TO PULL\nEIGHT CARDS!",
                arrowOffset: { x: 30, y: -95 },
                panelOffset: { x: -500, y: -120 },
                rotation: 270
            },
            {
                id: 3,
                action: 'info',
                text: "USE THOSE POWERS WHEN YOU CAN'T\nFIND THE CORRECT MOVE OR TO GAIN\nAN EDGE OVER THE OPPONENTS.",
                isFinal: true,
                panelOffset: { x: 0, y: 0 } // По центру
            }
        ];
        this.steps = this.stepsCards;
    }

    setScenario(type) {
        this.scenario = type;
        if (type === 'powerups') {
            this.steps = this.stepsPowerups;
        } else {
            this.steps = this.stepsCards;
        }
    }

start() {
        this.isActive = true;
        
        //this.scene.setTutorialVisuals(true);
        
        this.createUI();
        this.showStep(0);
    }


    createUI() {
        this.uiContainer = this.scene.add.container(0, 0).setDepth(40000); // Дуже високо

        // 1. Графіка для підсвітки (обводки)
        this.highlightGraphics = this.scene.add.graphics();
        this.uiContainer.add(this.highlightGraphics);

        this.textPanel = this.scene.add.sprite(0, 0, 'common1', 'magic_hint_bg');
        this.textPanel.setScale(1.6);       
        // 3. Текст
        this.messageText = this.scene.add.text(0, -10, "", {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#000000', // Темний текст на світлому фоні
            align: 'center',
            wordWrap: { width: 340 },
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 4. Стрілка
        this.arrow = this.scene.add.sprite(0, 0, 'common1', 'tutorial_arrow');
        this.arrow.setOrigin(0.5, 1); // Якір внизу стрілки (вістря)

        // Додаємо в контейнер
        this.uiContainer.add([this.textPanel, this.messageText, this.arrow]);

        // Спочатку ховаємо
        this.uiContainer.setVisible(false);
    }

   showStep(index) {
        if (index >= this.steps.length) {
            this.endTutorial();
            return;
        }

        this.currentStepIndex = index;
        const step = this.steps[index];
        this.uiContainer.setVisible(true);

        this.messageText.setText(step.text);
        const centerX = this.scene.scale.width / 2;
        const defaultBaseY = this.scene.scale.height / 2 + 200; 
        
        const panelX = centerX + (step.panelOffset?.x || 0);
        const panelY = defaultBaseY + (step.panelOffset?.y || 0);

        // Фінал
        if (step.isFinal) {
            this.arrow.setVisible(false);
            this.highlightGraphics.clear();
            this.textPanel.setPosition(centerX, this.scene.scale.height / 2);
            this.messageText.setPosition(centerX, this.scene.scale.height / 2 - 10);
            this.scene.time.delayedCall(5000, () => this.endTutorial());
            return;
        }

        this.textPanel.setPosition(panelX, panelY);
        this.messageText.setPosition(panelX, panelY - 10);

        // 2. ПОЗИЦІЯ СТРІЛКИ
        let targetX = 0;
        let targetY = 0;
        let showArrow = false;

        // --- ВАРІАНТ А: Клік по UI (Кнопки) ---
        if (step.action === 'click_ui') {
            let btnObj = null;
            if (step.targetBtn === 'magic') btnObj = this.scene.magicBg;
            if (step.targetBtn === 'joker') btnObj = this.scene.jokerBg; 

            if (btnObj) {
                this.scene.highlightButtonForTutorial(btnObj);

                // Отримуємо глобальні координати кнопки
                const matrix = btnObj.getWorldTransformMatrix();
                const btnX = matrix.tx;
                const btnY = matrix.ty;

                targetX = btnX + (step.arrowOffset?.x || 0);
                targetY = btnY + (step.arrowOffset?.y || 0);

                showArrow = true;
                
                this.highlightGraphics.clear();
                this.highlightGraphics.lineStyle(5, 0x00ff00, 1);
                this.highlightGraphics.strokeCircle(btnX, btnY, 50);
            }
        }
        // --- ВАРІАНТ Б: Карти (Pick / Drop) ---
        else {
            let targetObj = null;
            if (step.action === 'pick') {
                //  Передаємо step.card.tag
                targetObj = this.findCard(step.card.value, step.card.suit, step.searchZone, step.card.tag);
            } else if (step.action === 'drop') {
                //  Передаємо step.targetCard.tag
                targetObj = this.findCard(step.targetCard.value, step.targetCard.suit, step.searchZone, step.targetCard.tag);
            }

            if (targetObj) {
                const matrix = targetObj.getWorldTransformMatrix();
                
                // tx і ty — це фінальні координати на екрані
                targetX = matrix.tx;
                targetY = matrix.ty;

                // Додаємо офсет зі сценарію
                targetX += (step.arrowOffset?.x || 0);
                targetY += (step.arrowOffset?.y || 0);
                
                showArrow = true;
                this.drawHighlights(step);
            }
        }

        // 3. Анімація стрілки
        if (showArrow) {
            this.arrow.setVisible(true);
            this.arrow.x = targetX;
            this.arrow.y = targetY;
            this.arrow.setAngle(step.rotation || 0);

            if (this.arrowTween) {
                this.arrowTween.stop();
                this.arrowTween = null; 
            }

            // Напрямок руху залежить від повороту
            let props = {};
            if (step.rotation === 90 || step.rotation === 270) { 
                 props.y = '+=15';
            }

            this.arrowTween = this.scene.tweens.add({
                targets: this.arrow,
                ...props,
                yoyo: true,
                repeat: -1,
                duration: 600,
                ease: 'Sine.easeInOut'
            });
        } else {
            this.arrow.setVisible(false);
            this.highlightGraphics.clear();
        }
    }

drawHighlights(step) {
        this.highlightGraphics.clear();
        if (!step.highlightFoundation) return;

        this.highlightGraphics.lineStyle(5, 0x00ff00, 1); 

        // Логіка для Тузів (Value 1) - шукаємо слот
        if (step.targetCard && step.targetCard.value === 1) {
            let targetStack = this.scene.foundation.find(s => s.cards.some(c => c.suit === step.targetCard.suit));
            // Якщо ще немає, беремо перший пустий
            if (!targetStack) {
                targetStack = this.scene.foundation.find(s => s.cards.length === 0);
            }
            if (targetStack) {
                this.highlightGraphics.strokeRoundedRect(targetStack.x - 55, targetStack.y - 75, 110, 150, 10);
            }
        }
        // Логіка для інших карт (Король і т.д.)
        else if (step.targetCard) {
             // Шукаємо стек, де лежить ця карта
             const targetCardObj = this.findCard(step.targetCard.value, step.targetCard.suit, 'foundation');
             if (targetCardObj && targetCardObj.sourceStack) {
                 const s = targetCardObj.sourceStack;
                 this.highlightGraphics.strokeRoundedRect(s.x - 55, s.y - 75, 110, 150, 10);
             }
        }
    }

    findCard(value, suit, searchZone = 'all', tag = null) {
        let stacksToSearch = [];
        if (searchZone === 'foundation') stacksToSearch = this.scene.foundation;
        else if (searchZone === 'tableau') stacksToSearch = this.scene.tableau;
        else stacksToSearch = [...this.scene.tableau, ...this.scene.foundation];

        for (let stack of stacksToSearch) {
            // 1. Знаходимо ВСІ карти, що підходять за номіналом
            const candidates = stack.cards.filter(c => c.value === value && c.suit === suit);
            
            if (tag) {
                // 2. Якщо шукаємо конкретний тег — беремо тільки "мічену" карту
                const match = candidates.find(c => c.tutorialTag === tag);
                if (match) return match;
            } else {
                // 3. Якщо тегу немає — повертаємо першу знайдену (як раніше)
                if (candidates.length > 0) return candidates[0];
            }
        }
        return null;
    }
    validateDrop(draggedCard, targetStack) {
        if (!this.isActive) return true; // Якщо туторіал вимкнено — можна все

        const step = this.steps[this.currentStepIndex];

        // Якщо зараз крок "PICK" (взяти), то класти (успішно завершувати хід) не можна нікуди.
        // (Хіба що повернути карту назад, але це обробляється як "не placed")
        if (step.action === 'pick') {
            return false;
        }

        // Якщо зараз крок "DROP" (покласти)
        if (step.action === 'drop') {

            if (step.searchZone) {
                // Приводимо до спільного знаменника:
                // Якщо в конфігу написано 'stack', ми вважаємо це за 'tableau'
                let requiredType = step.searchZone;
                if (requiredType === 'stack') requiredType = 'tableau';

                // Якщо тип стопки, куди кладемо, не співпадає з вимогою - БЛОКУЄМО
                if (targetStack.type !== requiredType) {
                    console.log(` Tutorial: Wrong Zone! Expected ${requiredType}, got ${targetStack.type}`);
                    return false;
                }
            }
            
            // 1. Спец-випадок: Туз на порожню фундацію
            if (step.targetCard.value === 1 && targetStack.type === 'foundation') {
                 
                 if (targetStack.cards.length === 0) return true;
            }

            // 2. Звичайний випадок: Кладемо на конкретну карту (наприклад, Даму на Короля)
            const topCard = targetStack.top();
            
            // Якщо стопка пуста (і це не туз), то ми не можемо покласти "на карту"
            if (!topCard) return false;

            // Порівнюємо верхню карту стопки з ціллю в туторіалі
            if (topCard.value === step.targetCard.value && topCard.suit === step.targetCard.suit) {
                return true; // Це те місце!
            }
        }

        return false; // Всі інші місця заборонені
    }
    onDragStart(card) {
        if (!this.isActive) return;
        const currentStep = this.steps[this.currentStepIndex];
        if (currentStep.action === 'pick') {
            if (card.value === currentStep.card.value && card.suit === currentStep.card.suit) {
                this.showStep(this.currentStepIndex + 1);
            }
        }
    }

    onCardPlaced(card, targetStack) {
        if (!this.isActive) return;
        const currentStep = this.steps[this.currentStepIndex];
        if (currentStep.action === 'drop') {
            // Перевірка (спрощена, довіряємо механіці гри)
            this.showStep(this.currentStepIndex + 1);
        }
    }
    
    onMoveCancelled() {
        if (!this.isActive) return;
        const indexAtStart = this.currentStepIndex;
        const currentStep = this.steps[indexAtStart];
        
        if (currentStep.action === 'drop') {
            this.scene.time.delayedCall(200, () => {
                if (this.isActive && this.currentStepIndex === indexAtStart) {
                     this.showStep(this.currentStepIndex - 1);
                }
            });
        }
    }
    onUIButtonClicked(btnName) {
        if (!this.isActive) return;
        const step = this.steps[this.currentStepIndex];

        // Якщо ми чекаємо клік по UI і назва співпала
        if (step.action === 'click_ui' && step.targetBtn === btnName) {
            // Йдемо далі
            this.showStep(this.currentStepIndex + 1);
        }
    }

   endTutorial() {
        this.isActive = false;
        if (this.onComplete) this.onComplete(); // Викликаємо колбек завершення
        if (this.uiContainer) this.uiContainer.destroy();
        this.scene.setTutorialVisuals(false); // Розблоковуємо все
    }
}