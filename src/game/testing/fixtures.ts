/**
 * Static test world fixture for deterministic unit tests.
 *
 * The world is built programmatically using the same Object.create pattern
 * as Serialization.deserialize — no random generation, every tile is known.
 *
 * World layout (20 × 20).  B=BOULDER, G=GRASS, D=DIRT, M=MUD,
 *                           So=SHORELINE, Sh=SHALLOW, Dp=DEEP, T=TREE
 *
 *   y\x  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19
 *    0   B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B
 *    1   B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B
 *    2   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *    3   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *    4   B  B  G  G  G  D  D  G  G  G  G  G  G  G  G  G  G  G  B  B
 *    5   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B  ← GRASS (5,5)
 *    6   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *    7   B  B  G  G  G  M  G  G  G  G  G  G  G  G  G  G  G  G  B  B  ← MUD+resource (5,7)
 *    8   B  B  G  G  G  G  G  M  M  So So Sh Sh Dp Dp G  G  G  B  B  ← river cross-section
 *    9   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   10   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   11   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   12   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   13   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   14   B  B  G  G  G  T  T  G  G  G  G  G  G  G  G  G  G  G  B  B  ← TREE (5,14)
 *   15   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   16   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   17   B  B  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  G  B  B
 *   18   B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B
 *   19   B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B  B
 *
 * River scene (10 columns × 32 rows):
 *   y = 0..2   SKY          (y < skyDepth=3)
 *   y = 3..19  WATER        (bottomDepth = 20 for every column)
 *   y = 20..31 RIVER_BOTTOM
 *
 * River path (10 points, all x=13):
 *   index i → overworld {x:13, y:12-i}
 *   index 4 → {x:13, y:8} — the DEEP tile.  Diving from DEEP arrives at
 *   river column DIVE_X=4.  Surfacing from column 4 exits to overworld (13,8).
 */

import { GameSimulation } from '../simulation/GameSimulation';
import { PlayerState } from '../simulation/PlayerState';
import { World } from '../world/World';
import { Tile, ResourceType } from '../world/Tile';
import { TileType } from '../world/TileType';
import { River, RiverTile, RiverTileType } from '../world/River';

// ── Dimensions ────────────────────────────────────────────────────────────────

export const WIDTH  = 20;
export const HEIGHT = 20;

// ── Named overworld positions ─────────────────────────────────────────────────

/** Plain GRASS; all four cardinal neighbors are walkable. */
export const GRASS     = { x: 5, y: 5 } as const;
/** DIRT tile directly above GRASS. */
export const DIRT      = { x: 5, y: 4 } as const;
/** MUD tile containing 2 MUD resources. */
export const MUD       = { x: 5, y: 7 } as const;
/** SHORELINE tile in the river cross-section row. */
export const SHORELINE = { x: 9, y: 8 } as const;
/** RIVER_SHALLOW tile. */
export const SHALLOW   = { x: 11, y: 8 } as const;
/** RIVER_DEEP tile.  Diving here enters the river at column DIVE_X. */
export const DEEP      = { x: 13, y: 8 } as const;
/** TREE (blocking) tile.  (4,14) to the west and (5,13) to the north are GRASS. */
export const TREE      = { x: 5, y: 14 } as const;
/** BOULDER border tile; always blocking. */
export const BORDER    = { x: 0, y: 0 } as const;
/** Player spawn / starting position. */
export const SPAWN     = GRASS;

// ── Named river positions ─────────────────────────────────────────────────────

/** River sky depth: rows y=0..SKY_DEPTH-1 are SKY (not enterable). */
export const SKY_DEPTH  = 3;
/** River column the player lands in when diving from DEEP. */
export const DIVE_X     = 4;
/** A WATER row well away from both sky and bottom (safe for general movement). */
export const WATER_Y    = 6;
/** A WATER row one step above the exit zone; used for sky-blocking tests. */
export const NEAR_SKY_Y = 4;
/** Valid y for tryExitRiver (zone is y=3 or y=4). */
export const EXIT_Y     = 3;
/** y where RIVER_BOTTOM begins (same for every column). */
export const BOTTOM_Y   = 20;
/** Total number of columns in the river scene. */
export const RIVER_LENGTH = 10;

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Return a fresh GameSimulation backed by the static test world.
 * Each call produces an independent instance — safe to mutate freely in tests.
 */
export function createTestSim(): GameSimulation {
    const world = buildWorld();

    const sim = Object.create(GameSimulation.prototype) as GameSimulation;
    sim.world          = world;
    sim.mode           = 'overworld';
    sim.riverX         = 0;
    sim.riverY         = 0;
    sim.entryRiverIndex = 0;

    sim.player = new PlayerState(SPAWN.x, SPAWN.y);
    sim.player.isSwimming = false;
    world.occupyTile(SPAWN.x, SPAWN.y, sim.player);

    return sim;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function buildWorld(): World {
    // Fill with GRASS
    const tiles: Tile[][] = [];
    for (let y = 0; y < HEIGHT; y++) {
        tiles[y] = [];
        for (let x = 0; x < WIDTH; x++) {
            tiles[y][x] = new Tile(x, y, TileType.GRASS);
        }
    }

    // 2-tile BOULDER border (matches edgeWidth=2 in World.generateEdges)
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            if (x < 2 || x >= WIDTH - 2 || y < 2 || y >= HEIGHT - 2) {
                tiles[y][x].type = TileType.BOULDER;
            }
        }
    }

    // Dirt patch (y=4)
    tiles[4][5].type = TileType.DIRT;
    tiles[4][6].type = TileType.DIRT;

    // MUD tile with resource
    tiles[MUD.y][MUD.x].type = TileType.MUD;
    tiles[MUD.y][MUD.x].setResource(ResourceType.MUD, 2);

    // River cross-section at y=8
    tiles[8][ 7].type = TileType.MUD;
    tiles[8][ 8].type = TileType.MUD;
    tiles[8][ 9].type = TileType.SHORELINE;
    tiles[8][10].type = TileType.SHORELINE;
    tiles[8][11].type = TileType.RIVER_SHALLOW;
    tiles[8][12].type = TileType.RIVER_SHALLOW;
    tiles[8][13].type = TileType.RIVER_DEEP;
    tiles[8][14].type = TileType.RIVER_DEEP;

    // Blocking trees
    tiles[14][5].type = TileType.TREE;
    tiles[14][6].type = TileType.TREE;

    const world = new World(tiles);

    // River path — 10 points running north along x=13.
    // index i maps to overworld y = 12 - i, so index 4 → (13, 8) = DEEP.
    world.riverPath = Array.from({ length: RIVER_LENGTH }, (_, i) => ({
        x: 13,
        y: 12 - i,
        width: 6,
    }));
    world.riverLength = RIVER_LENGTH;
    world.river = buildRiver();

    return world;
}

function buildRiver(): River {
    const bottomDepth = new Array(RIVER_LENGTH).fill(BOTTOM_Y);
    const tiles: RiverTile[][] = [];
    for (let y = 0; y < 32; y++) {
        tiles[y] = [];
        for (let x = 0; x < RIVER_LENGTH; x++) {
            let type: RiverTileType;
            if (y < SKY_DEPTH) {
                type = RiverTileType.SKY;
            } else if (y >= bottomDepth[x]) {
                type = RiverTileType.RIVER_BOTTOM;
            } else {
                type = RiverTileType.WATER;
            }
            tiles[y][x] = new RiverTile(x, y, type);
        }
    }
    return new River(tiles, SKY_DEPTH, bottomDepth);
}

