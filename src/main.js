import LevelSelectScene from './scenes/LevelSelectScene.js';
import GameScene from './scenes/Game.js'

new Phaser.Game({
    type: Phaser.AUTO,
    width: 1400,
    height: 800,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [LevelSelectScene, GameScene]
});