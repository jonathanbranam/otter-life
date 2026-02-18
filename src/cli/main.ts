import * as fs from 'fs';
import * as path from 'path';
import { GameSimulation } from '../game/simulation/GameSimulation';
import { serialize, deserialize } from '../game/simulation/Serialization';
import { renderView } from './renderer';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../game/constants';

const SAVE_FILE = 'state.json';

const COMMANDS: Record<string, string> = {
    'new':     'Create a new game [--width <tiles>] [--height <tiles>]',
    'look':    'Display the current view',
    'north':   'Move north (up)',
    'south':   'Move south (down)',
    'east':    'Move east (right)',
    'west':    'Move west (left)',
    'n':       'Move north (up)',
    's':       'Move south (down)',
    'e':       'Move east (right)',
    'w':       'Move west (left)',
    'dive':    'Dive into the river (must be on deep water)',
    'surface': 'Surface from the river (must be near top)',
    'status':  'Show player status',
    'help':    'Show this help message',
};

function usage(): string {
    const lines = [
        'Usage: otter-cli <session-dir> <command>',
        '',
        'Commands:',
    ];
    for (const [cmd, desc] of Object.entries(COMMANDS)) {
        lines.push(`  ${cmd.padEnd(10)} ${desc}`);
    }
    return lines.join('\n');
}

function loadState(sessionDir: string): GameSimulation {
    const filePath = path.join(sessionDir, SAVE_FILE);
    const json = fs.readFileSync(filePath, 'utf-8');
    return deserialize(json);
}

function saveState(sessionDir: string, sim: GameSimulation): void {
    fs.mkdirSync(sessionDir, { recursive: true });
    const filePath = path.join(sessionDir, SAVE_FILE);
    fs.writeFileSync(filePath, serialize(sim));
}

function parseFlags(args: string[]): Record<string, string> {
    const flags: Record<string, string> = {};
    for (let i = 0; i < args.length - 1; i++) {
        if (args[i].startsWith('--')) {
            flags[args[i].slice(2)] = args[i + 1];
            i++;
        }
    }
    return flags;
}

function handleNew(sessionDir: string, flags: Record<string, string>): void {
    const width = flags['width'] !== undefined ? parseInt(flags['width'], 10) : WORLD_WIDTH;
    const height = flags['height'] !== undefined ? parseInt(flags['height'], 10) : WORLD_HEIGHT;

    if (isNaN(width) || width < 10) {
        console.error('--width must be an integer >= 10');
        process.exit(1);
    }
    if (isNaN(height) || height < 10) {
        console.error('--height must be an integer >= 10');
        process.exit(1);
    }

    console.log(`Generating world (${width}×${height})...`);
    const sim = new GameSimulation(width, height);
    const spawn = sim.findSpawnPosition();
    sim.spawnPlayer(spawn.x, spawn.y);
    console.log(`World created. Player spawned at (${spawn.x}, ${spawn.y}).`);

    saveState(sessionDir, sim);
    console.log(renderView(sim));
}

function handleMove(sim: GameSimulation, dx: number, dy: number, dirName: string): void {
    let moved: boolean;
    if (sim.mode === 'overworld') {
        moved = sim.moveOverworld(dx, dy);
    } else {
        moved = sim.moveRiver(dx, dy);
    }

    if (moved) {
        console.log(`Moved ${dirName}.`);
    } else {
        console.log(`Can't move ${dirName}.`);
    }
}

function handleDive(sim: GameSimulation): void {
    const result = sim.tryEnterRiver();
    if (result) {
        console.log(`Dove into the river at index ${result.riverIndex}.`);
    } else {
        console.log("Can't dive here. Must be on deep river water.");
    }
}

function handleSurface(sim: GameSimulation): void {
    const result = sim.tryExitRiver();
    if (result) {
        console.log(`Surfaced at overworld tile (${result.worldTileX}, ${result.worldTileY}).`);
    } else {
        if (sim.mode !== 'river') {
            console.log("You're not in the river.");
        } else {
            console.log("Can't surface here. Swim closer to the top (y=3 or y=4).");
        }
    }
}

function handleStatus(sim: GameSimulation): void {
    const p = sim.player;
    const lines = [
        `Mode: ${sim.mode}`,
        `Position: (${p.tileX}, ${p.tileY})`,
        `Direction: ${p.direction}`,
        `Swimming: ${p.isSwimming}`,
    ];
    if (sim.mode === 'river') {
        lines.push(`River position: (${sim.riverX}, ${sim.riverY})`);
    }
    console.log(lines.join('\n'));
}

function main(): void {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(usage());
        process.exit(1);
    }

    const sessionDir = args[0];
    const command = args[1].toLowerCase();

    if (command === 'help') {
        console.log(usage());
        return;
    }

    if (command === 'new') {
        const flags = parseFlags(args.slice(2));
        handleNew(sessionDir, flags);
        return;
    }

    // All other commands require an existing session
    const savePath = path.join(sessionDir, SAVE_FILE);
    if (!fs.existsSync(savePath)) {
        console.error(`No game found in '${sessionDir}'. Run with 'new' first.`);
        process.exit(1);
    }

    const sim = loadState(sessionDir);

    switch (command) {
        case 'look':
            break; // just render
        case 'north': case 'n':
            handleMove(sim, 0, -1, 'north');
            break;
        case 'south': case 's':
            handleMove(sim, 0, 1, 'south');
            break;
        case 'east': case 'e':
            handleMove(sim, 1, 0, 'east');
            break;
        case 'west': case 'w':
            handleMove(sim, -1, 0, 'west');
            break;
        case 'dive':
            handleDive(sim);
            break;
        case 'surface':
            handleSurface(sim);
            break;
        case 'status':
            handleStatus(sim);
            console.log(renderView(sim));
            saveState(sessionDir, sim);
            return;
        default:
            console.error(`Unknown command: '${command}'. Run with 'help' for usage.`);
            process.exit(1);
    }

    console.log(renderView(sim));
    saveState(sessionDir, sim);
}

main();
