import { Scene } from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants';
import { Player } from '../entities/Player';
import { World, TileType } from '../world';
import { TileRenderer } from '../rendering/TileRenderer';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    msg_text : Phaser.GameObjects.Text;
    quit_text : Phaser.GameObjects.Text;
    quit_bg : Phaser.GameObjects.Rectangle;
    debug_text : Phaser.GameObjects.Text | null = null;
    grid: Phaser.GameObjects.Graphics;
    riverPathGraphics: Phaser.GameObjects.Graphics;
    player: Player | null = null;
    world: World | null = null;
    tileRenderer: TileRenderer | null = null;
    showGrid: boolean = false;
    showRiverPath: boolean = false;
    playerTileX: number = 0;
    playerTileY: number = 0;

    constructor ()
    {
        super('Game');
    }

    init(data?: { exitRiver?: boolean; riverIndex?: number }) {
        // This is only called when scene starts fresh (not when waking from sleep)
        if (data?.exitRiver && data.riverIndex !== undefined) {
            // Returning from river - will position player at exit point
            this.handleRiverExit(data.riverIndex);
        }
    }

    setupWakeHandler ()
    {
        this.events.on(Phaser.Scenes.Events.WAKE, (_sys: Phaser.Scenes.Systems, data?: { exitRiver?: boolean; riverIndex?: number }) => {
            console.log("Game wake.");
            // This is called when scene wakes from sleep
            if (data?.exitRiver && data.riverIndex !== undefined && this.player && this.world) {
                // Returning from river - reposition player at exit point
                const exitPos = this.world.getRiverPathPosition(data.riverIndex);
                if (exitPos) {
                    // Vacate current tile
                    this.world.vacateTile(this.playerTileX, this.playerTileY);

                    // Update player position
                    this.playerTileX = exitPos.x;
                    this.playerTileY = exitPos.y;

                    // Move player sprite to new position
                    const centerX = exitPos.x * TILE_SIZE + TILE_SIZE / 2;
                    const centerY = exitPos.y * TILE_SIZE + TILE_SIZE / 2;

                    if (this.player.belly) {
                        this.player.belly.x = centerX;
                        this.player.belly.y = centerY;
                    }
                    if (this.player.head) {
                        this.player.head.x = centerX;
                        this.player.head.y = centerY - 8;
                    }

                    // Occupy new tile
                    this.world.occupyTile(exitPos.x, exitPos.y, this.player);

                    // Update swimming state
                    const exitTile = this.world.getTile(exitPos.x, exitPos.y);
                    if (exitTile) {
                        this.player.isSwimming = exitTile.isWaterTile();
                    }

                    console.log(`Player exited river at tile (${exitPos.x}, ${exitPos.y})`);
                }
            }
        });
    }

    create ()
    {
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

    handleRiverExit(riverIndex: number) {
        // This will be used during player setup to position them at the exit point
        // Store the exit data for use in setupPlayer
        this.registry.set('riverExitIndex', riverIndex);
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

    setupDebug ()
    {
        this.debug_text = this.add.text(10, 10, '', {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff',
            stroke: '#000000', strokeThickness: 2,
            align: 'left'
        });
        this.debug_text.setScrollFactor(0); // Fixed to camera
        this.debug_text.setDepth(2000);
    }

    setupPlayer ()
    {
        if (!this.world) return;

        let startTileX: number;
        let startTileY: number;

        // Check if returning from river
        const riverExitIndex = this.registry.get('riverExitIndex');
        if (riverExitIndex !== undefined) {
            // Position player at river exit point
            const exitPos = this.world.getRiverPathPosition(riverExitIndex);
            if (exitPos) {
                startTileX = exitPos.x;
                startTileY = exitPos.y;
                console.log(`Player exiting river at tile (${startTileX}, ${startTileY})`);
            } else {
                // Fallback to camera center if exit position not found
                startTileX = Math.floor((this.camera.scrollX + SCREEN_WIDTH / 2) / TILE_SIZE);
                startTileY = Math.floor((this.camera.scrollY + SCREEN_HEIGHT / 2) / TILE_SIZE);
            }
            // Clear the registry
            this.registry.remove('riverExitIndex');

            // Position camera at exit location
            this.camera.scrollX = startTileX * TILE_SIZE - SCREEN_WIDTH / 2;
            this.camera.scrollY = startTileY * TILE_SIZE - SCREEN_HEIGHT / 2;
        } else {
            // Normal spawn - Position near north end of river
            if (this.world.riverPath.length > 0) {
                // Get a point 10-20 tiles from the north end
                const tilesFromNorth = 10 + Math.floor(Math.random() * 11); // Random between 10-20
                const riverIndex = Math.max(0, this.world.riverPath.length - tilesFromNorth);
                const riverPoint = this.world.riverPath[riverIndex];

                // Start a few tiles to the side of the river
                startTileX = riverPoint.x + 5;
                startTileY = riverPoint.y;

                console.log(`Starting near north end of river at index ${riverIndex}, tile (${startTileX}, ${startTileY})`);
            } else {
                // Fallback if no river
                startTileX = Math.floor((this.camera.scrollX + SCREEN_WIDTH / 2) / TILE_SIZE);
                startTileY = Math.floor((this.camera.scrollY + SCREEN_HEIGHT / 2) / TILE_SIZE);
            }

            // Find a walkable tile near the target position
            let found = false;
            for (let radius = 0; radius < 50 && !found; radius++) {
                for (let dy = -radius; dy <= radius && !found; dy++) {
                    for (let dx = -radius; dx <= radius && !found; dx++) {
                        const tx = startTileX + dx;
                        const ty = startTileY + dy;

                        if (this.world.canMoveTo(tx, ty, false)) {
                            startTileX = tx;
                            startTileY = ty;
                            found = true;
                        }
                    }
                }
            }

            // Position camera at starting location
            this.camera.scrollX = startTileX * TILE_SIZE - SCREEN_WIDTH / 2;
            this.camera.scrollY = startTileY * TILE_SIZE - SCREEN_HEIGHT / 2;
        }

        // Center player within the tile (in world pixel coordinates)
        const centerX = startTileX * TILE_SIZE + TILE_SIZE / 2;
        const centerY = startTileY * TILE_SIZE + TILE_SIZE / 2;

        this.player = new Player(this, centerX, centerY);

        // Track player tile position
        this.playerTileX = startTileX;
        this.playerTileY = startTileY;

        // Occupy the tile in the world
        this.world.occupyTile(startTileX, startTileY, this.player);

        // Set initial swimming state
        const startTile = this.world.getTile(startTileX, startTileY);
        if (startTile) {
            this.player.isSwimming = startTile.isWaterTile();
        }

        // Set up camera to follow player's belly
        if (this.player.belly) {
            // Calculate deadzone: 8 tiles from each edge
            const deadzoneMargin = 8 * TILE_SIZE;
            const deadzoneWidth = SCREEN_WIDTH - (2 * deadzoneMargin);
            const deadzoneHeight = SCREEN_HEIGHT - (2 * deadzoneMargin);

            // Set up camera following with deadzone
            this.camera.startFollow(this.player.belly, false, 0.1, 0.1);
            this.camera.setDeadzone(deadzoneWidth, deadzoneHeight);
        }

        console.log(`Player spawned at tile (${startTileX}, ${startTileY}) pixel (${centerX}, ${centerY})`);
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

        // Toggle grid and river path with 'g' key
        keyboard.on('keydown-G', () => {
            this.showGrid = !this.showGrid;
            this.showRiverPath = !this.showRiverPath;
        });

        // Enter river with 'b' key
        keyboard.on('keydown-B', () => {
            this.tryEnterRiver();
        });

        // Arrow keys for player movement
        keyboard.on('keydown-UP', () => {
            this.movePlayer(0, -1);
        });

        keyboard.on('keydown-DOWN', () => {
            this.movePlayer(0, 1);
        });

        keyboard.on('keydown-LEFT', () => {
            this.movePlayer(-1, 0);
        });

        keyboard.on('keydown-RIGHT', () => {
            this.movePlayer(1, 0);
        });

        // WASD keys for player movement
        keyboard.on('keydown-W', () => {
            this.movePlayer(0, -1);
        });

        keyboard.on('keydown-S', () => {
            this.movePlayer(0, 1);
        });

        keyboard.on('keydown-A', () => {
            this.movePlayer(-1, 0);
        });

        keyboard.on('keydown-D', () => {
            this.movePlayer(1, 0);
        });
    }

    movePlayer(tileDx: number, tileDy: number): void {
        if (!this.player || !this.world) return;

        // Calculate new tile position
        const newTileX = this.playerTileX + tileDx;
        const newTileY = this.playerTileY + tileDy;

        // Check if the new tile is walkable
        if (!this.world.canMoveTo(newTileX, newTileY, this.player.isSwimming)) {
            return; // Can't move there
        }

        // Vacate current tile
        this.world.vacateTile(this.playerTileX, this.playerTileY);

        // Move player in pixel coordinates
        const pixelDx = tileDx * TILE_SIZE;
        const pixelDy = tileDy * TILE_SIZE;
        this.player.move(pixelDx, pixelDy);

        // Update tracked tile position
        this.playerTileX = newTileX;
        this.playerTileY = newTileY;

        // Occupy new tile
        this.world.occupyTile(newTileX, newTileY, this.player);

        // Update swimming state based on tile type
        const newTile = this.world.getTile(newTileX, newTileY);
        if (newTile) {
            this.player.isSwimming = newTile.isWaterTile();
        }
    }

    tryEnterRiver(): void {
        if (!this.player || !this.world) return;

        // Check if player is on a deep river tile
        const currentTile = this.world.getTile(this.playerTileX, this.playerTileY);
        if (currentTile && currentTile.type === TileType.RIVER_DEEP) {
            this.enterRiver(this.playerTileX, this.playerTileY);
        }
    }

    enterRiver(tileX: number, tileY: number): void {
        if (!this.world || !this.world.river) return;

        // Find the river path index closest to this tile
        const riverIndex = this.world.findRiverPathIndex(tileX, tileY);

        console.log(`Entering river at world tile (${tileX}, ${tileY}), river index: ${riverIndex}`);

        const riverScene = this.scene.get('GameRiver');

        // Sleep this scene
        this.scene.sleep();

        // Check if river scene exists and is sleeping, or needs to be launched
        if (riverScene && this.scene.isSleeping('GameRiver')) {
            // Wake existing river scene with new entry data
            this.scene.wake('GameRiver', {
                river: this.world.river,
                riverIndex: riverIndex
            });
        } else {
            // Launch river scene for the first time
            this.scene.launch('GameRiver', {
                river: this.world.river,
                riverIndex: riverIndex
            });
        }
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

        // Update debug display
        this.updateDebugDisplay();

        // Update grid overlay
        this.updateGrid();

        // Update river path overlay
        this.updateRiverPath();
    }

    updateDebugDisplay ()
    {
        if (!this.debug_text || !this.world) return;

        const tile = this.world.getTile(this.playerTileX, this.playerTileY);
        const tileType = tile ? tile.type : 'unknown';
        const isSwimming = this.player?.isSwimming ? ' (swimming)' : '';
        const canDive = tile?.type === TileType.RIVER_DEEP;

        // Check if player is standing on a river path point
        let riverPathIndex = -1;
        for (let i = 0; i < this.world.riverPath.length; i++) {
            const point = this.world.riverPath[i];
            if (point.x === this.playerTileX && point.y === this.playerTileY) {
                riverPathIndex = i;
                break;
            }
        }

        const debugLines = [
            `Tile: (${this.playerTileX}, ${this.playerTileY})`,
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

    updateRiverPath ()
    {
        this.riverPathGraphics.clear();

        if (!this.showRiverPath || !this.world) {
            return;
        }

        const pathColor = 0xff00ff; // Magenta for visibility
        const pathAlpha = 0.7;
        const dotRadius = 3;

        this.riverPathGraphics.fillStyle(pathColor, pathAlpha);

        // Draw each point in the river path
        for (let i = 0; i < this.world.riverPath.length; i++) {
            const point = this.world.riverPath[i];
            const pixelX = point.x * TILE_SIZE + TILE_SIZE / 2;
            const pixelY = point.y * TILE_SIZE + TILE_SIZE / 2;

            // Draw a circle at each river path point
            this.riverPathGraphics.fillCircle(pixelX, pixelY, dotRadius);
        }

        // Draw lines connecting the points
        if (this.world.riverPath.length > 1) {
            this.riverPathGraphics.lineStyle(2, pathColor, pathAlpha * 0.5);

            const firstPoint = this.world.riverPath[0];
            this.riverPathGraphics.beginPath();
            this.riverPathGraphics.moveTo(
                firstPoint.x * TILE_SIZE + TILE_SIZE / 2,
                firstPoint.y * TILE_SIZE + TILE_SIZE / 2
            );

            for (let i = 1; i < this.world.riverPath.length; i++) {
                const point = this.world.riverPath[i];
                this.riverPathGraphics.lineTo(
                    point.x * TILE_SIZE + TILE_SIZE / 2,
                    point.y * TILE_SIZE + TILE_SIZE / 2
                );
            }

            this.riverPathGraphics.strokePath();
        }
    }
}
