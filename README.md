# Otter Life

A browser-based 2D exploration game built with Phaser 3 and TypeScript. You play as an otter exploring a procedurally-generated world with a winding river — on land and underwater.

## Gameplay

- **Overworld**: Navigate a 500×500 tile grid with grass, mud, shoreline, and a procedurally-generated river
- **River**: Dive into a side-scrolling underwater view with varying depth and a sandy bottom
- **Resources**: Mud, shells, rocks, and twigs are scattered across the terrain (harvesting system in progress)

### Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move one tile |
| B | Dive into river (from RIVER_DEEP tile) / Surface (near top of river) |
| G | Toggle debug grid and river path overlay |

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run scripts via `npm`.

## Development Commands

```bash
npm install         # Install dependencies
npm run dev         # Start dev server at http://localhost:8080 with hot-reload
npm run build       # Create production build in the dist/ folder
npm run dev-nolog   # Dev server without anonymous telemetry
npm run build-nolog # Production build without anonymous telemetry
```

The dev server runs at `http://localhost:8080` by default. Changes to TypeScript files in `src/` are automatically recompiled and the browser reloads.

## Project Structure

```
src/
├── main.ts                      # App entry point (DOM init)
└── game/
    ├── main.ts                  # Phaser game config and scene list
    ├── constants.ts             # Global constants (TILE_SIZE, WORLD_WIDTH, etc.)
    ├── entities/
    │   └── Player.ts            # Otter sprite renderer (Phaser Graphics)
    ├── scenes/
    │   ├── Boot.ts              # Asset loading
    │   ├── Preloader.ts         # Loading screen; initializes GameSimulation
    │   ├── WorldScene.ts        # Overworld (500×500 tile grid)
    │   ├── RiverScene.ts        # Side-scrolling river view
    │   └── GameOver.ts          # End screen
    ├── world/
    │   ├── TileType.ts          # TileType enum and properties
    │   ├── Tile.ts              # Tile class with resources and occupancy
    │   ├── World.ts             # Procedural world generation
    │   ├── River.ts             # River depth profile
    │   └── index.ts             # Module exports
    ├── rendering/
    │   └── TileRenderer.ts      # Viewport-culled tile renderer
    └── simulation/
        ├── PlayerState.ts       # Player data (position, direction, swimming)
        ├── GameSimulation.ts    # Game logic (movement, scene transitions)
        ├── Serialization.ts     # Save/load state
        └── index.ts             # Module exports
```

## Tech Stack

- [Phaser 3.90.0](https://github.com/phaserjs/phaser) — game framework
- [TypeScript 5.4.5](https://github.com/microsoft/TypeScript) — type system
- [Webpack 5.99.6](https://github.com/webpack/webpack) — module bundler

## Production Build

```bash
npm run build
```

Output is written to `dist/`. Upload all contents of `dist/` to a web server to deploy.

## Telemetry Note

The `log.js` script sends anonymous build telemetry to Phaser Studio (template name, build type, Phaser version — no personal data). Use `dev-nolog` / `build-nolog` to skip it, or delete `log.js` and remove its call from `package.json`.
