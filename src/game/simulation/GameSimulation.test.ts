import { describe, it, expect, beforeEach } from 'vitest';
import { GameSimulation } from './GameSimulation';
import {
    createTestSim,
    GRASS, DIRT, MUD, SHALLOW, DEEP, TREE, BORDER,
    DIVE_X, WATER_Y, NEAR_SKY_Y, EXIT_Y, BOTTOM_Y, RIVER_LENGTH,
    WIDTH, HEIGHT,
} from '../testing/fixtures';

// ── Construction and spawn ────────────────────────────────────────────────────
// These tests exercise the real GameSimulation constructor and world generation.

describe('GameSimulation construction', () => {
    it('creates a world with the requested dimensions', () => {
        const sim = new GameSimulation(WIDTH, HEIGHT);
        expect(sim.world.width).toBe(WIDTH);
        expect(sim.world.height).toBe(HEIGHT);
    });

    it('starts in overworld mode', () => {
        // True for both real-generated worlds and the fixture
        expect(new GameSimulation(WIDTH, HEIGHT).mode).toBe('overworld');
        expect(createTestSim().mode).toBe('overworld');
    });

    it('findSpawnPosition returns a tile the player can enter', () => {
        const sim = new GameSimulation(WIDTH, HEIGHT);
        const { x, y } = sim.findSpawnPosition();
        const tile = sim.world.getTile(x, y);
        expect(tile).not.toBeNull();
        expect(tile!.canEnter(false) || tile!.canEnter(true)).toBe(true);
    });

    it('spawnPlayer sets player coordinates and occupies the tile', () => {
        const sim = new GameSimulation(WIDTH, HEIGHT);
        const { x, y } = sim.findSpawnPosition();
        sim.spawnPlayer(x, y);
        expect(sim.player.tileX).toBe(x);
        expect(sim.player.tileY).toBe(y);
        expect(sim.world.getTile(x, y)?.occupiedBy).toBe(sim.player);
    });

    // Fixture-based spawn checks (deterministic positions)
    it('fixture: player spawns at GRASS and isSwimming is false', () => {
        const sim = createTestSim();
        expect(sim.player.tileX).toBe(GRASS.x);
        expect(sim.player.tileY).toBe(GRASS.y);
        expect(sim.player.isSwimming).toBe(false);
        expect(sim.world.getTile(GRASS.x, GRASS.y)?.occupiedBy).toBe(sim.player);
    });
});

// ── Overworld movement ────────────────────────────────────────────────────────

