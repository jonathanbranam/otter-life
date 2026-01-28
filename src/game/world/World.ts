import { Tile } from './Tile';
import { TileType } from './TileType';
import { ResourceType } from './Tile';

export class World {
    width: number;
    height: number;
    tiles: Tile[][];
    riverPath: { x: number; y: number; width: number }[] = [];

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
        // Generate river path from south to north with meandering
        this.riverPath = [];

        let currentX = Math.floor(this.width * 0.15); // Start 15% from left edge
        let currentY = this.height - 3; // Near bottom, inside edge
        let lastX = currentX;

        while (currentY > 2) {
            // Vary river width between 8 and 16 tiles
            const width = 8 + Math.floor(Math.random() * 9);

            // Calculate new X position
            let newX = currentX;

            // Move north with some random east/west drift
            const drift = Math.random();
            if (drift < 0.35 && currentX > 20) {
                newX -= 1; // Drift west
            } else if (drift > 0.65 && currentX < this.width - 20) {
                newX += 1; // Drift east
            }

            // Occasionally make bigger turns
            if (Math.random() < 0.15) {
                const bigTurn = Math.random();
                if (bigTurn < 0.5 && currentX > 30) {
                    newX -= Math.floor(Math.random() * 5) + 2;
                } else if (currentX < this.width - 30) {
                    newX += Math.floor(Math.random() * 5) + 2;
                }
            }

            // Keep within bounds
            newX = Math.max(20, Math.min(this.width - 20, newX));

            // Fill in all points between lastX and newX to ensure continuity
            if (lastX !== newX) {
                const step = lastX < newX ? 1 : -1;
                for (let x = lastX; x !== newX; x += step) {
                    this.riverPath.push({ x, y: currentY, width });
                }
            }

            // Add the current point
            this.riverPath.push({ x: newX, y: currentY, width });

            lastX = newX;
            currentX = newX;
            currentY -= 1;
        }

        // Now process every tile in the world based on distance to river path
        for (let ty = 0; ty < this.height; ty++) {
            for (let tx = 0; tx < this.width; tx++) {
                const tile = this.tiles[ty][tx];

                // Don't overwrite edge tiles
                if (tile.type === TileType.BOULDER ||
                    tile.type === TileType.CLIFF ||
                    tile.type === TileType.ROCK) {
                    continue;
                }

                // Find minimum distance to any point on the river path
                let minDistance = Infinity;
                let nearestWidth = 0;

                for (const point of this.riverPath) {
                    const dx = tx - point.x;
                    const dy = ty - point.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestWidth = point.width;
                    }
                }

                // Assign tile type based on distance to river
                if (minDistance <= nearestWidth * 0.3) {
                    // Deep river center
                    tile.type = TileType.RIVER_DEEP;
                } else if (minDistance <= nearestWidth * 0.7) {
                    // Shallow river
                    tile.type = TileType.RIVER_SHALLOW;
                } else if (minDistance <= nearestWidth + 1) {
                    // Shoreline
                    tile.type = TileType.SHORELINE;
                } else if (minDistance <= nearestWidth + 2.5) {
                    // Mud zone
                    tile.type = TileType.MUD;
                    if (Math.random() < 0.3) {
                        tile.setResource(ResourceType.MUD, Math.floor(Math.random() * 3) + 1);
                    }
                } else if (minDistance <= nearestWidth + 4) {
                    // Dirt transition
                    tile.type = TileType.DIRT;
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
