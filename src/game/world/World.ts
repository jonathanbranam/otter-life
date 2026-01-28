import { Tile } from './Tile';
import { TileType } from './TileType';
import { ResourceType } from './Tile';

export class World {
    width: number;
    height: number;
    tiles: Tile[][];

    constructor(width: number = 500, height: number = 500) {
        this.width = width;
        this.height = height;
        this.tiles = [];

        this.generateWorld();
    }

    generateWorld(): void {
        // Initialize all tiles as grass
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = new Tile(x, y, TileType.GRASS);
            }
        }

        // Generate edge barriers
        this.generateEdges();

        // Generate winding river from southwest to north
        this.generateRiver();

        // Add some trees scattered around
        this.generateTrees();

        // Add resources to tiles
        this.generateResources();
    }

    generateEdges(): void {
        const edgeWidth = 2;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const isEdge = x < edgeWidth || x >= this.width - edgeWidth ||
                              y < edgeWidth || y >= this.height - edgeWidth;

                if (isEdge) {
                    // Vary the edge tiles
                    const rand = Math.random();
                    if (rand < 0.4) {
                        this.tiles[y][x].type = TileType.BOULDER;
                    } else if (rand < 0.7) {
                        this.tiles[y][x].type = TileType.CLIFF;
                    } else {
                        this.tiles[y][x].type = TileType.ROCK;
                    }
                }
            }
        }
    }

    generateRiver(): void {
        // Start from southwest corner
        let currentX = Math.floor(this.width * 0.15); // Start 15% from left edge
        let currentY = this.height - 3; // Near bottom, inside edge

        const riverPath: { x: number; y: number; width: number }[] = [];

        // Generate river path from south to north with meandering and varying width
        while (currentY > 2) {
            // Vary river width between 8 and 16 tiles
            const width = 8 + Math.floor(Math.random() * 9);
            riverPath.push({ x: currentX, y: currentY, width });

            // Move north with some random east/west drift
            currentY -= 1;

            const drift = Math.random();
            if (drift < 0.35 && currentX > 20) {
                currentX -= 1; // Drift west
            } else if (drift > 0.65 && currentX < this.width - 20) {
                currentX += 1; // Drift east
            }

            // Occasionally make bigger turns
            if (Math.random() < 0.15) {
                const bigTurn = Math.random();
                if (bigTurn < 0.5 && currentX > 30) {
                    currentX -= Math.floor(Math.random() * 5) + 2;
                } else if (currentX < this.width - 30) {
                    currentX += Math.floor(Math.random() * 5) + 2;
                }
            }

            // Keep within bounds
            currentX = Math.max(20, Math.min(this.width - 20, currentX));
        }

        // Paint the river and surrounding tiles
        for (const point of riverPath) {
            const riverWidth = point.width;

            for (let dy = -riverWidth - 5; dy <= riverWidth + 5; dy++) {
                for (let dx = -riverWidth - 5; dx <= riverWidth + 5; dx++) {
                    const tx = point.x + dx;
                    const ty = point.y + dy;

                    if (this.isInBounds(tx, ty)) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const tile = this.tiles[ty][tx];

                        // Don't overwrite edge tiles
                        if (tile.type === TileType.BOULDER ||
                            tile.type === TileType.CLIFF ||
                            tile.type === TileType.ROCK) {
                            continue;
                        }

                        if (distance <= riverWidth * 0.3) {
                            // Deep river center
                            tile.type = TileType.RIVER_DEEP;
                        } else if (distance <= riverWidth * 0.7) {
                            // Shallow river
                            tile.type = TileType.RIVER_SHALLOW;
                        } else if (distance <= riverWidth + 1) {
                            // Shoreline
                            tile.type = TileType.SHORELINE;
                        } else if (distance <= riverWidth + 2.5) {
                            // Mud zone
                            tile.type = TileType.MUD;
                            if (Math.random() < 0.3) {
                                tile.setResource(ResourceType.MUD, Math.floor(Math.random() * 3) + 1);
                            }
                        } else if (distance <= riverWidth + 4) {
                            // Dirt transition
                            tile.type = TileType.DIRT;
                        }
                    }
                }
            }
        }

        // Add small islands in the river
        this.generateIslands(riverPath);
    }

    generateIslands(riverPath: { x: number; y: number; width: number }[]): void {
        // Place 5-10 small islands along the river
        const islandCount = 5 + Math.floor(Math.random() * 6);

        for (let i = 0; i < islandCount; i++) {
            // Pick a random point along the river
            const pathIndex = Math.floor(Math.random() * riverPath.length);
            const point = riverPath[pathIndex];

            // Place island near the center of the river
            const offsetX = Math.floor(Math.random() * 8) - 4;
            const offsetY = Math.floor(Math.random() * 8) - 4;
            const islandX = point.x + offsetX;
            const islandY = point.y + offsetY;

            // Island size: 2-4 tiles radius
            const islandRadius = 2 + Math.floor(Math.random() * 3);

            // Create the island
            for (let dy = -islandRadius; dy <= islandRadius; dy++) {
                for (let dx = -islandRadius; dx <= islandRadius; dx++) {
                    const tx = islandX + dx;
                    const ty = islandY + dy;

                    if (this.isInBounds(tx, ty)) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const tile = this.tiles[ty][tx];

                        // Only create islands in water tiles
                        if (tile.type !== TileType.RIVER_SHALLOW &&
                            tile.type !== TileType.RIVER_DEEP) {
                            continue;
                        }

                        if (distance <= islandRadius * 0.5) {
                            // Island center - grass or dirt
                            tile.type = Math.random() < 0.7 ? TileType.GRASS : TileType.DIRT;
                        } else if (distance <= islandRadius * 0.8) {
                            // Island edge - mud or dirt
                            tile.type = Math.random() < 0.5 ? TileType.MUD : TileType.DIRT;
                        } else if (distance <= islandRadius) {
                            // Island shore
                            tile.type = TileType.SHORELINE;
                        }

                        // Add some trees to islands
                        if ((tile.type === TileType.GRASS || tile.type === TileType.DIRT) &&
                            Math.random() < 0.2) {
                            tile.type = TileType.TREE;
                            if (Math.random() < 0.5) {
                                tile.setResource(ResourceType.TWIGS, Math.floor(Math.random() * 3) + 1);
                            }
                        }
                    }
                }
            }
        }
    }

    generateTrees(): void {
        // Add scattered trees, avoiding river and edges
        const treeCount = Math.floor(this.width * this.height * 0.02); // 2% coverage

        for (let i = 0; i < treeCount; i++) {
            const x = Math.floor(Math.random() * (this.width - 20)) + 10;
            const y = Math.floor(Math.random() * (this.height - 20)) + 10;

            const tile = this.tiles[y][x];

            // Only place trees on grass or dirt
            if (tile.type === TileType.GRASS || tile.type === TileType.DIRT) {
                tile.type = TileType.TREE;
                if (Math.random() < 0.5) {
                    tile.setResource(ResourceType.TWIGS, Math.floor(Math.random() * 3) + 1);
                }
            }
        }
    }

    generateResources(): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];

                // Add resources based on tile type
                if (tile.type === TileType.SHORELINE && Math.random() < 0.2) {
                    tile.setResource(ResourceType.SHELLS, Math.floor(Math.random() * 3) + 1);
                } else if (tile.type === TileType.BOULDER && Math.random() < 0.1) {
                    tile.setResource(ResourceType.ROCKS, Math.floor(Math.random() * 2) + 1);
                }
            }
        }
    }

    getTile(x: number, y: number): Tile | null {
        if (this.isInBounds(x, y)) {
            return this.tiles[y][x];
        }
        return null;
    }

    isInBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    canMoveTo(x: number, y: number, isSwimming: boolean = false): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;
        return tile.canEnter(isSwimming);
    }

    occupyTile(x: number, y: number, entity: any): boolean {
        const tile = this.getTile(x, y);
        if (tile && !tile.occupiedBy) {
            tile.occupy(entity);
            return true;
        }
        return false;
    }

    vacateTile(x: number, y: number): void {
        const tile = this.getTile(x, y);
        if (tile) {
            tile.vacate();
        }
    }
}