describe('GameSimulation.moveOverworld', () => {
    let sim: GameSimulation;
    beforeEach(() => { sim = createTestSim(); });

    it('returns false when destination is a border tile (BOULDER)', () => {
        // x=2 is just inside the 2-tile border; stepping left hits x=1 (BOULDER)
        let placed = false;
        for (let y = 2; y < HEIGHT - 2; y++) {
            if (sim.cheatMoveOverworld(2, y)) { placed = true; break; }
        }
        expect(placed).toBe(true);
        expect(sim.moveOverworld(-1, 0)).toBe(false);
    });

    it('returns false when destination is a TREE', () => {
        // (4,14) is GRASS directly west of TREE at (5,14)
        sim.cheatMoveOverworld(4, 14);
        expect(sim.moveOverworld(1, 0)).toBe(false);
    });

    it('moves north onto DIRT and updates position', () => {
        // GRASS=(5,5), north is DIRT=(5,4) — both walkable
        expect(sim.moveOverworld(0, -1)).toBe(true);
        expect(sim.player.tileX).toBe(DIRT.x);
        expect(sim.player.tileY).toBe(DIRT.y);
    });

    it('moves east onto GRASS and updates position', () => {
        expect(sim.moveOverworld(1, 0)).toBe(true);
        expect(sim.player.tileX).toBe(GRASS.x + 1);
        expect(sim.player.tileY).toBe(GRASS.y);
    });

    it('updates direction to "up" when moving north', () => {
        sim.moveOverworld(0, -1);
        expect(sim.player.direction).toBe('up');
    });

    it('updates direction to "right" when moving east', () => {
        sim.moveOverworld(1, 0);
        expect(sim.player.direction).toBe('right');
    });

    it('updates direction to "down" when moving south', () => {
        sim.moveOverworld(0, 1);
        expect(sim.player.direction).toBe('down');
    });

    it('updates direction to "left" when moving west', () => {
        sim.moveOverworld(-1, 0);
        expect(sim.player.direction).toBe('left');
    });

    it('vacates the old tile on a successful move', () => {
        const { tileX: ox, tileY: oy } = sim.player;
        sim.moveOverworld(1, 0);
        expect(sim.world.getTile(ox, oy)?.occupiedBy).toBeNull();
    });

    it('occupies the new tile on a successful move', () => {
        sim.moveOverworld(1, 0);
        expect(sim.world.getTile(sim.player.tileX, sim.player.tileY)?.occupiedBy)
            .toBe(sim.player);
    });

    it('does not change occupancy on a blocked move', () => {
        sim.cheatMoveOverworld(4, 14); // west of TREE at (5,14)
        const ox = sim.player.tileX;
        const oy = sim.player.tileY;
        sim.moveOverworld(1, 0); // blocked
        expect(sim.world.getTile(ox, oy)?.occupiedBy).toBe(sim.player);
        expect(sim.world.getTile(TREE.x, TREE.y)?.occupiedBy).toBeNull();
    });

    it('sets isSwimming=true when moving onto RIVER_SHALLOW', () => {
        // (10,8) is SHORELINE; step east into SHALLOW at (11,8)
        sim.cheatMoveOverworld(10, 8);
        sim.moveOverworld(1, 0);
        expect(sim.player.isSwimming).toBe(true);
    });

    it('clears isSwimming when moving from SHALLOW onto SHORELINE', () => {
        sim.cheatMoveOverworld(SHALLOW.x, SHALLOW.y);
        expect(sim.player.isSwimming).toBe(true);
        sim.moveOverworld(-1, 0); // → (10,8) SHORELINE
        expect(sim.player.isSwimming).toBe(false);
    });
});

// ── River entry and exit ──────────────────────────────────────────────────────

describe('GameSimulation river transitions', () => {
    let sim: GameSimulation;
    beforeEach(() => { sim = createTestSim(); });

    it('tryEnterRiver returns null when not on RIVER_DEEP (GRASS)', () => {
        expect(sim.tryEnterRiver()).toBeNull();
        expect(sim.mode).toBe('overworld');
    });

    it('tryEnterRiver returns null on RIVER_SHALLOW (not deep enough)', () => {
        sim.cheatMoveOverworld(SHALLOW.x, SHALLOW.y);
        expect(sim.tryEnterRiver()).toBeNull();
    });

    it('tryEnterRiver succeeds on RIVER_DEEP and switches to river mode', () => {
        sim.cheatMoveOverworld(DEEP.x, DEEP.y);
        expect(sim.tryEnterRiver()).not.toBeNull();
        expect(sim.mode).toBe('river');
    });

    it('tryEnterRiver places player at river column matching the dive point', () => {
        sim.cheatMoveOverworld(DEEP.x, DEEP.y);
        sim.tryEnterRiver();
        // DEEP at (13,8) maps to riverPath index 4 = DIVE_X
        expect(sim.riverX).toBe(DIVE_X);
    });

    it('tryEnterRiver places player at the first water row (skyDepth+1)', () => {
        sim.cheatMoveOverworld(DEEP.x, DEEP.y);
        sim.tryEnterRiver();
        expect(sim.riverY).toBe(sim.world.river!.skyDepth + 1);
    });

    it('tryExitRiver returns null when below the exit zone (y=6)', () => {
        // WATER_Y=6 > 4, so outside the exit zone
        sim.cheatEnterRiver(DIVE_X, WATER_Y);
        expect(sim.tryExitRiver()).toBeNull();
        expect(sim.mode).toBe('river');
    });

    it('tryExitRiver succeeds at EXIT_Y=3', () => {
        sim.cheatEnterRiver(DIVE_X, EXIT_Y);
        expect(sim.tryExitRiver()).not.toBeNull();
        expect(sim.mode).toBe('overworld');
    });

    it('tryExitRiver succeeds at y=4', () => {
        sim.cheatEnterRiver(DIVE_X, 4);
        expect(sim.tryExitRiver()).not.toBeNull();
        expect(sim.mode).toBe('overworld');
    });

    it('tryExitRiver restores player to the correct overworld tile', () => {
        sim.cheatEnterRiver(DIVE_X, EXIT_Y);
        const result = sim.tryExitRiver()!;
        // riverPath[DIVE_X=4] = {x:13, y:8} = DEEP
        expect(result.worldTileX).toBe(DEEP.x);
        expect(result.worldTileY).toBe(DEEP.y);
        expect(sim.player.tileX).toBe(DEEP.x);
        expect(sim.player.tileY).toBe(DEEP.y);
    });
});

