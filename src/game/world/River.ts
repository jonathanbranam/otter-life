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
    length: number;
    maxDepth: number;
    tiles: RiverTile[][];
    skyDepth: number;
    bottomDepth: number[];

    constructor(tiles: RiverTile[][], skyDepth: number, bottomDepth: number[]) {
        this.maxDepth = tiles.length;
        this.length = tiles[0]?.length ?? 0;
        this.tiles = tiles;
        this.skyDepth = skyDepth;
        this.bottomDepth = bottomDepth;
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
