import { Tile } from './Tile';
import { River } from './River';

export class World {
    width: number;
    height: number;
    tiles: Tile[][];
    riverPath: { x: number; y: number; width: number }[] = [];
    river: River | null = null;
    riverLength: number = 0;

    constructor(tiles: Tile[][]) {
        this.height = tiles.length;
        this.width = tiles[0]?.length ?? 0;
        this.tiles = tiles;
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

    // Find the river path index closest to a given world tile position
    findRiverPathIndex(worldX: number, worldY: number): number {
        let closestIndex = 0;
        let minDistance = Infinity;

        for (let i = 0; i < this.riverPath.length; i++) {
            const point = this.riverPath[i];
            const dx = worldX - point.x;
            const dy = worldY - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        return closestIndex;
    }

    // Get world coordinates from river path index
    getRiverPathPosition(index: number): { x: number; y: number } | null {
        if (index >= 0 && index < this.riverPath.length) {
            return { x: this.riverPath[index].x, y: this.riverPath[index].y };
        }
        return null;
    }
}
