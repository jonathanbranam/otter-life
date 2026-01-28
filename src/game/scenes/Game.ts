import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from '../constants';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    msg_text : Phaser.GameObjects.Text;
    grid: Phaser.GameObjects.Graphics;
    showGrid: boolean = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        this.background = this.add.image(SCREEN_CENTER_X, SCREEN_CENTER_Y, 'background');
        this.background.setAlpha(0.5);

        this.msg_text = this.add.text(SCREEN_WIDTH - 130, 40, "Otter's Life", {
            fontFamily: 'Arial', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        });
        this.msg_text.setOrigin(0.5);

        // Create grid graphics
        this.grid = this.add.graphics();
        this.grid.setDepth(1000); // Ensure grid is on top
        this.updateGrid();

        // Toggle grid with 'g' key
        this.input.keyboard?.on('keydown-G', () => {
            this.showGrid = !this.showGrid;
            this.updateGrid();
        });

        this.input.once('pointerdown', () => {

            this.scene.start('GameOver');

        });
    }

    updateGrid ()
    {
        this.grid.clear();

        if (!this.showGrid) {
            return;
        }

        const tileSize = 25; // 32x32 tiles means 800/32 = 25 pixels per tile
        const lineColor = 0xffffff;
        const lineAlpha = 0.2;

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
