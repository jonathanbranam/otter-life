import { GameSimulation } from './GameSimulation';
import type { GameMode } from './GameSimulation';
import { PlayerState } from './PlayerState';
import type { Direction } from './PlayerState';
import { World } from '../world/World';
import { Tile, ResourceType } from '../world/Tile';
import { TileType } from '../world/TileType';
import { River, RiverTile, RiverTileType } from '../world/River';

// --- Compact tile type encoding ---

const TILE_TYPE_TO_CHAR: Record<TileType, string> = {
    [TileType.GRASS]: 'G',
    [TileType.DIRT]: 'D',
    [TileType.MUD]: 'M',
    [TileType.SHORELINE]: 'S',
    [TileType.RIVER_SHALLOW]: 's',
    [TileType.RIVER_DEEP]: 'd',
    [TileType.OCEAN]: 'O',
    [TileType.BOULDER]: 'B',
    [TileType.CLIFF]: 'C',
    [TileType.TREE]: 'T',
    [TileType.ROCK]: 'R',
};

const CHAR_TO_TILE_TYPE: Record<string, TileType> = {};
for (const [type, char] of Object.entries(TILE_TYPE_TO_CHAR)) {
    CHAR_TO_TILE_TYPE[char] = type as TileType;
}

// --- Serialization types ---

interface ResourceData {
    x: number;
    y: number;
    type: string;
    count: number;
}

interface SaveData {
    version: number;
    player: {
        tileX: number;
        tileY: number;
        direction: Direction;
        isSwimming: boolean;
    };
    mode: GameMode;
    riverX: number;
    riverY: number;
    entryRiverIndex: number;
    world: {
        width: number;
        height: number;
        tileRows: string[];
        resources: ResourceData[];
        riverPath: { x: number; y: number; width: number }[];
        river: {
            length: number;
            maxDepth: number;
            skyDepth: number;
            bottomDepth: number[];
        };
    };
}

export function serialize(sim: GameSimulation): string {
    const world = sim.world;

    // Encode tiles as compact strings (one string per row)
    const tileRows: string[] = [];
    const resources: ResourceData[] = [];

    for (let y = 0; y < world.height; y++) {
        let row = '';
        for (let x = 0; x < world.width; x++) {
            const tile = world.tiles[y][x];
            row += TILE_TYPE_TO_CHAR[tile.type];

            if (tile.resourceType && tile.resourceCount > 0) {
                resources.push({
                    x: tile.x,
                    y: tile.y,
                    type: tile.resourceType,
                    count: tile.resourceCount,
                });
            }
        }
        tileRows.push(row);
    }

    // River data - we only need bottomDepth to reconstruct tiles
    const river = world.river!;

    const data: SaveData = {
        version: 1,
        player: {
            tileX: sim.player.tileX,
            tileY: sim.player.tileY,
            direction: sim.player.direction,
            isSwimming: sim.player.isSwimming,
        },
        mode: sim.mode,
        riverX: sim.riverX,
        riverY: sim.riverY,
        entryRiverIndex: sim.entryRiverIndex,
        world: {
            width: world.width,
            height: world.height,
            tileRows,
            resources,
            riverPath: world.riverPath,
            river: {
                length: river.length,
                maxDepth: river.maxDepth,
                skyDepth: river.skyDepth,
                bottomDepth: river.bottomDepth,
            },
        },
    };

    return JSON.stringify(data);
}

export function deserialize(json: string): GameSimulation {
    const data: SaveData = JSON.parse(json);

    if (data.version !== 1) {
        throw new Error(`Unsupported save version: ${data.version}`);
    }

    // Reconstruct tiles
    const tiles: Tile[][] = [];
    for (let y = 0; y < data.world.height; y++) {
        tiles[y] = [];
        const rowStr = data.world.tileRows[y];
        for (let x = 0; x < data.world.width; x++) {
            const tileType = CHAR_TO_TILE_TYPE[rowStr[x]];
            tiles[y][x] = new Tile(x, y, tileType);
        }
    }

    // Restore resources
    for (const res of data.world.resources) {
        tiles[res.y][res.x].setResource(res.type as ResourceType, res.count);
    }

    // Reconstruct World without running generation
    const world = new World(tiles);
    world.riverPath = data.world.riverPath;
    world.riverLength = data.world.riverPath.length;

    // Reconstruct River without running generation
    const rd = data.world.river;
    const river = Object.create(River.prototype) as River;
    river.length = rd.length;
    river.maxDepth = rd.maxDepth;
    river.skyDepth = rd.skyDepth;
    river.bottomDepth = rd.bottomDepth;

    // Rebuild river tiles from bottomDepth
    river.tiles = [];
    for (let y = 0; y < river.maxDepth; y++) {
        river.tiles[y] = [];
        for (let x = 0; x < river.length; x++) {
            const riverBottom = river.bottomDepth[x];
            let tileType: RiverTileType;
            if (y < river.skyDepth) {
                tileType = RiverTileType.SKY;
            } else if (y >= riverBottom) {
                tileType = RiverTileType.RIVER_BOTTOM;
            } else {
                tileType = RiverTileType.WATER;
            }
            river.tiles[y][x] = new RiverTile(x, y, tileType);
        }
    }

    world.river = river;

    // Reconstruct GameSimulation without running constructor
    const sim = Object.create(GameSimulation.prototype) as GameSimulation;
    sim.world = world;
    sim.mode = data.mode;
    sim.riverX = data.riverX;
    sim.riverY = data.riverY;
    sim.entryRiverIndex = data.entryRiverIndex;

    // Reconstruct PlayerState
    sim.player = new PlayerState(data.player.tileX, data.player.tileY, data.player.direction);
    sim.player.isSwimming = data.player.isSwimming;

    // Re-establish tile occupancy for the player
    world.occupyTile(sim.player.tileX, sim.player.tileY, sim.player);

    return sim;
}
