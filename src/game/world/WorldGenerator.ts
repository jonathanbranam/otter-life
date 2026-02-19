import { World } from './World';
import { Tile, ResourceType } from './Tile';
import { TileType } from './TileType';
import { RiverGenerator } from './RiverGenerator';

/**
 * Procedural world generator for the overworld map.
 *
 * River path generation (generateRiver):
 * - Builds a continuous north→south path from y=height-3 to y=2
 * - Starts at 15% from the left edge; meanders with small per-step drift and
 *   occasional larger turns (15% chance); linear interpolation fills gaps
 * - Each path point carries a random width of 8–16 tiles
 * - The resulting riverPath array is the canonical overworld↔river index mapping
 *
 * Tile assignment by distance to nearest riverPath point:
 * - ≤ 30% width  → RIVER_DEEP     (diveable into RiverScene)
 * - ≤ 70% width  → RIVER_SHALLOW  (swimmable)
 * - ≤ width+1    → SHORELINE      (20% shell resource chance)
 * - ≤ width+2.5  → MUD            (30% mud resource chance)
 * - ≤ width+4    → DIRT
 * - Otherwise    → GRASS; 2% of GRASS/DIRT tiles become TREE (blocking, twigs)
 * - 2-tile border → random mix of BOULDER / CLIFF / ROCK (all blocking)
 */
export class WorldGenerator {
    static generate(width: number, height: number): World {
        const tiles = WorldGenerator.initTiles(width, height);
        WorldGenerator.generateEdges(tiles, width, height);
        const riverPath = WorldGenerator.generateRiver(tiles, width, height);
        const riverLength = riverPath.length;
        const river = RiverGenerator.generate(riverLength);
        console.log(`River generated with length: ${riverLength} tiles`);
        WorldGenerator.generateTrees(tiles, width, height);
        WorldGenerator.generateResources(tiles, width, height);

        const world = new World(tiles);
        world.riverPath = riverPath;
        world.riverLength = riverLength;
        world.river = river;
        return world;
    }

    private static initTiles(width: number, height: number): Tile[][] {
        const tiles: Tile[][] = [];
        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                tiles[y][x] = new Tile(x, y, TileType.GRASS);
            }
        }
        return tiles;
    }

    private static generateEdges(tiles: Tile[][], width: number, height: number): void {
        const edgeWidth = 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isEdge = x < edgeWidth || x >= width - edgeWidth ||
                              y < edgeWidth || y >= height - edgeWidth;

                if (isEdge) {
                    const rand = Math.random();
                    if (rand < 0.4) {
                        tiles[y][x].type = TileType.BOULDER;
                    } else if (rand < 0.7) {
                        tiles[y][x].type = TileType.CLIFF;
                    } else {
                        tiles[y][x].type = TileType.ROCK;
                    }
                }
            }
        }
    }

    private static generateRiver(
        tiles: Tile[][],
        width: number,
        height: number,
    ): { x: number; y: number; width: number }[] {
        const riverPath: { x: number; y: number; width: number }[] = [];

        let currentX = Math.floor(width * 0.15);
        let currentY = height - 3;
        let lastX = currentX;

        while (currentY > 2) {
            const riverWidth = 8 + Math.floor(Math.random() * 9);

            let newX = currentX;

            const drift = Math.random();
            if (drift < 0.35 && currentX > 20) {
                newX -= 1;
            } else if (drift > 0.65 && currentX < width - 20) {
                newX += 1;
            }

            if (Math.random() < 0.15) {
                const bigTurn = Math.random();
                if (bigTurn < 0.5 && currentX > 30) {
                    newX -= Math.floor(Math.random() * 5) + 2;
                } else if (currentX < width - 30) {
                    newX += Math.floor(Math.random() * 5) + 2;
                }
            }

            newX = Math.max(20, Math.min(width - 20, newX));

            if (lastX !== newX) {
                const step = lastX < newX ? 1 : -1;
                for (let x = lastX; x !== newX; x += step) {
                    riverPath.push({ x, y: currentY, width: riverWidth });
                }
            }

            riverPath.push({ x: newX, y: currentY, width: riverWidth });

            lastX = newX;
            currentX = newX;
            currentY -= 1;
        }

        for (let ty = 0; ty < height; ty++) {
            for (let tx = 0; tx < width; tx++) {
                const tile = tiles[ty][tx];

                if (tile.type === TileType.BOULDER ||
                    tile.type === TileType.CLIFF ||
                    tile.type === TileType.ROCK) {
                    continue;
                }

                let minDistance = Infinity;
                let nearestWidth = 0;

                for (const point of riverPath) {
                    const dx = tx - point.x;
                    const dy = ty - point.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestWidth = point.width;
                    }
                }

                if (minDistance <= nearestWidth * 0.3) {
                    tile.type = TileType.RIVER_DEEP;
                } else if (minDistance <= nearestWidth * 0.7) {
                    tile.type = TileType.RIVER_SHALLOW;
                } else if (minDistance <= nearestWidth + 1) {
                    tile.type = TileType.SHORELINE;
                } else if (minDistance <= nearestWidth + 2.5) {
                    tile.type = TileType.MUD;
                    if (Math.random() < 0.3) {
                        tile.setResource(ResourceType.MUD, Math.floor(Math.random() * 3) + 1);
                    }
                } else if (minDistance <= nearestWidth + 4) {
                    tile.type = TileType.DIRT;
                }
            }
        }

        return riverPath;
    }

    private static generateTrees(tiles: Tile[][], width: number, height: number): void {
        const treeCount = Math.floor(width * height * 0.02);

        for (let i = 0; i < treeCount; i++) {
            const x = Math.floor(Math.random() * (width - 20)) + 10;
            const y = Math.floor(Math.random() * (height - 20)) + 10;

            const tile = tiles[y][x];

            if (tile.type === TileType.GRASS || tile.type === TileType.DIRT) {
                tile.type = TileType.TREE;
                if (Math.random() < 0.5) {
                    tile.setResource(ResourceType.TWIGS, Math.floor(Math.random() * 3) + 1);
                }
            }
        }
    }

    private static generateResources(tiles: Tile[][], width: number, height: number): void {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = tiles[y][x];

                if (tile.type === TileType.SHORELINE && Math.random() < 0.2) {
                    tile.setResource(ResourceType.SHELLS, Math.floor(Math.random() * 3) + 1);
                } else if (tile.type === TileType.BOULDER && Math.random() < 0.1) {
                    tile.setResource(ResourceType.ROCKS, Math.floor(Math.random() * 2) + 1);
                }
            }
        }
    }
}
