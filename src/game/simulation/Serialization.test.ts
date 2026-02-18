import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from './Serialization';
import { ResourceType } from '../world/Tile';
import {
    createTestSim,
    GRASS, MUD, DEEP,
    DIVE_X, WATER_Y, EXIT_Y,
    WIDTH, HEIGHT, RIVER_LENGTH, SKY_DEPTH, BOTTOM_Y,
} from '../testing/fixtures';

function roundTrip(sim: ReturnType<typeof createTestSim>) {
    return deserialize(serialize(sim));
}

describe('Serialization', () => {
    describe('player state round-trip', () => {
        it('preserves player position', () => {
            const sim = createTestSim();
            const restored = roundTrip(sim);
            expect(restored.player.tileX).toBe(GRASS.x);
            expect(restored.player.tileY).toBe(GRASS.y);
        });

        it('preserves player direction', () => {
            const sim = createTestSim();
            sim.player.direction = 'left';
            expect(roundTrip(sim).player.direction).toBe('left');
        });

        it('preserves isSwimming=true', () => {
            const sim = createTestSim();
            sim.player.isSwimming = true;
            expect(roundTrip(sim).player.isSwimming).toBe(true);
        });

        it('preserves isSwimming=false', () => {
            const sim = createTestSim();
            sim.player.isSwimming = false;
            expect(roundTrip(sim).player.isSwimming).toBe(false);
        });
    });

    describe('game mode round-trip', () => {
        it('preserves overworld mode', () => {
            expect(roundTrip(createTestSim()).mode).toBe('overworld');
        });

        it('preserves river mode with exact coordinates', () => {
            const sim = createTestSim();
            sim.cheatEnterRiver(DIVE_X, WATER_Y);
            const restored = roundTrip(sim);
            expect(restored.mode).toBe('river');
            expect(restored.riverX).toBe(DIVE_X);
            expect(restored.riverY).toBe(WATER_Y);
        });

        it('preserves entryRiverIndex set by tryEnterRiver', () => {
            const sim = createTestSim();
            sim.cheatMoveOverworld(DEEP.x, DEEP.y);
            sim.tryEnterRiver(); // sets entryRiverIndex = DIVE_X
            const restored = roundTrip(sim);
            expect(restored.entryRiverIndex).toBe(sim.entryRiverIndex);
            expect(restored.entryRiverIndex).toBe(DIVE_X);
        });
    });

    describe('world state round-trip', () => {
        it('preserves world dimensions', () => {
            const restored = roundTrip(createTestSim());
            expect(restored.world.width).toBe(WIDTH);
            expect(restored.world.height).toBe(HEIGHT);
        });

        it('preserves every tile type', () => {
            const sim = createTestSim();
            const restored = roundTrip(sim);
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    expect(restored.world.getTile(x, y)?.type)
                        .toBe(sim.world.getTile(x, y)?.type);
                }
            }
        });

        it('preserves river path', () => {
            const sim = createTestSim();
            const restored = roundTrip(sim);
            expect(restored.world.riverPath).toEqual(sim.world.riverPath);
            expect(restored.world.riverPath).toHaveLength(RIVER_LENGTH);
        });
    });

    describe('river data round-trip', () => {
        it('preserves river length and depth constants', () => {
            const restored = roundTrip(createTestSim());
            expect(restored.world.river!.length).toBe(RIVER_LENGTH);
            expect(restored.world.river!.skyDepth).toBe(SKY_DEPTH);
        });

        it('preserves bottomDepth profile', () => {
            const sim = createTestSim();
            const restored = roundTrip(sim);
            expect(restored.world.river!.bottomDepth)
                .toEqual(sim.world.river!.bottomDepth);
            // All columns share the same known bottom depth
            expect(restored.world.river!.bottomDepth.every(d => d === BOTTOM_Y)).toBe(true);
        });

        it('reconstructs correct tile types from bottomDepth', () => {
            const river = roundTrip(createTestSim()).world.river!;
            const x = DIVE_X; // sample column 4

            // SKY rows
            for (let y = 0; y < SKY_DEPTH; y++) {
                expect(river.getTile(x, y)?.type).toBe('sky');
            }
            // Last WATER row (one above bottom)
            expect(river.getTile(x, BOTTOM_Y - 1)?.type).toBe('water');
            // First RIVER_BOTTOM row
            expect(river.getTile(x, BOTTOM_Y)?.type).toBe('river_bottom');
        });
    });

    describe('resources round-trip', () => {
        it('restores the MUD resource type and count at the known MUD tile', () => {
            // MUD at (5,7) has resourceType=MUD, resourceCount=2 in the fixture
            const restored = roundTrip(createTestSim());
            const tile = restored.world.getTile(MUD.x, MUD.y);
            expect(tile?.resourceType).toBe(ResourceType.MUD);
            expect(tile?.resourceCount).toBe(2);
        });

        it('tiles without resources have null resourceType after round-trip', () => {
            // GRASS at (5,5) has no resource
            const restored = roundTrip(createTestSim());
            expect(restored.world.getTile(GRASS.x, GRASS.y)?.resourceType).toBeNull();
        });

        it('harvesting a resource is reflected after round-trip', () => {
            const sim = createTestSim();
            sim.world.getTile(MUD.x, MUD.y)!.harvestResource(); // count: 2 → 1
            const restored = roundTrip(sim);
            expect(restored.world.getTile(MUD.x, MUD.y)?.resourceCount).toBe(1);
        });
    });

    describe('occupancy restoration', () => {
        it("re-establishes the player's tile occupancy", () => {
            const restored = roundTrip(createTestSim());
            const { tileX, tileY } = restored.player;
            expect(restored.world.getTile(tileX, tileY)?.occupiedBy).toBe(restored.player);
        });

        it('exactly one tile is occupied after round-trip', () => {
            const restored = roundTrip(createTestSim());
            let occupied = 0;
            for (let y = 0; y < HEIGHT; y++)
                for (let x = 0; x < WIDTH; x++)
                    if (restored.world.getTile(x, y)?.occupiedBy) occupied++;
            expect(occupied).toBe(1);
        });

        it('player tile is at the known GRASS spawn after round-trip', () => {
            const restored = roundTrip(createTestSim());
            expect(restored.player.tileX).toBe(GRASS.x);
            expect(restored.player.tileY).toBe(GRASS.y);
            expect(restored.world.getTile(GRASS.x, GRASS.y)?.occupiedBy).toBe(restored.player);
        });

        it('saves and restores river-mode state, occupancy stays in overworld', () => {
            const sim = createTestSim();
            sim.cheatEnterRiver(DIVE_X, EXIT_Y);
            const restored = roundTrip(sim);
            expect(restored.mode).toBe('river');
            // Overworld player tile is still tracked (occupied by player)
            expect(restored.world.getTile(restored.player.tileX, restored.player.tileY)?.occupiedBy)
                .toBe(restored.player);
        });
    });

    describe('error handling', () => {
        it('throws on unsupported save version', () => {
            const bad = JSON.stringify({ version: 999 });
            expect(() => deserialize(bad)).toThrow('Unsupported save version: 999');
        });
    });
});