// ── River movement ────────────────────────────────────────────────────────────

describe('GameSimulation.moveRiver', () => {
    let sim: GameSimulation;
    beforeEach(() => {
        sim = createTestSim();
        sim.cheatEnterRiver(DIVE_X, WATER_Y); // (4, 6) — safe water position
    });

    it('moves east (dx=+1)', () => {
        expect(sim.moveRiver(1, 0)).toBe(true);
        expect(sim.riverX).toBe(DIVE_X + 1);
        expect(sim.player.direction).toBe('right');
    });

    it('moves west (dx=-1)', () => {
        expect(sim.moveRiver(-1, 0)).toBe(true);
        expect(sim.riverX).toBe(DIVE_X - 1);
        expect(sim.player.direction).toBe('left');
    });

    it('moves down (dy=+1)', () => {
        expect(sim.moveRiver(0, 1)).toBe(true);
        expect(sim.riverY).toBe(WATER_Y + 1);
        expect(sim.player.direction).toBe('down');
    });

    it('moves up (dy=-1)', () => {
        expect(sim.moveRiver(0, -1)).toBe(true);
        expect(sim.riverY).toBe(WATER_Y - 1);
        expect(sim.player.direction).toBe('up');
    });

    it('blocks movement into a SKY tile', () => {
        // NEAR_SKY_Y=4: one step up reaches y=3 (last water), another hits y=2 (SKY)
        sim.cheatEnterRiver(DIVE_X, NEAR_SKY_Y);
        expect(sim.moveRiver(0, -1)).toBe(true);   // → y=3 (WATER)
        expect(sim.riverY).toBe(3);
        expect(sim.moveRiver(0, -1)).toBe(false);  // → y=2 (SKY) blocked
        expect(sim.riverY).toBe(3);
    });

    it('blocks movement into the RIVER_BOTTOM', () => {
        // BOTTOM_Y=20; place one row above and step down
        sim.cheatEnterRiver(DIVE_X, BOTTOM_Y - 1);
        expect(sim.moveRiver(0, 1)).toBe(false);
        expect(sim.riverY).toBe(BOTTOM_Y - 1);
    });

    it('blocks movement past the left edge (x=0)', () => {
        sim.cheatEnterRiver(0, WATER_Y);
        expect(sim.moveRiver(-1, 0)).toBe(false);
    });

    it('blocks movement past the right edge', () => {
        sim.cheatEnterRiver(RIVER_LENGTH - 1, WATER_Y);
        expect(sim.moveRiver(1, 0)).toBe(false);
    });
});

// ── Cheat commands ────────────────────────────────────────────────────────────

