import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { GameSimulation } from '../game/simulation/GameSimulation';
import { serialize, deserialize } from '../game/simulation/Serialization';
import { createTestSim } from '../game/testing/fixtures';
import { renderView } from './renderer';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../game/constants';

const SAVE_FILE = 'state.json';

// --- Session helpers ---

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

function requireSession(sessionDir: string): GameSimulation {
    const savePath = path.join(sessionDir, SAVE_FILE);
    if (!fs.existsSync(savePath)) {
        console.error(`No game found in '${sessionDir}'. Run 'new' first.`);
        process.exit(1);
    }
    return loadState(sessionDir);
}

// --- Program ---

const program = new Command();

program
    .name('otter-cli')
    .description('Otter Life interactive CLI')
    .version('1.0.0')
    .requiredOption('-d, --dir <path>', 'Session directory')
    .option('--cheat', 'Enable cheat commands');

function requireCheat(): void {
    if (!program.opts().cheat) {
        console.error("Error: this command requires the --cheat flag.");
        process.exit(1);
    }
}

// --- Commands ---

program
    .command('new')
    .description('Create a new game')
    .option('--width <tiles>', 'World width in tiles', String(WORLD_WIDTH))
    .option('--height <tiles>', 'World height in tiles', String(WORLD_HEIGHT))
    .option('--fixture', 'Use the static 20×20 test-fixture world instead of generating a random world')
    .action((opts) => {
        const sessionDir = program.opts().dir as string;

        if (opts.fixture) {
            const sim = createTestSim();
            console.log(`Test-fixture world loaded (20×20). Player at (${sim.player.tileX}, ${sim.player.tileY}).`);
            saveState(sessionDir, sim);
            console.log(renderView(sim));
            return;
        }

        const width = parseInt(opts.width, 10);
        const height = parseInt(opts.height, 10);

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
    });

program
    .command('look')
    .description('Display the current view')
    .action(() => {
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

program
    .command('status')
    .description('Show player status and current view')
    .action(() => {
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
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
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

// Movement commands
function addMoveCommand(name: string, alias: string, dx: number, dy: number, dirName: string): void {
    program
        .command(name)
        .alias(alias)
        .description(`Move ${dirName}`)
        .action(() => {
            const sessionDir = program.opts().dir as string;
            const sim = requireSession(sessionDir);
            const moved = sim.mode === 'overworld'
                ? sim.moveOverworld(dx, dy)
                : sim.moveRiver(dx, dy);
            console.log(moved ? `Moved ${dirName}.` : `Can't move ${dirName}.`);
            console.log(renderView(sim));
            saveState(sessionDir, sim);
        });
}

addMoveCommand('north', 'n', 0, -1, 'north');
addMoveCommand('south', 's', 0,  1, 'south');
addMoveCommand('east',  'e', 1,  0, 'east');
addMoveCommand('west',  'w', -1, 0, 'west');

program
    .command('dive')
    .description('Dive into the river (must be on deep water)')
    .action(() => {
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
        const result = sim.tryEnterRiver();
        if (result) {
            console.log(`Dove into the river at index ${result.riverIndex}.`);
        } else {
            console.log("Can't dive here. Must be on deep river water.");
        }
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

program
    .command('surface')
    .description('Surface from the river (must be near the top)')
    .action(() => {
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
        const result = sim.tryExitRiver();
        if (result) {
            console.log(`Surfaced at overworld tile (${result.worldTileX}, ${result.worldTileY}).`);
        } else if (sim.mode !== 'river') {
            console.log("You're not in the river.");
        } else {
            console.log("Can't surface here. Swim closer to the top (y=3 or y=4).");
        }
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

// Cheat commands — require --cheat flag

program
    .command('move-to <x> <y>')
    .description('(cheat) Teleport to any walkable overworld tile')
    .action((xStr: string, yStr: string) => {
        requireCheat();
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);
        if (isNaN(x) || isNaN(y)) {
            console.error('x and y must be integers.');
            process.exit(1);
        }
        if (!sim.cheatMoveOverworld(x, y)) {
            console.error(`Cannot move to (${x}, ${y}): out of bounds or blocking tile.`);
            process.exit(1);
        }
        console.log(`Teleported to (${x}, ${y}).`);
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

program
    .command('dive-to <riverX> <riverY>')
    .description('(cheat) Enter the river at specific coordinates without tile restriction')
    .action((rxStr: string, ryStr: string) => {
        requireCheat();
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
        const riverX = parseInt(rxStr, 10);
        const riverY = parseInt(ryStr, 10);
        if (isNaN(riverX) || isNaN(riverY)) {
            console.error('riverX and riverY must be integers.');
            process.exit(1);
        }
        if (!sim.cheatEnterRiver(riverX, riverY)) {
            console.error(`Cannot enter river at (${riverX}, ${riverY}): out of bounds or non-water tile.`);
            process.exit(1);
        }
        console.log(`Entered river at (${riverX}, ${riverY}).`);
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

program
    .command('surface-to <worldX> <worldY>')
    .description('(cheat) Exit the river and place player at a specific overworld tile')
    .action((wxStr: string, wyStr: string) => {
        requireCheat();
        const sessionDir = program.opts().dir as string;
        const sim = requireSession(sessionDir);
        const worldX = parseInt(wxStr, 10);
        const worldY = parseInt(wyStr, 10);
        if (isNaN(worldX) || isNaN(worldY)) {
            console.error('worldX and worldY must be integers.');
            process.exit(1);
        }
        if (!sim.cheatExitRiver(worldX, worldY)) {
            console.error(`Cannot surface to (${worldX}, ${worldY}): out of bounds or blocking tile.`);
            process.exit(1);
        }
        console.log(`Surfaced to overworld at (${worldX}, ${worldY}).`);
        console.log(renderView(sim));
        saveState(sessionDir, sim);
    });

program.parse();
