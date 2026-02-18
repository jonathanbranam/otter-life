import { describe, it, expect, beforeEach } from 'vitest';
import { GameSimulation } from './GameSimulation';
import { TileType } from '../world/TileType';

// Use a small world so generation is fast in tests
const SIM_SIZE = 30;

function makeSim(): GameSimulation {
    const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
    const spawn = sim.findSpawnPosition();
    sim.spawnPlayer(spawn.x, spawn.y);
    return sim;
}

function findTile(sim: GameSimulation, type: TileType): { x: number; y: number } | null {
    for (let y = 0; y < sim.world.height; y++) {
        for (let x = 0; x < sim.world.width; x++) {
            if (sim.world.getTile(x, y)?.type === type) return { x, y };
        }
    }
    return null;
}

// --- Construction and spawn ---

describe('GameSimulation construction', () => {
    it('creates a world with the requested dimensions', () => {
        const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
        expect(sim.world.width).toBe(SIM_SIZE);
        expect(sim.world.height).toBe(SIM_SIZE);
    });

    it('starts in overworld mode', () => {
        expect(makeSim().mode).toBe('overworld');
    });

    it('findSpawnPosition returns a tile the player can occupy', () => {
        const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
        const { x, y } = sim.findSpawnPosition();
        const tile = sim.world.getTile(x, y);
        expect(tile).not.toBeNull();
        expect(tile!.canEnter(false) || tile!.canEnter(true)).toBe(true);
    });

    it('spawnPlayer sets player coordinates', () => {
        const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
        const { x, y } = sim.findSpawnPosition();
        sim.spawnPlayer(x, y);
        expect(sim.player.tileX).toBe(x);
        expect(sim.player.tileY).toBe(y);
    });

    it('spawnPlayer occupies the tile', () => {
        const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
        const { x, y } = sim.findSpawnPosition();
        sim.spawnPlayer(x, y);
        expect(sim.world.getTile(x, y)?.occupiedBy).toBe(sim.player);
    });

    it('spawnPlayer sets isSwimming based on tile type', () => {
        const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.spawnPlayer(grass.x, grass.y);
        expect(sim.player.isSwimming).toBe(false);
    });
});

// --- Overworld movement ---

describe('GameSimulation.moveOverworld', () => {
    let sim: GameSimulation;

    beforeEach(() => { sim = makeSim(); });

    it('returns false when destination is a border blocking tile', () => {
        // edgeWidth=2: x=0 and x=1 are always BOULDER/CLIFF/ROCK.
        // Find a walkable tile at x=2, then try to step left into x=1.
        let placed = false;
        for (let y = 2; y < SIM_SIZE - 2; y++) {
            if (sim.cheatMoveOverworld(2, y)) { placed = true; break; }
        }
        expect(placed).toBe(true);
        expect(sim.moveOverworld(-1, 0)).toBe(false);
    });

    it('returns false when destination is a blocking tile', () => {
        const tree = findTile(sim, TileType.TREE);
        if (!tree) return;
        // Place player adjacent to the tree and try to walk into it
        const adjacent = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
        ];
        for (const { dx, dy } of adjacent) {
            const ax = tree.x - dx;
            const ay = tree.y - dy;
            if (sim.cheatMoveOverworld(ax, ay)) {
                expect(sim.moveOverworld(dx, dy)).toBe(false);
                return;
            }
        }
    });

    it('returns true and updates position on valid move', () => {
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.cheatMoveOverworld(grass.x, grass.y);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (sim.moveOverworld(dx, dy)) {
                expect(sim.player.tileX).toBe(grass.x + dx);
                expect(sim.player.tileY).toBe(grass.y + dy);
                return;
            }
        }
    });

    it('updates direction when moving', () => {
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.cheatMoveOverworld(grass.x, grass.y);

        const dirMap: Record<string, string> = {
            '1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up',
        };
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            sim.cheatMoveOverworld(grass.x, grass.y); // reset position
            if (sim.moveOverworld(dx, dy)) {
                expect(sim.player.direction).toBe(dirMap[`${dx},${dy}`]);
                return;
            }
        }
    });

    it('vacates the old tile on move', () => {
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.cheatMoveOverworld(grass.x, grass.y);
        const { tileX: oldX, tileY: oldY } = sim.player;

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (sim.moveOverworld(dx, dy)) {
                expect(sim.world.getTile(oldX, oldY)?.occupiedBy).toBeNull();
                return;
            }
        }
    });

    it('occupies the new tile on move', () => {
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.cheatMoveOverworld(grass.x, grass.y);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (sim.moveOverworld(dx, dy)) {
                expect(sim.world.getTile(sim.player.tileX, sim.player.tileY)?.occupiedBy)
                    .toBe(sim.player);
                return;
            }
        }
    });

    it('sets isSwimming when moving onto a water tile', () => {
        const shallow = findTile(sim, TileType.RIVER_SHALLOW);
        if (!shallow) return;
        sim.cheatMoveOverworld(shallow.x, shallow.y);
        expect(sim.player.isSwimming).toBe(true);
    });

    it('clears isSwimming when moving onto a land tile', () => {
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.cheatMoveOverworld(grass.x, grass.y);
        expect(sim.player.isSwimming).toBe(false);
    });
});

