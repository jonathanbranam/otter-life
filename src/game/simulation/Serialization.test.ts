import { describe, it, expect } from 'vitest';
import { GameSimulation } from './GameSimulation';
import { serialize, deserialize } from './Serialization';
import { TileType } from '../world/TileType';

const SIM_SIZE = 30;

function makeSim(): GameSimulation {
    const sim = new GameSimulation(SIM_SIZE, SIM_SIZE);
    const spawn = sim.findSpawnPosition();
    sim.spawnPlayer(spawn.x, spawn.y);
    return sim;
}

function roundTrip(sim: GameSimulation): GameSimulation {
    return deserialize(serialize(sim));
}

describe('Serialization', () => {
    describe('player state round-trip', () => {
        it('preserves player position', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            expect(restored.player.tileX).toBe(sim.player.tileX);
            expect(restored.player.tileY).toBe(sim.player.tileY);
        });

        it('preserves player direction', () => {
            const sim = makeSim();
            sim.player.direction = 'left';
            expect(roundTrip(sim).player.direction).toBe('left');
        });

        it('preserves isSwimming', () => {
            const sim = makeSim();
            sim.player.isSwimming = true;
            expect(roundTrip(sim).player.isSwimming).toBe(true);
        });
    });

    describe('game mode round-trip', () => {
        it('preserves overworld mode', () => {
            const sim = makeSim();
            expect(roundTrip(sim).mode).toBe('overworld');
        });

        it('preserves river mode', () => {
            const sim = makeSim();
            sim.cheatEnterRiver(10, 8);
            const restored = roundTrip(sim);
            expect(restored.mode).toBe('river');
            expect(restored.riverX).toBe(10);
            expect(restored.riverY).toBe(8);
        });

        it('preserves entryRiverIndex', () => {
            const sim = makeSim();
            sim.cheatEnterRiver(15, 8);
            expect(roundTrip(sim).entryRiverIndex).toBe(sim.entryRiverIndex);
        });
    });

    describe('world state round-trip', () => {
        it('preserves world dimensions', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            expect(restored.world.width).toBe(SIM_SIZE);
            expect(restored.world.height).toBe(SIM_SIZE);
        });

        it('preserves every tile type', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            for (let y = 0; y < SIM_SIZE; y++) {
                for (let x = 0; x < SIM_SIZE; x++) {
                    expect(restored.world.getTile(x, y)?.type)
                        .toBe(sim.world.getTile(x, y)?.type);
                }
            }
        });

        it('preserves river path', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            expect(restored.world.riverPath).toEqual(sim.world.riverPath);
        });
    });

    describe('river data round-trip', () => {
        it('preserves river length and depth constants', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            expect(restored.world.river!.length).toBe(sim.world.river!.length);
            expect(restored.world.river!.skyDepth).toBe(sim.world.river!.skyDepth);
            expect(restored.world.river!.maxDepth).toBe(sim.world.river!.maxDepth);
        });

        it('preserves bottomDepth profile', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            expect(restored.world.river!.bottomDepth).toEqual(sim.world.river!.bottomDepth);
        });

        it('reconstructs river tile types from bottomDepth', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            const river = restored.world.river!;
            // SKY rows
            for (let x = 0; x < river.length; x++) {
                for (let y = 0; y < river.skyDepth; y++) {
                    expect(river.getTile(x, y)?.type).toBe('sky');
                }
            }
            // WATER rows at a sample column
            const x = 5;
            const bottom = river.bottomDepth[x];
            expect(river.getTile(x, bottom - 1)?.type).toBe('water');
            // RIVER_BOTTOM
            expect(river.getTile(x, bottom)?.type).toBe('river_bottom');
        });
    });

    describe('resources round-trip', () => {
        it('restores resource type and count on tiles', () => {
            const sim = makeSim();
            // Find any tile that has a resource
            let source: { x: number; y: number; type: string; count: number } | null = null;
            outer: for (let y = 0; y < SIM_SIZE; y++) {
                for (let x = 0; x < SIM_SIZE; x++) {
                    const t = sim.world.getTile(x, y);
                    if (t && t.resourceCount > 0 && t.resourceType) {
                        source = { x, y, type: t.resourceType, count: t.resourceCount };
                        break outer;
                    }
                }
            }
            if (!source) return; // skip — no resources generated in this random world

            const restored = roundTrip(sim);
            const rt = restored.world.getTile(source.x, source.y);
            expect(rt?.resourceType).toBe(source.type);
            expect(rt?.resourceCount).toBe(source.count);
        });

        it('tiles without resources have no resourceType', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            const grass = (() => {
                for (let y = 0; y < SIM_SIZE; y++)
                    for (let x = 0; x < SIM_SIZE; x++) {
                        const t = sim.world.getTile(x, y);
                        if (t?.type === TileType.GRASS && !t.resourceType) return { x, y };
                    }
                return null;
            })();
            if (!grass) return;
            expect(restored.world.getTile(grass.x, grass.y)?.resourceType).toBeNull();
        });
    });

    describe('occupancy restoration', () => {
        it("re-establishes the player's tile occupancy", () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            const { tileX, tileY } = restored.player;
            expect(restored.world.getTile(tileX, tileY)?.occupiedBy).toBe(restored.player);
        });

        it('does not double-occupy any tile', () => {
            const sim = makeSim();
            const restored = roundTrip(sim);
            let occupied = 0;
            for (let y = 0; y < SIM_SIZE; y++)
                for (let x = 0; x < SIM_SIZE; x++)
                    if (restored.world.getTile(x, y)?.occupiedBy) occupied++;
            expect(occupied).toBe(1);
        });
    });

    describe('error handling', () => {
        it('throws on unsupported save version', () => {
            const bad = JSON.stringify({ version: 999 });
            expect(() => deserialize(bad)).toThrow('Unsupported save version: 999');
        });
    });
});
