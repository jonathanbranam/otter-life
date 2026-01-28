export enum RiverTileType {
    SKY = 'sky',
    WATER = 'water',
    RIVER_BOTTOM = 'river_bottom'
}

export class RiverTile {
    x: number;
    y: number;
    type: RiverTileType;

    constructor(x: number, y: number, type: RiverTileType) {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    isWalkable(): boolean {
        return this.type === RiverTileType.WATER;
    }

    isSky(): boolean {
        return this.type === RiverTileType.SKY;
    }
}

export class River {
    length: number; // Length in tiles (matches riverPath length)
    depth: number = 20; // Depth in tiles
    tiles: RiverTile[][];
    skyDepth: number = 3; // Top 3 tiles are sky

    constructor(riverPathLength: number) {
        this.length = riverPathLength;
        this.tiles = [];

        this.generateRiver();
    }

    generateRiver(): void {
        // Initialize all tiles
        for (let y = 0; y < this.depth; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.length; x++) {
                let tileType: RiverTileType;

                if (y < this.skyDepth) {
                    // Top tiles are sky
                    tileType = RiverTileType.SKY;
                } else if (y >= this.depth - 1) {
                    // Bottom tile is river bottom
                    tileType = RiverTileType.RIVER_BOTTOM;
                } else {
                    // Middle tiles are water
                    tileType = RiverTileType.WATER;
                }

                this.tiles[y][x] = new RiverTile(x, y, tileType);
            }
        }
    }

    getTile(x: number, y: number): RiverTile | null {
        if (this.isInBounds(x, y)) {
            return this.tiles[y][x];
        }
        return null;
    }

    isInBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.length && y >= 0 && y < this.depth;
    }

    canMoveTo(x: number, y: number): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;
        return tile.isWalkable();
    }
}
