export default class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelSelectScene' });
    }

    init(data) {
        this.animateFromLevel = data.animateFromLevel || null;
        console.log('LevelSelectScene init data:', data); // <-- Перевір консоль
    }

    preload() {
        this.load.atlas(
            'common1', 
            'assets/common1.png', 
            'assets/common1.json'
        );
        this.load.atlas('common2', 
            'assets/common2.png', 
            'assets/common2.json'
        );
        this.load.image('map1', 'assets/map1.jpg'); // Фон
    }

    create() {
        // 1. Фон
        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'map1');
        bg.setDisplaySize(this.scale.width, this.scale.height);
    
        // 2. Прогрес
        const maxLevel = parseInt(localStorage.getItem('solitaire_max_level')) || 1;

        // 3. КООРДИНАТИ ШЛЯХУ
        const fixedPositions = [
            { x: 503, y: 672 }, // Level 1 
            { x: 427, y: 625 }, // Level 2
            { x: 338, y: 571 }, // Level 3
            { x: 267, y: 530 }, // Level 4
            { x: 189, y: 480 }, // Level 5 
            { x: 253, y: 434 }, // Level 6
            { x: 335, y: 385 }, // Level 7
            { x: 411, y: 338 }, // Level 8 
            { x: 479, y: 298 }, // Level 9
            { x: 550, y: 260  }, // Level 10
            { x: 630, y: 299 }, // Level 11 
            { x: 695, y: 335 }, // Level 12
            { x: 758, y: 374 }, // Level 13
            { x: 821, y: 406 }, // Level 14
            { x: 885, y: 445 }, // Level 15
            { x: 964, y: 404 }, // Level 16
            { x: 1030, y: 366 }, // Level 17
            { x: 1105, y: 325 }, // Level 18
            { x: 1173, y: 281 }, // Level 20
            { x: 1253, y: 240 }   // Level 20
        ];

        const totalLevels = fixedPositions.length; // Або 20, але краще брати довжину масиву
        
        this.levelPositions = [];
        this.levelContainers = [];

        // 4. Генерація кнопок по масиву
        for (let i = 0; i < totalLevels; i++) {
            const levelNum = i + 1; // Рівень 1, 2, 3...
            const pos = fixedPositions[i]; // Координати {x, y}

            const isPassed = levelNum < maxLevel;
            let isActive = levelNum === maxLevel;
            let isLocked = levelNum > maxLevel;

            if (this.animateFromLevel && levelNum === maxLevel) {
                isLocked = true;
                isActive = false;
            }

            // Зберігаємо позиції (вони потрібні для аватара)
            this.levelPositions.push({ x: pos.x, y: pos.y });

            // Створюємо кнопку
            const btnContainer = this.createLevelButton(pos.x, pos.y, levelNum, isPassed, isActive, isLocked);
            this.levelContainers.push(btnContainer);        
        }

        this.createAvatar(maxLevel);
        this.createContinueButton(maxLevel);
    }

    createContinueButton(maxLevel) {
        const x = this.scale.width / 2;
        const y = this.scale.height - 40; // Відступ 80 пікселів від низу

        const container = this.add.container(x, y);

        // 1. Фон кнопки (Зелена)
        const btnBg = this.add.image(0, 0, 'common1', 'but_blue_out');
        // Якщо кнопка занадто велика, можна трохи зменшити
        btnBg.setScale(1.1); 

        // 2. Текст "CONTINUE"
        const btnText = this.add.text(0, 0, 'CONTINUE', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        container.add([btnBg, btnText]);

        // 3. Інтерактивність
        btnBg.setInteractive({ useHandCursor: true });

        // Наведення (Hover)
        btnBg.on('pointerover', () => {
            btnBg.setFrame('but_blue_over');
            // Легке збільшення контейнера для ефекту
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 100
            });
        });

        // Курсор пішов (Out)
        btnBg.on('pointerout', () => {
            btnBg.setFrame('but_blue_out');
            // Повернення розміру
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 100
            });
        });

        // Натискання (Click)
        btnBg.on('pointerdown', () => {
            // Анімація натискання
            this.tweens.add({
                targets: container,
                scale: 0.95,
                yoyo: true,
                duration: 50,
                onComplete: () => {
                    // Запускаємо гру на останньому відкритому рівні
                    console.log(`Continuing to Level ${maxLevel}`);
                    this.startMatchmaking(maxLevel);
                }
            });
        });
        
        // Можна додати легку анімацію появи кнопки при старті сцени
        container.setAlpha(0);
        container.y += 50;
        this.tweens.add({
            targets: container,
            alpha: 1,
            y: y,
            duration: 500,
            ease: 'Back.out',
            delay: 200 // Трохи пізніше за кнопки рівнів
        });
    }

    createAvatar(currentMaxLevel) {
        if (this.levelPositions.length === 0) return;

        // 1. Визначаємо, де аватар має З'ЯВИТИСЯ (Старт)
        // За замовчуванням - на поточному максимумі
        let startLevelIndex = currentMaxLevel - 1; 
        let shouldAnimate = false;

        // Якщо нам передали "анімувати з попереднього рівня"
        if (this.animateFromLevel && this.animateFromLevel < currentMaxLevel) {
             startLevelIndex = this.animateFromLevel - 1; 
             shouldAnimate = true;
        }

        // Захист від виходу за межі масиву
        const safeIndex = Math.min(Math.max(0, startLevelIndex), this.levelPositions.length - 1);
        const startPos = this.levelPositions[safeIndex];

        const avatarYOffset = 60;
        
        // 2. Створюємо аватара на СТАРТОВІЙ позиції
        const avatarContainer = this.add.container(startPos.x, startPos.y - avatarYOffset);
        avatarContainer.setDepth(100); 

        const avatarImg = this.add.image(0, 0, 'common1', 'user0').setScale(0.7);
        const avatarFrame = this.add.image(0, 0, 'common1', 'ava_competitor_player').setScale(1.2);
        avatarContainer.add([avatarImg, avatarFrame]);

        // Анімація дихання
        this.tweens.add({
            targets: avatarContainer, scale: 1.05, yoyo: true, duration: 800, repeat: -1, ease: 'Sine.easeInOut'
        });

        // 3. Якщо треба - запускаємо політ до НОВОГО рівня
        if (shouldAnimate) {
            // Цільова позиція (наступний рівень)
            const targetIndex = safeIndex + 1; 
            
            if (targetIndex < this.levelPositions.length) {
                const targetPos = this.levelPositions[targetIndex];
                const finalX = targetPos.x;
                const finalY = targetPos.y - avatarYOffset;

                this.tweens.add({
                    targets: avatarContainer,
                    x: finalX,
                    y: finalY,
                    duration: 1500,
                    ease: 'Power2.easeInOut',
                    delay: 500,
                    onComplete: () => {
                        this.unlockLevelButton(currentMaxLevel);
                    }
                });
            }
        }
    }

    unlockLevelButton(levelIndex) {
        // Індекс в масиві = levelIndex - 1
        const arrayIndex = levelIndex - 1;
        
        // 1. Знищуємо стару (закриту) кнопку
        const oldContainer = this.levelContainers[arrayIndex];
        if (oldContainer) oldContainer.destroy();

        // 2. Беремо координати
        const pos = this.levelPositions[arrayIndex];

        // 3. Створюємо нову (АКТИВНУ) кнопку
        // createLevelButton(x, y, level, isPassed, isActive, isLocked)
        const newContainer = this.createLevelButton(pos.x, pos.y, levelIndex, false, true, false);
        
        // 4. Оновлюємо посилання в масиві
        this.levelContainers[arrayIndex] = newContainer;

        // Можна додати ефект появи (спалах або scale up)
        newContainer.setScale(0);
        this.tweens.add({
            targets: newContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.out'
        });
    }

    createLevelButton(x, y, level, isPassed, isActive, isLocked) {
        const scale = 1.2; 
        const container = this.add.container(x, y);

        // --- 1. ВИЗНАЧЕННЯ ІКОНКИ ---
        let iconFrameName = '';
        if (isLocked) {
            iconFrameName = 'level_item_forward'; // Тепер це іконка для закритих
        } else if (isActive) {
            iconFrameName = 'level_item_active';
        } else if (isPassed) {
            iconFrameName = 'level_item_passed';
        }

        // --- 2. СТВОРЕННЯ ОБ'ЄКТІВ ---

        // ШАР 1: ФОН (Завжди однаковий для всіх при старті)
        const bg = this.add.image(0, 0, 'common1', 'level_item_bg_out');
        bg.setScale(scale);
        container.add(bg);

        // ШАР 2: ІКОНКА (Накладається зверху)
        if (iconFrameName) {
            const icon = this.add.image(0, 0, 'common1', iconFrameName);
            icon.setScale(scale);
            container.add(icon);
        }

        // ШАР 3: ТЕКСТ (Номер рівня)
        const textConfig = {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: isLocked ? '#888888' : (isPassed ? '#FFEE88' : '#ffffff'),
            stroke: '#000000',
            strokeThickness: 3
        };

        const text = this.add.text(0, -2, level.toString(), textConfig).setOrigin(0.5);
        container.add(text);

        // --- 3. ІНТЕРАКТИВНІСТЬ ---
        
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            // Збільшуємо всю кнопку
            this.tweens.add({
                targets: container,
                scale: 1.1,
                duration: 100
            });

            // Тепер ВСІ кнопки при наведенні змінюють фон на 'over'
            bg.setFrame('level_item_bg_over');
        });

        bg.on('pointerout', () => {
            // Повертаємо розмір
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 100
            });

            // Повертаємо стандартний фон 'out'
            bg.setFrame('level_item_bg_out');
        });

        bg.on('pointerdown', () => {
            if (isLocked) {
                // Візуальний відгук "зачинено" (тряска)
                this.tweens.add({
                    targets: container,
                    x: x + 4,
                    yoyo: true,
                    duration: 50,
                    repeat: 2,
                    onComplete: () => container.x = x
                });
                return;
            }

            // Анімація кліку для відкритих рівнів
            this.tweens.add({
                targets: container,
                scale: 0.9,
                yoyo: true,
                duration: 50,
                onComplete: () => {
                    this.startMatchmaking(level);
                }
            });
        });

        return container;
    }

    startMatchmaking(levelToStart) {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.botPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        Phaser.Utils.Array.Shuffle(this.botPool);

        // 1. Блокуємо екран
        const blocker = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
        blocker.setInteractive();
        blocker.setDepth(30000);

        // 2. Контейнер пошуку
        const popup = this.add.container(cx, cy);
        popup.setDepth(30001);

        // 3. Фон
        const bg = this.add.image(0, 0, 'common2', 'win_bg_big'); 
        popup.add(bg);

        const panel1 = this.add.image(0, 210, 'common1', 'panel1');
        popup.add(panel1);

        const loadingText = this.add.text(0, 210, 'WAITING FOR THE PARTICIPANTS...', {
             fontFamily: 'Arial', fontSize: '24px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5);
        popup.add(loadingText);

        // 4. Текст
        const title = this.add.text(0, -255, 'KNOCKOUT TOURNAMENT', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        popup.add(title);

        const miniCupBtnX = -410; 
        const miniCupBtnY = -250; 

        const miniCupContainer = this.add.container(miniCupBtnX, miniCupBtnY);
        const miniCupBg = this.add.image(0, 0, 'common2', 'icon_bg');
        const miniCupIcon = this.add.image(0, 0, 'common2', 'cup_ico');
        miniCupContainer.add([miniCupBg, miniCupIcon]);
        popup.add(miniCupContainer);

        const cup = this.add.image(0, -100, 'common2', 'cup_tournament');
        cup.setScale(0.9);
        popup.add(cup);

        // --- АВАТАРИ ---
        const spacing = 280; 
        
        const playerNode = this.createMatchAvatar(0, 0, 'user0', true);
        playerNode.container.setPosition(-spacing, 100);
        popup.add(playerNode.container);

        const bot1Node = this.createMatchAvatar(0, 0, null, false);
        bot1Node.container.setPosition(0, 100);
        popup.add(bot1Node.container);

        const bot2Node = this.createMatchAvatar(0, 0, null, false);
        bot2Node.container.setPosition(spacing, 100);
        popup.add(bot2Node.container);

        this.matchData = {
            player: { 
                name: 'YOU', 
                avatar: 'user0', 
                frame: 'ava_competitor_player' 
            },
            opponents: [] // Сюди додамо ботів у revealOpponent
        };


        // --- ЛОГІКА ТАЙМЕРІВ (Зберігаємо їх у змінні!) ---
        
        // Таймер 1: Знаходимо першого бота
        const timer1 = this.time.delayedCall(1000, () => {
            this.revealOpponent(bot1Node, 1);
        });

        // Таймер 2: Знаходимо другого бота
        const timer2 = this.time.delayedCall(2500, () => {
            this.revealOpponent(bot2Node, 2);
        });

        // Таймер 3: Старт гри
        const startTimer = this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: popup,
                scale: 1.2,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    // Передаємо об'єкт matchData разом із рівнем
                    this.scene.start('GameScene', { 
                        level: levelToStart,
                        matchData: this.matchData 
                    });
                }
            });
        });

        // --- КНОПКА ЗАКРИТТЯ (ХРЕСТИК) ---
        const closeBtnX = 410; 
        const closeBtnY = -250; 

        const closeContainer = this.add.container(closeBtnX, closeBtnY);

        // 1. Фон кнопки
        const closeBg = this.add.image(0, 0, 'common1', 'but_out');

        // 2. Іконка
        const closeIcon = this.add.image(0, 0, 'common1', 'icon_close');
        
        closeContainer.add([closeBg, closeIcon]);
        popup.add(closeContainer);

        // Інтерактивність
        closeBg.setInteractive({ useHandCursor: true });

        closeBg.on('pointerover', () => {
            closeBg.setFrame('but_over');
            this.tweens.add({ targets: closeContainer, scale: 1.1, duration: 100 });
        });
        
        closeBg.on('pointerout', () => {
            closeBg.setFrame('but_out');
            this.tweens.add({ targets: closeContainer, scale: 1, duration: 100 });
        });

        // КЛІК НА ЗАКРИТТЯ
        closeBg.on('pointerdown', () => {
            // ВАЖЛИВО: Скасовуємо таймери, щоб гра не почалась сама собою!
            timer1.remove();
            timer2.remove();
            startTimer.remove();

            // Анімація закриття
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

        // --- АНІМАЦІЯ ПОЯВИ ---
        popup.setScale(0);
        this.tweens.add({
            targets: popup, scale: 1, duration: 400, ease: 'Back.out'
        });
    }

    // Допоміжний метод для створення заготовки аватара
    createMatchAvatar(x, y, userImage, isPlayer) {
        const container = this.add.container(x, y);

        //  НАЛАШТУВАННЯ ПОЗИЦІЙ
        const avatarOffsetY = -10; 

        // 1. ОСНОВА (фон)        
        const bg = this.add.image(0, avatarOffsetY, 'common1', 'competitor_bg'); 
        bg.setScale(2);
        container.add(bg);
        
        // ВАЖЛИВО: Зберігаємо посилання на фон, щоб потім керувати шарами
        container.bgSprite = bg;

        // 2. КАРТИНКА ЮЗЕРА / ЗНАК ПИТАННЯ        
        let userIcon = null;
        
        if (isPlayer) {
            userIcon = this.add.image(0, avatarOffsetY, 'common1', userImage);
            userIcon.setScale(1.2);
            container.add(userIcon);
        } else {
            const qMark = this.add.text(0, avatarOffsetY, '?', { 
                fontSize: '48px', 
                fontStyle: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);
            container.add(qMark);
            container.qMark = qMark;
        }

        // 3. РАМКА (ЗАВЖДИ ЗВЕРХУ!)        
        const frameName = isPlayer ? 'ava_competitor_player' : 'ava_competitor'; 
        const frame = this.add.image(0, avatarOffsetY, 'common1', frameName);
        frame.setScale(2);
        container.add(frame);
        
        //  ЗБЕРІГАЄМО ПОСИЛАННЯ на рамку
        container.frameSprite = frame;

        // 4. ПІДПИС        
        const nameText = this.add.text(0, 60, isPlayer ? 'YOU' : 'SEARCHING...', {
            fontFamily: 'Arial', 
            fontSize: '20px', 
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(nameText);
        
        // Зберігаємо посилання на текст
        container.nameText = nameText;

        // 5. АНІМАЦІЯ ПОШУКУ (тільки для ботів)        
        if (!isPlayer) {
            this.tweens.add({
                targets: container,
                scale: 0.95,
                yoyo: true,
                duration: 600,
                repeat: -1
            });
        }

        return { container, bg, frame, nameText };
    }

    //  МЕТОД ЗНАХОДЖЕННЯ БОТА
    revealOpponent(node, botIndex) {
        const container = node.container;
        const avatarOffsetY = -10; 

        this.tweens.killTweensOf(container);
        container.setScale(1); 

        this.tweens.add({
            targets: container,
            scaleX: 0, 
            duration: 150,
            yoyo: true,
            onYoyo: () => {
                if (container.qMark) {
                    container.qMark.destroy();
                    container.qMark = null;
                }

                // .shift() забирає перший елемент масиву і видаляє його звідти
                const randomId = this.botPool.shift(); 
                const userKey = `user${randomId}`; 
                const botName = `PLAYER ${Math.floor(Math.random() * 900) + 100}`;
                this.matchData.opponents.push({
                    name: botName,
                    avatar: userKey,
                    frame: 'ava_competitor'
                });
                try {
                    const newIcon = this.add.image(0, avatarOffsetY, 'common1', userKey);
                    newIcon.setScale(1.2); 
                    container.add(newIcon);
                    
                    // ПРИМУСОВЕ СОРТУВАННЯ ШАРІВ (без змін)
                    if (container.bgSprite) container.sendToBack(container.bgSprite);
                    if (container.frameSprite) container.bringToTop(container.frameSprite);
                    if (container.nameText) container.bringToTop(container.nameText);
                    
                } catch (e) {
                    console.error("Error loading bot avatar:", e);
                }

                node.nameText.setText(botName);
                node.nameText.setColor('#ffff00'); 
            }
        });
    }
}