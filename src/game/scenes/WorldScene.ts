import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants';
import { Player } from '../entities/Player';
import { TileType } from '../world';
import { TileRenderer } from '../rendering/TileRenderer';
import { GameSimulation } from '../simulation/GameSimulation';

export class WorldScene extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    msg_text : Phaser.GameObjects.Text;
    quit_text : Phaser.GameObjects.Text;
    quit_bg : Phaser.GameObjects.Rectangle;
    debug_text : Phaser.GameObjects.Text | null = null;
    grid: Phaser.GameObjects.Graphics;
    riverPathGraphics: Phaser.GameObjects.Graphics;
    player: Player | null = null;
    sim: GameSimulation | null = null;
    tileRenderer: TileRenderer | null = null;
    showGrid: boolean = false;
    showRiverPath: boolean = false;

    constructor ()
    {
        super('WorldScene');
    }

    create ()
    {
        this.setupSimulation();
        this.setupCamera();
        this.setupWorld();
        this.setupTitle();
        this.setupQuitButton();
        this.setupDebug();
        this.setupPlayer();
        this.setupGrid();
        this.setupKeyboardControls();
        this.setupWakeHandler();
    }

    setupSimulation ()
    {
        const sim = this.registry.get('simulation') as GameSimulation | null;
        if (!sim) {
            throw new Error('GameSimulation not initialized in Preloader');
        }
        this.sim = sim;
    }

    setupWakeHandler ()
    {
        this.events.on(Phaser.Scenes.Events.WAKE, (_sys: Phaser.Scenes.Systems, data?: { exitRiver?: boolean; riverIndex?: number }) => {
            console.log("Game wake.");
            if (data?.exitRiver && data.riverIndex !== undefined && this.sim && this.player) {
                // Simulation handles all state updates
                this.sim.handleOverworldReturn(data.riverIndex);

                // Sync renderer from simulation state
                this.player.syncFromState();

                console.log(`Player exited river at tile (${this.sim.player.tileX}, ${this.sim.player.tileY})`);
            }
        });
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
        const startCameraX = 5 * TILE_SIZE;
        const startCameraY = 5 * TILE_SIZE;
        this.camera.scrollX = startCameraX;
        this.camera.scrollY = startCameraY;
    }

    setupWorld ()
    {
        if (!this.sim) return;

        // Create tile renderer using the world from simulation
        this.tileRenderer = new TileRenderer(this, this.sim.world);
        console.log('World retrieved from simulation');
    }

    setupTitle ()
    {
        this.msg_text = this.add.text(SCREEN_WIDTH - 10, 40, "Otter's Life", {
            fontFamily: 'Arial', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'right'
        });
        this.msg_text.setOrigin(1, 0.5);
        this.msg_text.setScrollFactor(0);
        this.msg_text.setDepth(2000);
    }

    setupQuitButton ()
    {
        const buttonX = SCREEN_WIDTH - 10;
        const buttonY = 90;

        this.quit_bg = this.add.rectangle(buttonX, buttonY, 80, 40, 0x000000, 0.3);
        this.quit_bg.setOrigin(1, 0.5);
        this.quit_bg.setInteractive({ useHandCursor: true });
        this.quit_bg.setScrollFactor(0);
        this.quit_bg.setDepth(2000);

        this.quit_text = this.add.text(buttonX - 40, buttonY, 'Quit', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
            align: 'center'
        });
        this.quit_text.setOrigin(0.5);
        this.quit_text.setScrollFactor(0);
        this.quit_text.setDepth(2001);

        this.quit_bg.on('pointerover', () => {
            this.quit_bg.setFillStyle(0xffffff, 0.4);
            this.quit_text.setStyle({ color: '#ffff00' });
        });

        this.quit_bg.on('pointerout', () => {
            this.quit_bg.setFillStyle(0x000000, 0.3);
            this.quit_text.setStyle({ color: '#ffffff' });
        });

        this.quit_bg.on('pointerdown', () => {
            this.scene.start('GameOver');
        });
    }

    setupDebug ()
    {
        this.debug_text = this.add.text(10, 10, '', {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff',
            stroke: '#000000', strokeThickness: 2,
            align: 'left'
        });
        this.debug_text.setScrollFactor(0);
        this.debug_text.setDepth(2000);
    }

    setupPlayer ()
    {
        if (!this.sim) return;

        // Use simulation to find spawn position and initialize player state
        const spawnPos = this.sim.findSpawnPosition();
        this.sim.spawnPlayer(spawnPos.x, spawnPos.y);

        console.log(`Starting at tile (${spawnPos.x}, ${spawnPos.y})`);

        // Position camera at starting location
        this.camera.scrollX = spawnPos.x * TILE_SIZE - SCREEN_WIDTH / 2;
        this.camera.scrollY = spawnPos.y * TILE_SIZE - SCREEN_HEIGHT / 2;

        // Create renderer that reads from simulation's PlayerState
        this.player = new Player(this, this.sim.player);

        // Set up camera to follow player's belly
        if (this.player.belly) {
            const deadzoneMargin = 8 * TILE_SIZE;
            const deadzoneWidth = SCREEN_WIDTH - (2 * deadzoneMargin);
            const deadzoneHeight = SCREEN_HEIGHT - (2 * deadzoneMargin);

            this.camera.startFollow(this.player.belly, false, 0.1, 0.1);
            this.camera.setDeadzone(deadzoneWidth, deadzoneHeight);
        }

        console.log(`Player spawned at tile (${spawnPos.x}, ${spawnPos.y})`);
    }

    setupGrid ()
    {
        this.grid = this.add.graphics();
        this.grid.setDepth(1000);

        this.riverPathGraphics = this.add.graphics();
        this.riverPathGraphics.setDepth(1001);
    }

    setupKeyboardControls ()
    {
        const keyboard = this.input.keyboard;
        if (!keyboard) return;

        keyboard.on('keydown-G', () => {
            this.showGrid = !this.showGrid;
            this.showRiverPath = !this.showRiverPath;
        });

        keyboard.on('keydown-B', () => {
            this.tryEnterRiver();
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

    movePlayer(tileDx: number, tileDy: number): void {
        if (!this.sim || !this.player) return;

        if (this.sim.moveOverworld(tileDx, tileDy)) {
            this.player.syncFromState();
        }
    }

    tryEnterRiver(): void {
        if (!this.sim) return;

        const result = this.sim.tryEnterRiver();
        if (!result) return;

        console.log(`Entering river at world tile (${this.sim.player.tileX}, ${this.sim.player.tileY}), river index: ${result.riverIndex}`);

        const riverScene = this.scene.get('RiverScene');

        // Sleep this scene
        this.scene.sleep();

        // Check if river scene exists and is sleeping, or needs to be launched
        if (riverScene && this.scene.isSleeping('RiverScene')) {
            this.scene.wake('RiverScene', {
                riverIndex: result.riverIndex
            });
        } else {
            this.scene.launch('RiverScene', {
                riverIndex: result.riverIndex
            });
        }
    }

    update ()
    {
        if (this.tileRenderer && this.camera) {
            this.tileRenderer.render(
                this.camera.scrollX,
                this.camera.scrollY,
                SCREEN_WIDTH,
                SCREEN_HEIGHT
            );
        }

        this.updateDebugDisplay();
        this.updateGrid();
        this.updateRiverPath();
    }

    updateDebugDisplay ()
    {
        if (!this.debug_text || !this.sim) return;

        const playerTileX = this.sim.player.tileX;
        const playerTileY = this.sim.player.tileY;
        const tile = this.sim.world.getTile(playerTileX, playerTileY);
        const tileType = tile ? tile.type : 'unknown';
        const isSwimming = this.sim.player.isSwimming ? ' (swimming)' : '';
        const canDive = tile?.type === TileType.RIVER_DEEP;

        let riverPathIndex = -1;
        for (let i = 0; i < this.sim.world.riverPath.length; i++) {
            const point = this.sim.world.riverPath[i];
            if (point.x === playerTileX && point.y === playerTileY) {
                riverPathIndex = i;
                break;
            }
        }

        const debugLines = [
            `Tile: (${playerTileX}, ${playerTileY})`,
            `Type: ${tileType}${isSwimming}`,
        ];

        if (riverPathIndex >= 0) {
            debugLines.push(`River Path Index: ${riverPathIndex}`);
        }

        if (canDive) {
            debugLines.push('Press B to dive into river');
        }

        this.debug_text.setText(debugLines);
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

        const cameraLeft = this.camera.scrollX;
        const cameraTop = this.camera.scrollY;
        const cameraRight = cameraLeft + SCREEN_WIDTH;
        const cameraBottom = cameraTop + SCREEN_HEIGHT;

        const startX = Math.floor(cameraLeft / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(cameraTop / TILE_SIZE) * TILE_SIZE;
        const endX = Math.ceil(cameraRight / TILE_SIZE) * TILE_SIZE;
        const endY = Math.ceil(cameraBottom / TILE_SIZE) * TILE_SIZE;

        this.grid.lineStyle(1, lineColor, lineAlpha);

        for (let x = startX; x <= endX; x += TILE_SIZE) {
            this.grid.moveTo(x, startY);
            this.grid.lineTo(x, endY);
        }

        for (let y = startY; y <= endY; y += TILE_SIZE) {
            this.grid.moveTo(startX, y);
            this.grid.lineTo(endX, y);
        }

        this.grid.strokePath();
    }

    updateRiverPath ()
    {
        this.riverPathGraphics.clear();

        if (!this.showRiverPath || !this.sim) {
            return;
        }

        const pathColor = 0xff00ff;
        const pathAlpha = 0.7;
        const dotRadius = 3;

        this.riverPathGraphics.fillStyle(pathColor, pathAlpha);

        for (let i = 0; i < this.sim.world.riverPath.length; i++) {
            const point = this.sim.world.riverPath[i];
            const pixelX = point.x * TILE_SIZE + TILE_SIZE / 2;
            const pixelY = point.y * TILE_SIZE + TILE_SIZE / 2;

            this.riverPathGraphics.fillCircle(pixelX, pixelY, dotRadius);
        }

        if (this.sim.world.riverPath.length > 1) {
            this.riverPathGraphics.lineStyle(2, pathColor, pathAlpha * 0.5);

            const firstPoint = this.sim.world.riverPath[0];
            this.riverPathGraphics.beginPath();
            this.riverPathGraphics.moveTo(
                firstPoint.x * TILE_SIZE + TILE_SIZE / 2,
                firstPoint.y * TILE_SIZE + TILE_SIZE / 2
            );

            for (let i = 1; i < this.sim.world.riverPath.length; i++) {
                const point = this.sim.world.riverPath[i];
                this.riverPathGraphics.lineTo(
                    point.x * TILE_SIZE + TILE_SIZE / 2,
                    point.y * TILE_SIZE + TILE_SIZE / 2
                );
            }

            this.riverPathGraphics.strokePath();
        }
    }
}
