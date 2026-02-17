import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { RiverTileType } from '../world/River';
import { GameSimulation } from '../simulation/GameSimulation';

const RIVER_TILE_COLORS = {
    [RiverTileType.SKY]: 0xFFFFFF,        // White sky
    [RiverTileType.WATER]: 0x2E75B6,      // Blue water
    [RiverTileType.RIVER_BOTTOM]: 0x8B7355 // Brown bottom
};

export class RiverScene extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Player | null = null;
    sim: GameSimulation | null = null;
    graphics: Phaser.GameObjects.Graphics | null = null;
    debug_text: Phaser.GameObjects.Text | null = null;

    constructor() {
        super('RiverScene');
    }

    init(data: { riverIndex: number }) {
        const sim = this.registry.get('simulation') as GameSimulation | null;
        if (!sim) {
            throw new Error('GameSimulation not initialized in Preloader');
        }
        this.sim = sim;

        // Simulation already set river state in tryEnterRiver(),
        // but handle the case where we need to set it from init data
        if (this.sim.mode !== 'river') {
            this.sim.handleRiverReentry(data.riverIndex);
        }
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

        if (this.sim?.world.river) {
            const riverPixelWidth = this.sim.world.river.length * TILE_SIZE;
            const riverPixelHeight = this.sim.world.river.maxDepth * TILE_SIZE;
            this.camera.setBounds(0, 0, riverPixelWidth, riverPixelHeight);
        }
    }

    setupGraphics() {
        this.graphics = this.add.graphics();
        this.graphics.setDepth(-1);
    }

    setupPlayer() {
        if (!this.sim) return;

        // Create renderer from the shared PlayerState
        this.player = new Player(this, this.sim.player);
        this.player.state.isSwimming = true;

        // Position the renderer at river coordinates
        this.player.syncFromTile(this.sim.riverX, this.sim.riverY);

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
        if (!this.sim || !this.player) return;

        if (this.sim.moveRiver(tileDx, tileDy)) {
            this.player.syncFromTile(this.sim.riverX, this.sim.riverY);
        }
    }

    tryExitRiver() {
        if (!this.sim) return;

        const result = this.sim.tryExitRiver();
        if (!result) return;

        // Sleep this scene and wake the WorldScene
        this.scene.sleep();
        this.scene.wake('WorldScene', {
            exitRiver: true,
            riverIndex: this.sim.riverX
        });
    }

    setupWakeHandler() {
        this.events.on(Phaser.Scenes.Events.WAKE, (_sys: Phaser.Scenes.Systems, data?: { riverIndex: number }) => {
            console.log("River wake.");
            if (data?.riverIndex !== undefined && this.sim && this.player) {
                // Simulation handles all state updates
                this.sim.handleRiverReentry(data.riverIndex);

                // Sync renderer from simulation state
                this.player.syncFromTile(this.sim.riverX, this.sim.riverY);

                console.log(`Re-entering river at index ${this.sim.riverX}, position (${this.sim.riverX}, ${this.sim.riverY})`);
            }
        });
    }

    update() {
        this.renderRiver();
        this.updateDebug();
    }

    renderRiver() {
        if (!this.graphics || !this.sim?.world.river || !this.camera) return;

        const river = this.sim.world.river;
        this.graphics.clear();

        // Calculate visible tile range
        const buffer = 2;
        const startTileX = Math.max(0, Math.floor(this.camera.scrollX / TILE_SIZE) - buffer);
        const startTileY = Math.max(0, Math.floor(this.camera.scrollY / TILE_SIZE) - buffer);
        const endTileX = Math.min(river.length, Math.ceil((this.camera.scrollX + SCREEN_WIDTH) / TILE_SIZE) + buffer);
        const endTileY = Math.min(river.maxDepth, Math.ceil((this.camera.scrollY + SCREEN_HEIGHT) / TILE_SIZE) + buffer);

        // Render tiles
        for (let ty = startTileY; ty < endTileY; ty++) {
            for (let tx = startTileX; tx < endTileX; tx++) {
                const tile = river.getTile(tx, ty);
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
        if (!this.debug_text || !this.sim?.world.river) return;

        const river = this.sim.world.river;
        const tile = river.getTile(this.sim.riverX, this.sim.riverY);
        const tileType = tile ? tile.type : 'unknown';
        const canExit = this.sim.riverY >= 3 && this.sim.riverY <= 4;
        const bottomDepth = river.getRiverDepthAt(this.sim.riverX);
        const waterDepth = bottomDepth - river.skyDepth;

        this.debug_text.setText([
            `River Position: (${this.sim.riverX}, ${this.sim.riverY})`,
            `Tile Type: ${tileType}`,
            `Water Depth: ${waterDepth} tiles`,
            `River Length: ${river.length}`,
            canExit ? 'Press B to exit river' : ''
        ]);
    }
}
