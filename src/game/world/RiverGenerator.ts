import { River, RiverTile, RiverTileType } from './River';

const SKY_DEPTH = 3;
// Minimum: sky rows + 4 water rows + 1 bottom row
const MIN_MAX_DEPTH = SKY_DEPTH + 5;

export class RiverGenerator {
    static generate(riverPathLength: number, maxDepth: number = 32): River {
        if (maxDepth < MIN_MAX_DEPTH) {
            throw new Error(`maxDepth must be at least ${MIN_MAX_DEPTH} (${SKY_DEPTH} sky + 4 water + 1 bottom)`);
        }
        const bottomDepth = RiverGenerator.generateDepthProfile(riverPathLength, maxDepth);
        const tiles = RiverGenerator.buildTiles(riverPathLength, maxDepth, bottomDepth);
        return new River(tiles, SKY_DEPTH, bottomDepth);
    }

    private static generateDepthProfile(length: number, maxDepth: number): number[] {
        const bottomDepth: number[] = [];
        const entryExitLength = Math.floor(length * 0.033);
        const minBottomDepth = 4 + SKY_DEPTH;
        const maxBottomDepth = maxDepth - 1;

        for (let x = 0; x < length; x++) {
            let depth: number;

            if (x < entryExitLength) {
                const progress = x / entryExitLength;
                const easeIn = progress * progress;
                depth = minBottomDepth + Math.floor((maxBottomDepth - minBottomDepth) * 0.5 * easeIn);
            } else if (x >= length - entryExitLength) {
                const progress = (length - 1 - x) / entryExitLength;
                const easeIn = progress * progress;
                depth = minBottomDepth + Math.floor((maxBottomDepth - minBottomDepth) * 0.5 * easeIn);
            } else {
                const prevDepth = bottomDepth[x - 1] || (minBottomDepth + Math.floor((maxBottomDepth - minBottomDepth) * 0.5));
                const change = Math.random();
                let deltaDepth = 0;

                if (change < 0.3) {
                    deltaDepth = Math.floor(Math.random() * 3) - 1;
                } else if (change < 0.4) {
                    deltaDepth = -Math.floor(Math.random() * 4) - 2;
                } else if (change < 0.5) {
                    deltaDepth = Math.floor(Math.random() * 4) + 2;
                }

                depth = Math.max(minBottomDepth, Math.min(maxBottomDepth, prevDepth + deltaDepth));
            }

            bottomDepth[x] = depth;
        }

        return bottomDepth;
    }

    private static buildTiles(length: number, maxDepth: number, bottomDepth: number[]): RiverTile[][] {
        const tiles: RiverTile[][] = [];

        for (let y = 0; y < maxDepth; y++) {
            tiles[y] = [];
            for (let x = 0; x < length; x++) {
                let tileType: RiverTileType;

                if (y < SKY_DEPTH) {
                    tileType = RiverTileType.SKY;
                } else if (y >= bottomDepth[x]) {
                    tileType = RiverTileType.RIVER_BOTTOM;
                } else {
                    tileType = RiverTileType.WATER;
                }

                tiles[y][x] = new RiverTile(x, y, tileType);
            }
        }

        return tiles;
    }
}
