# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Tracking

This project uses `br` (beads_rust) for issue/task tracking. Before working on any task, read the agent guide at `br-guide.md`

## Project Overview

Otter Life is an interactive browser-based 2D game built with Phaser 3 and TypeScript using Webpack. Players control an otter exploring a procedurally-generated 500×500 tile overworld with a winding river, and can dive into a side-scrolling river scene.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:8080 with hot-reload
npm run build      # Create production build in dist/ folder
npm run dev-nolog  # Dev server without telemetry
npm run build-nolog # Production build without telemetry
```

Hot-reload is active - changes to TypeScript files in `src/` automatically recompile and refresh the browser.

## Testing

### Unit Tests (Vitest)

```bash
npm test          # Run all tests once
npm test -- --watch  # Watch mode
```

Tests live alongside source files (`*.test.ts`). The simulation layer has no Phaser dependency so all game-logic tests run in pure Node.js.

All simulation tests use `createTestSim()` from `src/game/testing/fixtures.ts` rather than `new GameSimulation()` to avoid world-generation randomness. Always reference positions by named constants (e.g. `DEEP.x`, `TREE.y`), not magic numbers. See `fixtures.ts` for the full world layout diagram and all named constants.

### CLI / Interactive Testing (no browser required)

```bash
# Create a small world and save it to ./session/
npm run cli -- -d ./session new --width 50 --height 50

# Use the static test-fixture world (20×20, instant — no generation)
npm run cli -- -d ./session new --fixture

npm run cli -- -d ./session status
npm run cli -- -d ./session north        # aliases: n s e w
npm run cli -- -d ./session dive
npm run cli -- -d ./session surface

# Cheat commands bypass all tile restrictions
npm run cli -- --cheat -d ./session move-to 42 17
npm run cli -- --cheat -d ./session dive-to 5 8
npm run cli -- --cheat -d ./session surface-to 30 10
```

Game state is persisted as `state.json` in the session directory after every command.

## Architecture Overview

### Simulation / Rendering Separation

- **`src/game/simulation/`**: Pure game logic with no Phaser dependency
  - `GameSimulation` orchestrates world state, player position, and scene transitions
  - `PlayerState` is a plain data object (position, direction, swimming flag)
  - `Serialization` handles save/load without re-running procedural generation
- **`src/game/entities/Player.ts`**: Phaser Graphics renderer for the otter sprite; reads from `PlayerState`
- **`src/game/rendering/TileRenderer.ts`**: Phaser Graphics renderer for world tiles
- **`src/game/scenes/`**: Phaser scenes that wire input → simulation → renderer

`GameSimulation` is instantiated once in `Preloader` and stored in the Phaser registry (`this.registry.set('simulation', sim)`), then retrieved by other scenes.

### Scene Flow and State Management

```
Boot → Preloader → WorldScene (overworld) ⟷ RiverScene (side-scrolling) → GameOver
```

The game uses a sleep/wake pattern to preserve state across both scenes. Entering the river sleeps WorldScene and wakes RiverScene; exiting does the reverse. Neither scene re-runs `create()` on wake. Wake handlers use `this.events.on(Phaser.Scenes.Events.WAKE, ...)`.

### World Generation

See `WorldGenerator.ts` and `RiverGenerator.ts` for algorithm details.

The overworld `riverPath` (array of `{x, y, width}` points running north→south) is the primary structure linking the overworld to the river. It drives tile assignment during generation and coordinate mapping at runtime (`findRiverPathIndex`, `getRiverPathPosition`).

### World-to-River Mapping

- **Entry**: Player on `RIVER_DEEP` → `sim.tryEnterRiver()` → `world.findRiverPathIndex(x, y)` → river column; WorldScene sleeps, RiverScene wakes
- **Exit**: Player near sky rows → `sim.tryExitRiver()` → `world.getRiverPathPosition(riverX)` → overworld tile; RiverScene sleeps, WorldScene wakes

### Player Movement

Grid-based, turn-based (1 tile per keypress). Input calls `sim.moveOverworld(dx, dy)` or `sim.moveRiver(dx, dy)`, which validate bounds and tile walkability, then update `PlayerState`. The scene syncs the renderer via `player.syncFromState(playerState)`.

## Important Patterns

1. **Scene sleep/wake**: Use `scene.sleep()` / `scene.wake()` instead of `scene.start()` to avoid regenerating worlds
2. **All game logic in simulation**: Input handlers call `sim.*` methods, then sync renderers — never mutate world/player state directly in a scene
3. **Viewport culling**: Always compute visible tile range before iterating in render loops
4. **Occupancy tracking**: Call `world.occupyTile()` / `world.vacateTile()` whenever entities move; a tile with `occupiedBy` set blocks movement
5. **Simulation in registry**: Retrieve with `this.registry.get('simulation') as GameSimulation`

## Files to Ignore

`public.archive/` — Previous game version, do not reference or update
