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
    maxDepth: number = 32; // Maximum total depth in tiles
    tiles: RiverTile[][];
    skyDepth: number = 3; // Top 3 tiles are sky
    bottomDepth: number[]; // Depth of river bottom at each x position (y-coordinate where bottom starts)

    constructor(riverPathLength: number) {
        this.length = riverPathLength;
        this.tiles = [];
        this.bottomDepth = [];

        this.generateRiver();
    }

    generateRiver(): void {
        // Generate varying depth profile
        this.generateDepthProfile();

        // Initialize all tiles based on depth profile
        for (let y = 0; y < this.maxDepth; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.length; x++) {
                const riverBottom = this.bottomDepth[x];
                let tileType: RiverTileType;

                if (y < this.skyDepth) {
                    // Top tiles are sky
                    tileType = RiverTileType.SKY;
                } else if (y >= riverBottom) {
                    // At or below river bottom
                    tileType = RiverTileType.RIVER_BOTTOM;
                } else {
                    // Water tiles
                    tileType = RiverTileType.WATER;
                }

                this.tiles[y][x] = new RiverTile(x, y, tileType);
            }
        }
    }

    generateDepthProfile(): void {
        this.bottomDepth = [];

        // Define entrance and exit zones (3.3% of river length each for 3x faster transition)
        const entryExitLength = Math.floor(this.length * 0.033);
        const minDepth = 4 + this.skyDepth; // Minimum total depth (4 tiles of water + 3 sky)
        const maxDepth = this.maxDepth - 1; // Max is 31, so y=31 is always river bottom

        for (let x = 0; x < this.length; x++) {
            let depth: number;

            // Entry zone - gradually deepen
            if (x < entryExitLength) {
                const progress = x / entryExitLength;
                const easeIn = progress * progress; // Quadratic ease-in
                depth = minDepth + Math.floor((maxDepth - minDepth) * 0.5 * easeIn);
            }
            // Exit zone - gradually shallow
            else if (x >= this.length - entryExitLength) {
                const progress = (this.length - 1 - x) / entryExitLength;
                const easeIn = progress * progress; // Quadratic ease-in
                depth = minDepth + Math.floor((maxDepth - minDepth) * 0.5 * easeIn);
            }
            // Middle section - varying depth
            else {
                // Use previous depth as baseline
                const prevDepth = this.bottomDepth[x - 1] || (minDepth + Math.floor((maxDepth - minDepth) * 0.5));

                // Random change with bias toward gradual changes
                const change = Math.random();
                let deltaDepth = 0;

                if (change < 0.3) {
                    // Gradual change (70% chance)
                    deltaDepth = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                } else if (change < 0.4) {
                    // Steeper change upward (10% chance)
                    deltaDepth = -Math.floor(Math.random() * 4) - 2; // -2 to -5
                } else if (change < 0.5) {
                    // Steeper change downward (10% chance)
                    deltaDepth = Math.floor(Math.random() * 4) + 2; // 2 to 5
                }
                // 50% chance - no change

                depth = prevDepth + deltaDepth;

                // Clamp to valid range (max is 31, ensuring y=31 always has river bottom)
                depth = Math.max(minDepth, Math.min(maxDepth, depth));
            }

            this.bottomDepth[x] = depth;
        }
    }

    getTile(x: number, y: number): RiverTile | null {
        if (this.isInBounds(x, y)) {
            return this.tiles[y][x];
        }
        return null;
    }

    isInBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.length && y >= 0 && y < this.maxDepth;
    }

    canMoveTo(x: number, y: number): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;
        return tile.isWalkable();
    }

    getRiverDepthAt(x: number): number {
        if (x >= 0 && x < this.length) {
            return this.bottomDepth[x];
        }
        return this.maxDepth;
    }
}
