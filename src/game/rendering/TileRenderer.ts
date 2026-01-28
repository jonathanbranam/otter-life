import { Scene } from 'phaser';
import { World } from '../world';
import { TileType } from '../world/TileType';
import { TILE_SIZE } from '../constants';

export const TILE_COLORS: Record<TileType, number> = {
    [TileType.DIRT]: 0x8B7355,          // Brown dirt
    [TileType.GRASS]: 0x4A7C2C,         // Green grass
    [TileType.MUD]: 0x6B5D4F,           // Dark muddy brown
    [TileType.SHORELINE]: 0xC2B280,     // Sandy beige
    [TileType.RIVER_SHALLOW]: 0x6BAED6, // Light blue water
    [TileType.RIVER_DEEP]: 0x2E75B6,    // Medium blue water
    [TileType.OCEAN]: 0x1E5A8E,         // Deep blue
    [TileType.BOULDER]: 0x808080,       // Gray
    [TileType.CLIFF]: 0x696969,         // Dark gray
    [TileType.TREE]: 0x2D5016,          // Dark green
    [TileType.ROCK]: 0x9E9E9E           // Light gray
};

export class TileRenderer {
    scene: Scene;
    world: World;
    graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Scene, world: World) {
        this.scene = scene;
        this.world = world;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(-1); // Behind everything else
    }

    render(cameraX: number, cameraY: number, cameraWidth: number, cameraHeight: number): void {
        this.graphics.clear();

        // Calculate tile range to render (viewport + 4 tile buffer)
        const buffer = 4;
        const startTileX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - buffer);
        const startTileY = Math.max(0, Math.floor(cameraY / TILE_SIZE) - buffer);
        const endTileX = Math.min(this.world.width, Math.ceil((cameraX + cameraWidth) / TILE_SIZE) + buffer);
        const endTileY = Math.min(this.world.height, Math.ceil((cameraY + cameraHeight) / TILE_SIZE) + buffer);

        // Render tiles in range
        for (let ty = startTileY; ty < endTileY; ty++) {
            for (let tx = startTileX; tx < endTileX; tx++) {
                const tile = this.world.getTile(tx, ty);
                if (tile) {
                    this.renderTile(tile);
                }
            }
        }
    }

    renderTile(tile: { x: number; y: number; type: TileType }): void {
        const color = TILE_COLORS[tile.type];
        const pixelX = tile.x * TILE_SIZE;
        const pixelY = tile.y * TILE_SIZE;

        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);

        // Add subtle border for visual clarity
        this.graphics.lineStyle(1, 0x000000, 0.1);
        this.graphics.strokeRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
    }

    destroy(): void {
        this.graphics.destroy();
    }
}
