export default class Card extends Phaser.GameObjects.Container {
    static SCALE = 1.3;
    
    // 🎯 Константи для мапінгу (виносимо з методів)
    static SUIT_TO_MINI_ICON = {
        'hearts': 3,
        'diamonds': 2,
        'clubs': 1,
        'spades': 0
    };

    static VALUE_TO_TEXT = {
        1: 'A',
        11: 'J',
        12: 'Q',
        13: 'K'
    };

    // Значення, які потребують окремого спрайта номіналу
    static FACE_CARDS = new Set([1, 11, 12, 13]);

    constructor(scene, x, y, suit, value) {
        super(scene, x, y);
        
        this.homeX = x;
        this.homeY = y;
        this.scene = scene;
        this.suit = suit;
        this.value = value;
        this.faceUp = true;
        this.sourceStack = null;

        // Кешуємо колір (червоний/чорний) для швидкого доступу
        this.isRed = (suit === 'hearts' || suit === 'diamonds');
        this.colorSuffix = this.isRed ? 'r' : 'b';

        this._buildCard();
        this._setupInteraction();

        scene.input.enableDebug(this); 

        scene.add.existing(this);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🏗️ ІНІЦІАЛІЗАЦІЯ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    _buildCard() {
        // Фон карти
        this.bg = this.scene.add.sprite(0, 0, 'common1', 'card_bg');
        
        // Основний спрайт карти
        const frameName = this._getMainFrameName();
        this.cardSprite = this.scene.add.sprite(0, 0, 'common1', frameName);
        
        this.add([this.bg, this.cardSprite]);

        // Кутові елементи (масть + номінал)
        this._addCornerElements();

        // Візуальне масштабування
        this.setScale(Card.SCALE);
        
        // Встановлюємо розмір для hitbox
        this.setSize(this.bg.width, this.bg.height);
    }

    _setupInteraction() {
        this.setInteractive({ useHandCursor: true });
        // Видали enableDebug - залиш його тільки для тестування
        // this.scene.input.enableDebug(this);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 ВІЗУАЛЬНІ ЕЛЕМЕНТИ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    _addCornerElements() {
        // Координати та розміри
        const config = {
            rank: { x: -26, y: -44, scale: 1 },
            suit: { x: 25, y: -44, scale: 0.8 }
        };

        // Маленька масть
        this._createMiniSuit(config.suit);

        // Номінал (тільки для A, J, Q, K)
        if (Card.FACE_CARDS.has(this.value)) {
            this._createRankElement(config.rank);
        }
    }

    _createMiniSuit({ x, y, scale }) {
        const suitIndex = Card.SUIT_TO_MINI_ICON[this.suit];
        const frameName = `lear_mini_${suitIndex}`;
        
        if (this.scene.textures.get('common1').has(frameName)) {
            this.miniSuitIcon = this.scene.add.sprite(x, y, 'common1', frameName)
                .setScale(scale);
            this.add(this.miniSuitIcon);
        }
    }

    _createRankElement({ x, y, scale }) {
        const spriteIndex = this._getCardSpriteIndex();
        const frameName = this._constructFrameName(spriteIndex, false);
        
        // Спробувати спрайт
        if (this.scene.textures.get('common1').has(frameName)) {
            this.rankSprite = this.scene.add.sprite(x, y, 'common1', frameName)
                .setScale(scale);
            this.add(this.rankSprite);
        } else {
            // Fallback на текст
            this._createRankText(x, y, scale);
        }
    }

    _createRankText(x, y, scale) {
        const text = Card.VALUE_TO_TEXT[this.value] || '';
        const color = this.isRed ? '#d40000' : '#000000';
        
        this.rankText = this.scene.add.text(x, y, text, {
            fontFamily: 'Arial',
            fontSize: '22px',
            fontStyle: 'bold',
            color: color
        })
        .setOrigin(0.5)
        .setScale(scale);
        
        this.add(this.rankText);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔄 ЛОГІКА ПЕРЕВЕРТАННЯ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    flipUp() {
        this.faceUp = true;
        this.bg.setFrame('card_bg');
        
        // Показуємо всі елементи, окрім фону
        this.each(child => {
            if (child !== this.bg) child.setVisible(true);
        });
    }

    flipDown() {
        this.faceUp = false;
        this.bg.setFrame('card_shirt');
        
        // Ховаємо всі елементи, окрім фону
        this.each(child => {
            if (child !== this.bg) child.setVisible(false);
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎯 ДОПОМІЖНІ МЕТОДИ (ПРИВАТНІ)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    _getCardSpriteIndex() {
        // Мапінг value -> sprite index
        const map = {
            1: 13,  // Ace
            2: 1,
            3: 2,
            4: 3,
            5: 4,
            6: 5,
            7: 6,
            8: 7,
            9: 8,
            10: 9,
            11: 10, // Jack
            12: 11, // Queen
            13: 12  // King
        };
        
        return map[this.value] ?? this.value;
    }

    _getMainFrameName() {
        const index = this._getCardSpriteIndex();
        return this._constructFrameName(index, true);
    }

    _constructFrameName(index, isMainImage) {
        // Великі карти (10+) мають підкреслення: card_11_r
        // Малі карти (1-9) БЕЗ підкреслення: card_1r
        if (isMainImage && index >= 10) {
            return `card_${index}_${this.colorSuffix}`;
        }
        return `card_${index}${this.colorSuffix}`;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 ВІЗУАЛЬНІ ЕФЕКТИ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    setTint(color) {
        this.cardSprite.setTint(color);
    }

    clearTint() {
        this.cardSprite.clearTint();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔄 ОНОВЛЕННЯ КАРТИ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    refresh() {
        // Оновлюємо основний спрайт
        this.cardSprite.setFrame(this._getMainFrameName());

        // Видаляємо старі кутові елементи
        [this.miniSuitIcon, this.rankSprite, this.rankText].forEach(el => {
            if (el) el.destroy();
        });

        // Створюємо нові
        this._addCornerElements();

        // Відновлюємо стан
        if (this.faceUp) {
            this.flipUp();
        } else {
            this.flipDown();
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📐 DEPRECATED (залишено для сумісності)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    getColorSuffix() {
        return this.colorSuffix;
    }

    getCardFrame() {
        return this._getMainFrameName();
    }
}