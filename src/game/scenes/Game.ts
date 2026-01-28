import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants';
import { Player } from '../entities/Player';
import { World } from '../world';
import { TileRenderer } from '../rendering/TileRenderer';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    msg_text : Phaser.GameObjects.Text;
    quit_text : Phaser.GameObjects.Text;
    quit_bg : Phaser.GameObjects.Rectangle;
    grid: Phaser.GameObjects.Graphics;
    player: Player | null = null;
    world: World | null = null;
    tileRenderer: TileRenderer | null = null;
    showGrid: boolean = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.setupCamera();
        this.setupWorld();
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

        // Set camera bounds to world size
        const worldPixelWidth = WORLD_WIDTH * TILE_SIZE;
        const worldPixelHeight = WORLD_HEIGHT * TILE_SIZE;
        this.camera.setBounds(0, 0, worldPixelWidth, worldPixelHeight);

        // Position camera in northwest (near top-left of world)
        // Leave some margin from the edge
        const startCameraX = 5 * TILE_SIZE; // 5 tiles from left edge
        const startCameraY = 5 * TILE_SIZE; // 5 tiles from top edge
        this.camera.scrollX = startCameraX;
        this.camera.scrollY = startCameraY;
    }

    setupWorld ()
    {
        console.log('Generating world...');
        this.world = new World(WORLD_WIDTH, WORLD_HEIGHT);
        console.log('World generated successfully');

        // Create tile renderer
        this.tileRenderer = new TileRenderer(this, this.world);
    }

    setupTitle ()
    {
        this.msg_text = this.add.text(SCREEN_WIDTH - 10, 40, "Otter's Life", {
            fontFamily: 'Arial', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'right'
        });
        this.msg_text.setOrigin(1, 0.5);
        this.msg_text.setScrollFactor(0); // Fixed to camera
        this.msg_text.setDepth(2000);
    }

    setupQuitButton ()
    {
        const buttonX = SCREEN_WIDTH - 10;
        const buttonY = 90;

        // Create background rectangle
        this.quit_bg = this.add.rectangle(buttonX, buttonY, 80, 40, 0x000000, 0.3);
        this.quit_bg.setOrigin(1, 0.5);
        this.quit_bg.setInteractive({ useHandCursor: true });
        this.quit_bg.setScrollFactor(0); // Fixed to camera
        this.quit_bg.setDepth(2000);

        // Create centered text within the rectangle
        this.quit_text = this.add.text(buttonX - 40, buttonY, 'Quit', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
            align: 'center'
        });
        this.quit_text.setOrigin(0.5);
        this.quit_text.setScrollFactor(0); // Fixed to camera
        this.quit_text.setDepth(2001);

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
        if (!this.world) return;

        // Calculate tile position at center of camera view
        const cameraCenterTileX = Math.floor((this.camera.scrollX + SCREEN_WIDTH / 2) / TILE_SIZE);
        const cameraCenterTileY = Math.floor((this.camera.scrollY + SCREEN_HEIGHT / 2) / TILE_SIZE);

        // Find a walkable tile near the camera center
        let startTileX = cameraCenterTileX;
        let startTileY = cameraCenterTileY;
        let found = false;

        for (let radius = 0; radius < 50 && !found; radius++) {
            for (let dy = -radius; dy <= radius && !found; dy++) {
                for (let dx = -radius; dx <= radius && !found; dx++) {
                    const tx = cameraCenterTileX + dx;
                    const ty = cameraCenterTileY + dy;

                    if (this.world.canMoveTo(tx, ty, false)) {
                        startTileX = tx;
                        startTileY = ty;
                        found = true;
                    }
                }
            }
        }

        // Center player within the tile (in world pixel coordinates)
        const centerX = startTileX * TILE_SIZE + TILE_SIZE / 2;
        const centerY = startTileY * TILE_SIZE + TILE_SIZE / 2;

        this.player = new Player(this, centerX, centerY);

        // Occupy the tile in the world
        this.world.occupyTile(startTileX, startTileY, this.player);

        console.log(`Player spawned at tile (${startTileX}, ${startTileY}) pixel (${centerX}, ${centerY})`);
    }

    setupGrid ()
    {
        this.grid = this.add.graphics();
        this.grid.setDepth(1000);
    }

    setupKeyboardControls ()
    {
        const keyboard = this.input.keyboard;
        if (!keyboard) return;

        // Toggle grid with 'g' key
        keyboard.on('keydown-G', () => {
            this.showGrid = !this.showGrid;
        });

        // Arrow keys for player movement
        keyboard.on('keydown-UP', () => {
            if (this.player) this.player.move(0, -TILE_SIZE);
        });

        keyboard.on('keydown-DOWN', () => {
            if (this.player) this.player.move(0, TILE_SIZE);
        });

        keyboard.on('keydown-LEFT', () => {
            if (this.player) this.player.move(-TILE_SIZE, 0);
        });

        keyboard.on('keydown-RIGHT', () => {
            if (this.player) this.player.move(TILE_SIZE, 0);
        });

        // WASD keys for player movement
        keyboard.on('keydown-W', () => {
            if (this.player) this.player.move(0, -TILE_SIZE);
        });

        keyboard.on('keydown-S', () => {
            if (this.player) this.player.move(0, TILE_SIZE);
        });

        keyboard.on('keydown-A', () => {
            if (this.player) this.player.move(-TILE_SIZE, 0);
        });

        keyboard.on('keydown-D', () => {
            if (this.player) this.player.move(TILE_SIZE, 0);
        });
    }

    update ()
    {
        // Render tiles based on camera position
        if (this.tileRenderer && this.camera) {
            this.tileRenderer.render(
                this.camera.scrollX,
                this.camera.scrollY,
                SCREEN_WIDTH,
                SCREEN_HEIGHT
            );
        }

        // Update grid overlay
        this.updateGrid();
    }

    updateGrid ()
    {
        this.grid.clear();

        if (!this.showGrid) {
            return;
        }

        const lineColor = 0x808080;
        const lineAlpha = 0.4;

        this.grid.lineStyle(1, lineColor, lineAlpha);

        // Get camera viewport in world coordinates
        const cameraLeft = this.camera.scrollX;
        const cameraTop = this.camera.scrollY;
        const cameraRight = cameraLeft + SCREEN_WIDTH;
        const cameraBottom = cameraTop + SCREEN_HEIGHT;

        // Extend grid slightly beyond viewport
        const startX = Math.floor(cameraLeft / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(cameraTop / TILE_SIZE) * TILE_SIZE;
        const endX = Math.ceil(cameraRight / TILE_SIZE) * TILE_SIZE;
        const endY = Math.ceil(cameraBottom / TILE_SIZE) * TILE_SIZE;

        this.grid.lineStyle(1, lineColor, lineAlpha);

        // Draw vertical lines
        for (let x = startX; x <= endX; x += TILE_SIZE) {
            this.grid.moveTo(x, startY);
            this.grid.lineTo(x, endY);
        }

        // Draw horizontal lines
        for (let y = startY; y <= endY; y += TILE_SIZE) {
            this.grid.moveTo(startX, y);
            this.grid.lineTo(endX, y);
        }

        this.grid.strokePath();
    }
}
