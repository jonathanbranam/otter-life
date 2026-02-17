import { World } from '../world/World';
import { TileType } from '../world/TileType';
import { PlayerState, Direction } from './PlayerState';

export type GameMode = 'overworld' | 'river';

export interface EnterRiverResult {
    riverIndex: number;
}

export interface ExitRiverResult {
    worldTileX: number;
    worldTileY: number;
}

export class GameSimulation {
    world: World;
    player: PlayerState;
    mode: GameMode = 'overworld';

    // River-specific state
    riverX: number = 0;
    riverY: number = 0;
    entryRiverIndex: number = 0;

    constructor(worldWidth: number, worldHeight: number) {
        this.world = new World(worldWidth, worldHeight);
        // Player starts at 0,0; findSpawnPosition() should be called to place properly
        this.player = new PlayerState(0, 0);
    }

    /**
     * Find a walkable spawn position near the north end of the river.
     * Returns tile coordinates.
     */
    findSpawnPosition(): { x: number; y: number } {
        let startTileX: number;
        let startTileY: number;

        if (this.world.riverPath.length > 0) {
            // Get a point 10-20 tiles from the north end
            const tilesFromNorth = 10 + Math.floor(Math.random() * 11);
            const riverIndex = Math.max(0, this.world.riverPath.length - tilesFromNorth);
            const riverPoint = this.world.riverPath[riverIndex];

            // Start a few tiles to the side of the river
            startTileX = riverPoint.x + 5;
            startTileY = riverPoint.y;
        } else {
            startTileX = Math.floor(this.world.width / 2);
            startTileY = Math.floor(this.world.height / 2);
        }

        // Find a walkable tile near the target position (spiral search)
        for (let radius = 0; radius < 50; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const tx = startTileX + dx;
                    const ty = startTileY + dy;
                    if (this.world.canMoveTo(tx, ty, false)) {
                        return { x: tx, y: ty };
                    }
                }
            }
        }

        // Fallback
        return { x: startTileX, y: startTileY };
    }

    /**
     * Initialize the player at a given tile position.
     * Handles occupancy and swimming state.
     */
    spawnPlayer(tileX: number, tileY: number): void {
        this.player.tileX = tileX;
        this.player.tileY = tileY;

        this.world.occupyTile(tileX, tileY, this.player);

        const tile = this.world.getTile(tileX, tileY);
        if (tile) {
            this.player.isSwimming = tile.isWaterTile();
        }
    }

    // --- Overworld movement ---

    moveOverworld(dx: number, dy: number): boolean {
        const newTileX = this.player.tileX + dx;
        const newTileY = this.player.tileY + dy;

        if (!this.world.canMoveTo(newTileX, newTileY, this.player.isSwimming)) {
            return false;
        }

        // Update direction
        this.player.direction = directionFromDelta(dx, dy);

        // Vacate old, occupy new
        this.world.vacateTile(this.player.tileX, this.player.tileY);
        this.player.tileX = newTileX;
        this.player.tileY = newTileY;
        this.world.occupyTile(newTileX, newTileY, this.player);

        // Update swimming state
        const newTile = this.world.getTile(newTileX, newTileY);
        if (newTile) {
            this.player.isSwimming = newTile.isWaterTile();
        }

        return true;
    }

    // --- River entry/exit ---

    tryEnterRiver(): EnterRiverResult | null {
        const currentTile = this.world.getTile(this.player.tileX, this.player.tileY);
        if (!currentTile || currentTile.type !== TileType.RIVER_DEEP) {
            return null;
        }
        if (!this.world.river) {
            return null;
        }

        const riverIndex = this.world.findRiverPathIndex(this.player.tileX, this.player.tileY);

        // Switch to river mode
        this.mode = 'river';
        this.entryRiverIndex = riverIndex;
        this.riverX = riverIndex;
        this.riverY = this.world.river.skyDepth + 1;

        return { riverIndex };
    }

    tryExitRiver(): ExitRiverResult | null {
        // Can only exit near the surface (y = 3 or 4, just below sky)
        if (this.riverY < 3 || this.riverY > 4) {
            return null;
        }

        const exitPos = this.world.getRiverPathPosition(this.riverX);
        if (!exitPos) {
            return null;
        }

        // Switch to overworld mode
        this.mode = 'overworld';

        // Reposition player in overworld
        this.world.vacateTile(this.player.tileX, this.player.tileY);
        this.player.tileX = exitPos.x;
        this.player.tileY = exitPos.y;
        this.world.occupyTile(exitPos.x, exitPos.y, this.player);

        const exitTile = this.world.getTile(exitPos.x, exitPos.y);
        if (exitTile) {
            this.player.isSwimming = exitTile.isWaterTile();
        }

        return { worldTileX: exitPos.x, worldTileY: exitPos.y };
    }

    /**
     * Called when re-entering the river from a different overworld location.
     */
    handleRiverReentry(riverIndex: number): void {
        if (!this.world.river) return;

        this.mode = 'river';
        this.entryRiverIndex = riverIndex;
        this.riverX = riverIndex;
        this.riverY = this.world.river.skyDepth + 1;
    }

    /**
     * Called when returning to overworld from river.
     */
    handleOverworldReturn(riverIndex: number): void {
        this.mode = 'overworld';

        const exitPos = this.world.getRiverPathPosition(riverIndex);
        if (!exitPos) return;

        this.world.vacateTile(this.player.tileX, this.player.tileY);
        this.player.tileX = exitPos.x;
        this.player.tileY = exitPos.y;
        this.world.occupyTile(exitPos.x, exitPos.y, this.player);

        const exitTile = this.world.getTile(exitPos.x, exitPos.y);
        if (exitTile) {
            this.player.isSwimming = exitTile.isWaterTile();
        }
    }

    // --- River movement ---

    moveRiver(dx: number, dy: number): boolean {
        if (!this.world.river) return false;

        const newX = this.riverX + dx;
        const newY = this.riverY + dy;

        if (!this.world.river.isInBounds(newX, newY)) {
            return false;
        }

        if (!this.world.river.canMoveTo(newX, newY)) {
            return false;
        }

        this.player.direction = directionFromDelta(dx, dy);
        this.riverX = newX;
        this.riverY = newY;

        return true;
    }
}

function directionFromDelta(dx: number, dy: number): Direction {
    if (dx > 0) return 'right';
    if (dx < 0) return 'left';
    if (dy < 0) return 'up';
    return 'down';
}
