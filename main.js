import GameScene from './scenes/Game.js'

new Phaser.Game({
    type: Phaser.AUTO,
    width: 1980,
    height: 1080,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: GameScene
});