// --- River entry and exit ---

describe('GameSimulation river transitions', () => {
    let sim: GameSimulation;

    beforeEach(() => { sim = makeSim(); });

    it('tryEnterRiver returns null when not on RIVER_DEEP', () => {
        const grass = findTile(sim, TileType.GRASS);
        if (!grass) return;
        sim.cheatMoveOverworld(grass.x, grass.y);
        expect(sim.tryEnterRiver()).toBeNull();
        expect(sim.mode).toBe('overworld');
    });

    it('tryEnterRiver succeeds on RIVER_DEEP and switches mode', () => {
        const deep = findTile(sim, TileType.RIVER_DEEP);
        if (!deep) return;
        sim.cheatMoveOverworld(deep.x, deep.y);
        const result = sim.tryEnterRiver();
        expect(result).not.toBeNull();
        expect(sim.mode).toBe('river');
    });

    it('tryEnterRiver places player at first water row below sky', () => {
        const deep = findTile(sim, TileType.RIVER_DEEP);
        if (!deep) return;
        sim.cheatMoveOverworld(deep.x, deep.y);
        sim.tryEnterRiver();
        expect(sim.riverY).toBe(sim.world.river!.skyDepth + 1);
    });

    it('tryExitRiver returns null when y is not in exit zone', () => {
        // y=6 is always WATER (minDepth=7 so bottomDepth >= 7 > 6) and > 4
        // so the exit-zone check (y < 3 || y > 4) rejects it.
        const entered = sim.cheatEnterRiver(10, 6);
        expect(entered).toBe(true);
        expect(sim.tryExitRiver()).toBeNull();
        expect(sim.mode).toBe('river');
    });

    it('tryExitRiver succeeds at y=3', () => {
        sim.cheatEnterRiver(10, 3);
        const result = sim.tryExitRiver();
        expect(result).not.toBeNull();
        expect(sim.mode).toBe('overworld');
    });

    it('tryExitRiver succeeds at y=4', () => {
        sim.cheatEnterRiver(10, 4);
        const result = sim.tryExitRiver();
        expect(result).not.toBeNull();
        expect(sim.mode).toBe('overworld');
    });

    it('tryExitRiver returns overworld tile coordinates', () => {
        sim.cheatEnterRiver(10, 3);
        const result = sim.tryExitRiver();
        expect(result).not.toBeNull();
        expect(typeof result!.worldTileX).toBe('number');
        expect(typeof result!.worldTileY).toBe('number');
    });

    it('tryExitRiver restores player position in world', () => {
        sim.cheatEnterRiver(10, 3);
        const result = sim.tryExitRiver();
        if (!result) return;
        expect(sim.player.tileX).toBe(result.worldTileX);
        expect(sim.player.tileY).toBe(result.worldTileY);
    });
});

// --- River movement ---

describe('GameSimulation.moveRiver', () => {
    let sim: GameSimulation;

    beforeEach(() => { sim = makeSim(); });

    it('moves horizontally within valid river bounds', () => {
        // y=4 = skyDepth+1 = first water row; always valid since minDepth(=7) > 4
        sim.cheatEnterRiver(10, 4);
        expect(sim.moveRiver(1, 0)).toBe(true);
        expect(sim.riverX).toBe(11);
    });

    it('moves vertically within valid river bounds', () => {
        sim.cheatEnterRiver(10, 4);
        expect(sim.moveRiver(0, 1)).toBe(true);
        expect(sim.riverY).toBe(5);
    });

    it('updates direction when moving in river', () => {
        sim.cheatEnterRiver(10, 4);
        sim.moveRiver(-1, 0);
        expect(sim.player.direction).toBe('left');
        sim.moveRiver(1, 0);
        expect(sim.player.direction).toBe('right');
    });

    it('blocks movement into sky tile', () => {
        // skyDepth=3 → y=0,1,2 are sky; y=3 is the last water row before sky
        sim.cheatEnterRiver(10, 4);
        sim.moveRiver(0, -1); // y=3 (WATER) — should succeed
        expect(sim.riverY).toBe(3);
        expect(sim.moveRiver(0, -1)).toBe(false); // y=2 (SKY) — must be blocked
        expect(sim.riverY).toBe(3);
    });

    it('blocks movement into river bottom tile', () => {
        const river = sim.world.river!;
        const bottomY = river.bottomDepth[10]; // actual bottom depth at x=10
        sim.cheatEnterRiver(10, bottomY - 1); // one row above bottom
        expect(sim.moveRiver(0, 1)).toBe(false);
    });

    it('blocks movement out of river bounds (left edge)', () => {
        sim.cheatEnterRiver(0, 4);
        expect(sim.moveRiver(-1, 0)).toBe(false);
    });

    it('blocks movement out of river bounds (right edge)', () => {
        const river = sim.world.river!;
        sim.cheatEnterRiver(river.length - 1, 4);
        expect(sim.moveRiver(1, 0)).toBe(false);
    });
});

