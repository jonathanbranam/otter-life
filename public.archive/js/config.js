// Phaser Game Configuration
const gameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 800,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 800
    },
    scene: [], // Will be populated with scenes
    input: {
        gamepad: true
    }
};

// Game constants
const GAME_CONSTANTS = {
    TILE_SIZE: 25,
    GRID_WIDTH: 32,
    GRID_HEIGHT: 32,
    MOVE_SPEED: 200,
    MOVE_DELAY: 150,
    JOYSTICK_THRESHOLD: 0.3
};
