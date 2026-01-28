import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { Player } from '../entities/Player';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    msg_text : Phaser.GameObjects.Text;
    quit_text : Phaser.GameObjects.Text;
    quit_bg : Phaser.GameObjects.Rectangle;
    grid: Phaser.GameObjects.Graphics;
    player: Player | null = null;
    showGrid: boolean = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.setupCamera();
        this.setupTitle();
        this.setupQuitButton();
        this.setupPlayer();
        this.setupGrid();
        this.setupKeyboardControls();
    }

    setupCamera ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x304030);
    }

    setupTitle ()
    {
        this.msg_text = this.add.text(SCREEN_WIDTH - 10, 40, "Otter's Life", {
            fontFamily: 'Arial', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'right'
        });
        this.msg_text.setOrigin(1, 0.5);
    }

    setupQuitButton ()
    {
        const buttonX = SCREEN_WIDTH - 10;
        const buttonY = 90;

        // Create background rectangle
        this.quit_bg = this.add.rectangle(buttonX, buttonY, 80, 40, 0x000000, 0.3);
        this.quit_bg.setOrigin(1, 0.5);
        this.quit_bg.setInteractive({ useHandCursor: true });

        // Create centered text within the rectangle
        this.quit_text = this.add.text(buttonX - 40, buttonY, 'Quit', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
            align: 'center'
        });
        this.quit_text.setOrigin(0.5);

        // Hover effects
        this.quit_bg.on('pointerover', () => {
            this.quit_bg.setFillStyle(0xffffff, 0.4);
            this.quit_text.setStyle({ color: '#ffff00' });
        });

        this.quit_bg.on('pointerout', () => {
            this.quit_bg.setFillStyle(0x000000, 0.3);
            this.quit_text.setStyle({ color: '#ffffff' });
        });

        // Click handler
        this.quit_bg.on('pointerdown', () => {
            this.scene.start('GameOver');
        });
    }

    setupPlayer ()
    {
        const centerX = SCREEN_WIDTH / 2;
        const centerY = SCREEN_HEIGHT / 2;
        this.player = new Player(this, centerX, centerY);
    }

    setupGrid ()
    {
        this.grid = this.add.graphics();
        this.grid.setDepth(1000);
        this.updateGrid();
    }

    setupKeyboardControls ()
    {
        const keyboard = this.input.keyboard;
        if (!keyboard) return;

        // Toggle grid with 'g' key
        keyboard.on('keydown-G', () => {
            this.showGrid = !this.showGrid;
            this.updateGrid();
        });

        // Arrow keys for player movement
        const moveDistance = 25; // One grid tile

        keyboard.on('keydown-UP', () => {
            if (this.player) this.player.move(0, -moveDistance);
        });

        keyboard.on('keydown-DOWN', () => {
            if (this.player) this.player.move(0, moveDistance);
        });

        keyboard.on('keydown-LEFT', () => {
            if (this.player) this.player.move(-moveDistance, 0);
        });

        keyboard.on('keydown-RIGHT', () => {
            if (this.player) this.player.move(moveDistance, 0);
        });

        // WASD keys for player movement
        keyboard.on('keydown-W', () => {
            if (this.player) this.player.move(0, -moveDistance);
        });

        keyboard.on('keydown-S', () => {
            if (this.player) this.player.move(0, moveDistance);
        });

        keyboard.on('keydown-A', () => {
            if (this.player) this.player.move(-moveDistance, 0);
        });

        keyboard.on('keydown-D', () => {
            if (this.player) this.player.move(moveDistance, 0);
        });
    }

    updateGrid ()
    {
        this.grid.clear();

        if (!this.showGrid) {
            return;
        }

        const tileSize = 25; // 32x32 tiles means 800/32 = 25 pixels per tile
        const lineColor = 0x808080;
        const lineAlpha = 0.4;

        this.grid.lineStyle(1, lineColor, lineAlpha);

        // Draw vertical lines
        for (let x = 0; x <= SCREEN_WIDTH; x += tileSize) {
            this.grid.moveTo(x, 0);
            this.grid.lineTo(x, SCREEN_HEIGHT);
        }

        // Draw horizontal lines
        for (let y = 0; y <= SCREEN_HEIGHT; y += tileSize) {
            this.grid.moveTo(0, y);
            this.grid.lineTo(SCREEN_WIDTH, y);
        }

        this.grid.strokePath();
    }
}
