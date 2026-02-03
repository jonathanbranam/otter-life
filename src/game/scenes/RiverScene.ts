import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { River, RiverTileType } from '../world/River';
import { World } from '../world/World';

const RIVER_TILE_COLORS = {
    [RiverTileType.SKY]: 0xFFFFFF,        // White sky
    [RiverTileType.WATER]: 0x2E75B6,      // Blue water
    [RiverTileType.RIVER_BOTTOM]: 0x8B7355 // Brown bottom
};

export class RiverScene extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Player | null = null;
    river: River | null = null;
    graphics: Phaser.GameObjects.Graphics | null = null;
    debug_text: Phaser.GameObjects.Text | null = null;

    // Track player position in river
    riverX: number = 0; // Position along river (0 to river.length)
    riverY: number = 0; // Depth in river (0 to river.depth)

    // Entry data from world
    entryRiverIndex: number = 0;

    constructor() {
        super('RiverScene');
    }

    init(data: { riverIndex: number }) {
        // Retrieve River from World in registry
        const world = this.registry.get('world') as World | null;
        if (!world?.river) {
            throw new Error('World/River not initialized in Preloader');
        }
        this.river = world.river;

        this.entryRiverIndex = data.riverIndex;
        this.riverX = data.riverIndex;

        this.riverY = this.river.skyDepth + 1;
    }

    create() {
        this.setupCamera();
        this.setupGraphics();
        this.setupPlayer();
        this.setupDebug();
        this.setupKeyboardControls();
        this.setupWakeHandler();
    }

    setupCamera() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x2E75B6);

        if (this.river) {
            // Set camera bounds to river size
            const riverPixelWidth = this.river.length * TILE_SIZE;
            const riverPixelHeight = this.river.maxDepth * TILE_SIZE;
            this.camera.setBounds(0, 0, riverPixelWidth, riverPixelHeight);
        }
    }

    setupGraphics() {
        this.graphics = this.add.graphics();
        this.graphics.setDepth(-1);
    }

    setupPlayer() {
        if (!this.river) return;

        // Place player at entry position in pixel coordinates
        const pixelX = this.riverX * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = this.riverY * TILE_SIZE + TILE_SIZE / 2;

        this.player = new Player(this, pixelX, pixelY);
        this.player.isSwimming = true;

        // Camera follows player
        if (this.player.belly) {
            this.camera.startFollow(this.player.belly, false, 0.1, 0.1);
        }
    }

    setupDebug() {
        this.debug_text = this.add.text(10, 10, '', {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff',
            stroke: '#000000', strokeThickness: 2,
            align: 'left'
        });
        this.debug_text.setScrollFactor(0);
        this.debug_text.setDepth(2000);
    }

    setupKeyboardControls() {
        const keyboard = this.input.keyboard;
        if (!keyboard) return;

        // Exit river with 'b' key
        keyboard.on('keydown-B', () => {
            this.tryExitRiver();
        });

        keyboard.on('keydown-UP', () => this.movePlayer(0, -1));
        keyboard.on('keydown-DOWN', () => this.movePlayer(0, 1));
        keyboard.on('keydown-LEFT', () => this.movePlayer(-1, 0));
        keyboard.on('keydown-RIGHT', () => this.movePlayer(1, 0));

        keyboard.on('keydown-W', () => this.movePlayer(0, -1));
        keyboard.on('keydown-S', () => this.movePlayer(0, 1));
        keyboard.on('keydown-A', () => this.movePlayer(-1, 0));
        keyboard.on('keydown-D', () => this.movePlayer(1, 0));
    }

    movePlayer(tileDx: number, tileDy: number) {
        if (!this.player || !this.river) return;

        const newX = this.riverX + tileDx;
        const newY = this.riverY + tileDy;

        // Check bounds
        if (!this.river.isInBounds(newX, newY)) {
            return;
        }

        // Check if tile is water
        if (!this.river.canMoveTo(newX, newY)) {
            return;
        }

        // Move player
        const pixelDx = tileDx * TILE_SIZE;
        const pixelDy = tileDy * TILE_SIZE;
        this.player.move(pixelDx, pixelDy);

        this.riverX = newX;
        this.riverY = newY;
    }

    tryExitRiver() {
        if (!this.river) return;

        // Check if player is within 1-2 tiles from the sky
        // Sky is tiles 0-2, water starts at 3, so 1-2 tiles from sky means y = 3 or 4
        if (this.riverY >= 3 && this.riverY <= 4) {
            this.exitRiver();
        }
    }

    exitRiver() {
        // Sleep this scene and wake the Game scene with exit river index
        this.scene.sleep();
        this.scene.wake('WorldScene', {
            exitRiver: true,
            riverIndex: this.riverX
        });
    }

    setupWakeHandler() {
        this.events.on(Phaser.Scenes.Events.WAKE, (_sys: Phaser.Scenes.Systems, data?: { riverIndex: number }) => {
            console.log("River wake.");
            // This is called when re-entering the river from a different location
            if (data?.riverIndex !== undefined && this.player) {
                // Retrieve River from World in registry
                const world = this.registry.get('world') as World | null;
                if (!world?.river) {
                    throw new Error('World/River not initialized in Preloader');
                }
                this.river = world.river;

                this.entryRiverIndex = data.riverIndex;
                this.riverX = data.riverIndex;

                this.riverY = this.river.skyDepth + 1;

                // Update player sprite position
                const pixelX = this.riverX * TILE_SIZE + TILE_SIZE / 2;
                const pixelY = this.riverY * TILE_SIZE + TILE_SIZE / 2;

                if (this.player.belly) {
                    this.player.belly.x = pixelX;
                    this.player.belly.y = pixelY;
                }
                if (this.player.head) {
                    this.player.head.x = pixelX;
                    this.player.head.y = pixelY - 8;
                }

                console.log(`Re-entering river at index ${this.riverX}, position (${this.riverX}, ${this.riverY})`);
            }
        });
    }

    update() {
        this.renderRiver();
        this.updateDebug();
    }

    renderRiver() {
        if (!this.graphics || !this.river || !this.camera) return;

        this.graphics.clear();

        // Calculate visible tile range
        const buffer = 2;
        const startTileX = Math.max(0, Math.floor(this.camera.scrollX / TILE_SIZE) - buffer);
        const startTileY = Math.max(0, Math.floor(this.camera.scrollY / TILE_SIZE) - buffer);
        const endTileX = Math.min(this.river.length, Math.ceil((this.camera.scrollX + SCREEN_WIDTH) / TILE_SIZE) + buffer);
        const endTileY = Math.min(this.river.maxDepth, Math.ceil((this.camera.scrollY + SCREEN_HEIGHT) / TILE_SIZE) + buffer);

        // Render tiles
        for (let ty = startTileY; ty < endTileY; ty++) {
            for (let tx = startTileX; tx < endTileX; tx++) {
                const tile = this.river.getTile(tx, ty);
                if (tile) {
                    const color = RIVER_TILE_COLORS[tile.type];
                    const pixelX = tx * TILE_SIZE;
                    const pixelY = ty * TILE_SIZE;

                    this.graphics.fillStyle(color, 1);
                    this.graphics.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);

                    // Border
                    this.graphics.lineStyle(1, 0x000000, 0.1);
                    this.graphics.strokeRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        this.graphics.strokePath();
    }

    updateDebug() {
        if (!this.debug_text || !this.river) return;

        const tile = this.river.getTile(this.riverX, this.riverY);
        const tileType = tile ? tile.type : 'unknown';
        const canExit = this.riverY >= 3 && this.riverY <= 4;
        const bottomDepth = this.river.getRiverDepthAt(this.riverX);
        const waterDepth = bottomDepth - this.river.skyDepth;

        this.debug_text.setText([
            `River Position: (${this.riverX}, ${this.riverY})`,
            `Tile Type: ${tileType}`,
            `Water Depth: ${waterDepth} tiles`,
            `River Length: ${this.river.length}`,
            canExit ? 'Press B to exit river' : ''
        ]);
    }
}