describe('cheatMoveOverworld', () => {
    let sim: GameSimulation;
    beforeEach(() => { sim = createTestSim(); });

    it('teleports to MUD tile and updates coordinates', () => {
        expect(sim.cheatMoveOverworld(MUD.x, MUD.y)).toBe(true);
        expect(sim.player.tileX).toBe(MUD.x);
        expect(sim.player.tileY).toBe(MUD.y);
    });

    it('teleports to a water tile and sets isSwimming=true', () => {
        expect(sim.cheatMoveOverworld(DEEP.x, DEEP.y)).toBe(true);
        expect(sim.player.isSwimming).toBe(true);
    });

    it('sets mode to overworld when called from river', () => {
        sim.cheatEnterRiver(DIVE_X, WATER_Y);
        sim.cheatMoveOverworld(GRASS.x, GRASS.y);
        expect(sim.mode).toBe('overworld');
    });

    it('returns false for out-of-bounds coordinates', () => {
        expect(sim.cheatMoveOverworld(-1, GRASS.y)).toBe(false);
        expect(sim.cheatMoveOverworld(GRASS.x, -1)).toBe(false);
        expect(sim.cheatMoveOverworld(WIDTH, GRASS.y)).toBe(false);
    });

    it('returns false for blocking tiles (BORDER and TREE)', () => {
        expect(sim.cheatMoveOverworld(BORDER.x, BORDER.y)).toBe(false);
        expect(sim.cheatMoveOverworld(TREE.x, TREE.y)).toBe(false);
    });

    it('vacates old tile and occupies new tile', () => {
        const { tileX: ox, tileY: oy } = sim.player;
        sim.cheatMoveOverworld(DIRT.x, DIRT.y);
        expect(sim.world.getTile(ox, oy)?.occupiedBy).toBeNull();
        expect(sim.world.getTile(DIRT.x, DIRT.y)?.occupiedBy).toBe(sim.player);
    });

    it('can return to the current tile (no self-block)', () => {
        // cheatEnterRiver keeps the overworld tile "occupied" in the current impl
        sim.cheatEnterRiver(DIVE_X, WATER_Y);
        expect(sim.cheatMoveOverworld(GRASS.x, GRASS.y)).toBe(true);
    });
});

describe('cheatEnterRiver', () => {
    let sim: GameSimulation;
    beforeEach(() => { sim = createTestSim(); });

    it('switches to river mode at the specified coordinates', () => {
        expect(sim.cheatEnterRiver(DIVE_X, WATER_Y)).toBe(true);
        expect(sim.mode).toBe('river');
        expect(sim.riverX).toBe(DIVE_X);
        expect(sim.riverY).toBe(WATER_Y);
    });

    it('returns false for out-of-bounds river coordinates', () => {
        expect(sim.cheatEnterRiver(-1, WATER_Y)).toBe(false);
        expect(sim.cheatEnterRiver(DIVE_X, -1)).toBe(false);
        expect(sim.cheatEnterRiver(RIVER_LENGTH, WATER_Y)).toBe(false); // x=10 out of bounds
    });

    it('returns false for SKY tiles (y < skyDepth=3)', () => {
        expect(sim.cheatEnterRiver(DIVE_X, 0)).toBe(false);
        expect(sim.cheatEnterRiver(DIVE_X, 1)).toBe(false);
        expect(sim.cheatEnterRiver(DIVE_X, 2)).toBe(false);
    });

    it('returns false for RIVER_BOTTOM tiles (y >= BOTTOM_Y)', () => {
        expect(sim.cheatEnterRiver(DIVE_X, BOTTOM_Y)).toBe(false);
        expect(sim.cheatEnterRiver(DIVE_X, BOTTOM_Y + 5)).toBe(false);
    });
});

describe('cheatExitRiver', () => {
    let sim: GameSimulation;
    beforeEach(() => {
        sim = createTestSim();
        sim.cheatEnterRiver(DIVE_X, WATER_Y);
    });

    it('switches to overworld at specified coordinates', () => {
        expect(sim.cheatExitRiver(GRASS.x, GRASS.y)).toBe(true);
        expect(sim.mode).toBe('overworld');
        expect(sim.player.tileX).toBe(GRASS.x);
        expect(sim.player.tileY).toBe(GRASS.y);
    });

    it('occupies the destination tile', () => {
        sim.cheatExitRiver(GRASS.x, GRASS.y);
        expect(sim.world.getTile(GRASS.x, GRASS.y)?.occupiedBy).toBe(sim.player);
    });

    it('returns false for blocking tiles — mode stays river', () => {
        expect(sim.cheatExitRiver(BORDER.x, BORDER.y)).toBe(false);
        expect(sim.cheatExitRiver(TREE.x, TREE.y)).toBe(false);
        expect(sim.mode).toBe('river');
    });

    it('returns false for out-of-bounds coordinates', () => {
        expect(sim.cheatExitRiver(-1, GRASS.y)).toBe(false);
    });

    it('can surface to the overworld tile the player was on before diving', () => {
        const sim2 = createTestSim(); // spawns at GRASS
        sim2.cheatEnterRiver(DIVE_X, WATER_Y);
        expect(sim2.cheatExitRiver(GRASS.x, GRASS.y)).toBe(true);
        expect(sim2.player.tileX).toBe(GRASS.x);
    });
});
