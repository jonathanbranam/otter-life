import { GameSimulation } from '../game/simulation/GameSimulation';
import { TileType } from '../game/world/TileType';
import { RiverTileType } from '../game/world/River';

const OVERWORLD_CHARS: Record<TileType, string> = {
    [TileType.GRASS]: '.',
    [TileType.DIRT]: ',',
    [TileType.MUD]: '~',
    [TileType.SHORELINE]: ':',
    [TileType.RIVER_SHALLOW]: '-',
    [TileType.RIVER_DEEP]: '=',
    [TileType.OCEAN]: '≈',
    [TileType.BOULDER]: 'O',
    [TileType.CLIFF]: 'X',
    [TileType.TREE]: 'T',
    [TileType.ROCK]: 'o',
};

const RIVER_CHARS: Record<RiverTileType, string> = {
    [RiverTileType.SKY]: ' ',
    [RiverTileType.WATER]: '~',
    [RiverTileType.RIVER_BOTTOM]: '#',
};

const VIEW_RADIUS = 12; // 25x25 grid (radius 12 + center + radius 12)

export function renderView(sim: GameSimulation): string {
    if (sim.mode === 'overworld') {
        return renderOverworld(sim);
    } else {
        return renderRiver(sim);
    }
}

function renderOverworld(sim: GameSimulation): string {
    const cx = sim.player.tileX;
    const cy = sim.player.tileY;
    const world = sim.world;

    const lines: string[] = [];

    // Header
    lines.push(`=== Overworld (${cx}, ${cy}) ===`);

    const tile = world.getTile(cx, cy);
    const tileType = tile ? tile.type : 'unknown';
    const swimming = sim.player.isSwimming ? ' [swimming]' : '';
    const canDive = tile?.type === TileType.RIVER_DEEP ? ' [can dive]' : '';
    lines.push(`Tile: ${tileType}${swimming}${canDive}  Facing: ${sim.player.direction}`);
    lines.push('');

    // Clamp viewport to world bounds
    const minX = Math.max(0, cx - VIEW_RADIUS);
    const maxX = Math.min(world.width - 1, cx + VIEW_RADIUS);
    const minY = Math.max(0, cy - VIEW_RADIUS);
    const maxY = Math.min(world.height - 1, cy + VIEW_RADIUS);

    // Column numbers header
    let colHeader = '     ';
    for (let x = minX; x <= maxX; x++) {
        if (x % 5 === 0) {
            const label = Math.abs(x).toString();
            colHeader += label.slice(-1);
        } else {
            colHeader += ' ';
        }
    }
    lines.push(colHeader);

    // Grid
    for (let y = minY; y <= maxY; y++) {
        const rowLabel = y.toString().padStart(4, ' ') + ' ';
        let row = rowLabel;

        for (let x = minX; x <= maxX; x++) {
            if (x === cx && y === cy) {
                row += '@';
                continue;
            }

            const t = world.getTile(x, y);
            if (!t) {
                row += '?';
            } else {
                row += OVERWORLD_CHARS[t.type];
            }
        }

        lines.push(row);
    }

    lines.push('');
    lines.push('Legend: @=you .=grass ,=dirt ~=mud :=shore -=shallow ==deep T=tree O=boulder X=cliff o=rock');

    return lines.join('\n');
}

function renderRiver(sim: GameSimulation): string {
    const river = sim.world.river;
    if (!river) return 'Error: no river data';

    const cx = sim.riverX;
    const cy = sim.riverY;

    const lines: string[] = [];

    // Header
    const canExit = cy >= 3 && cy <= 4 ? ' [can surface]' : '';
    const bottomDepth = river.getRiverDepthAt(cx);
    const waterDepth = bottomDepth - river.skyDepth;

    lines.push(`=== River (${cx}, ${cy}) ===`);
    lines.push(`Depth: ${waterDepth} tiles  Facing: ${sim.player.direction}${canExit}`);
    lines.push('');

    // Clamp viewport to river bounds
    const minX = Math.max(0, cx - VIEW_RADIUS);
    const maxX = Math.min(river.length - 1, cx + VIEW_RADIUS);
    const minY = Math.max(0, cy - VIEW_RADIUS);
    const maxY = Math.min(river.maxDepth - 1, cy + VIEW_RADIUS);

    // Render grid centered on player
    for (let y = minY; y <= maxY; y++) {
        const rowLabel = y.toString().padStart(4, ' ') + ' ';
        let row = rowLabel;

        for (let x = minX; x <= maxX; x++) {
            if (x === cx && y === cy) {
                row += '@';
                continue;
            }

            const t = river.getTile(x, y);
            if (!t) {
                row += '?';
            } else {
                row += RIVER_CHARS[t.type];
            }
        }

        lines.push(row);
    }

    lines.push('');
    lines.push('Legend: @=you  =sky ~=water #=bottom');

    return lines.join('\n');
}