// --- Cheat commands ---

describe('GameSimulation cheat commands', () => {
    let sim: GameSimulation;

    beforeEach(() => { sim = makeSim(); });

    describe('cheatMoveOverworld', () => {
        it('teleports to any walkable tile and returns true', () => {
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            expect(sim.cheatMoveOverworld(grass.x, grass.y)).toBe(true);
            expect(sim.player.tileX).toBe(grass.x);
            expect(sim.player.tileY).toBe(grass.y);
        });

        it('sets mode to overworld', () => {
            sim.cheatEnterRiver(10, 4);
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            sim.cheatMoveOverworld(grass.x, grass.y);
            expect(sim.mode).toBe('overworld');
        });

        it('returns false for out-of-bounds coordinates', () => {
            expect(sim.cheatMoveOverworld(-1, 5)).toBe(false);
            expect(sim.cheatMoveOverworld(5, -1)).toBe(false);
            expect(sim.cheatMoveOverworld(SIM_SIZE, 5)).toBe(false);
        });

        it('returns false for blocking tiles', () => {
            // (0,0) is always a border BOULDER or CLIFF
            expect(sim.cheatMoveOverworld(0, 0)).toBe(false);
        });

        it('vacates old tile and occupies new tile', () => {
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            const oldX = sim.player.tileX;
            const oldY = sim.player.tileY;
            sim.cheatMoveOverworld(grass.x, grass.y);
            expect(sim.world.getTile(oldX, oldY)?.occupiedBy).toBeNull();
            expect(sim.world.getTile(grass.x, grass.y)?.occupiedBy).toBe(sim.player);
        });

        it('can return to the same tile (no self-block)', () => {
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            sim.cheatMoveOverworld(grass.x, grass.y);
            // Move away, then return
            sim.cheatEnterRiver(10, 4); // enters river without vacating the overworld tile
            expect(sim.cheatMoveOverworld(grass.x, grass.y)).toBe(true);
        });
    });

    describe('cheatEnterRiver', () => {
        it('switches mode to river at specified coordinates', () => {
            sim.cheatEnterRiver(10, 4);
            expect(sim.mode).toBe('river');
            expect(sim.riverX).toBe(10);
            expect(sim.riverY).toBe(4);
        });

        it('returns false for out-of-bounds river coordinates', () => {
            expect(sim.cheatEnterRiver(-1, 4)).toBe(false);
            expect(sim.cheatEnterRiver(10, -1)).toBe(false);
            expect(sim.cheatEnterRiver(10, sim.world.river!.maxDepth)).toBe(false);
        });

        it('returns false for sky tiles (y < skyDepth)', () => {
            expect(sim.cheatEnterRiver(10, 0)).toBe(false);
            expect(sim.cheatEnterRiver(10, 1)).toBe(false);
            expect(sim.cheatEnterRiver(10, 2)).toBe(false);
        });

        it('returns false for river bottom tile', () => {
            const river = sim.world.river!;
            const bottomY = river.bottomDepth[10];
            expect(sim.cheatEnterRiver(10, bottomY)).toBe(false);
        });
    });

    describe('cheatExitRiver', () => {
        it('switches mode to overworld at specified coordinates', () => {
            sim.cheatEnterRiver(10, 4);
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            expect(sim.cheatExitRiver(grass.x, grass.y)).toBe(true);
            expect(sim.mode).toBe('overworld');
            expect(sim.player.tileX).toBe(grass.x);
            expect(sim.player.tileY).toBe(grass.y);
        });

        it('returns false for blocking tiles', () => {
            sim.cheatEnterRiver(10, 4);
            expect(sim.cheatExitRiver(0, 0)).toBe(false);
            expect(sim.mode).toBe('river');
        });

        it('returns false for out-of-bounds coordinates', () => {
            sim.cheatEnterRiver(10, 4);
            expect(sim.cheatExitRiver(-1, 5)).toBe(false);
        });

        it('can surface to the same overworld tile the player dived from', () => {
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            sim.cheatMoveOverworld(grass.x, grass.y);
            sim.cheatEnterRiver(10, 4);
            expect(sim.cheatExitRiver(grass.x, grass.y)).toBe(true);
            expect(sim.player.tileX).toBe(grass.x);
        });

        it('occupies the destination tile', () => {
            sim.cheatEnterRiver(10, 4);
            const grass = findTile(sim, TileType.GRASS);
            if (!grass) return;
            sim.cheatExitRiver(grass.x, grass.y);
            expect(sim.world.getTile(grass.x, grass.y)?.occupiedBy).toBe(sim.player);
        });
    });
});
