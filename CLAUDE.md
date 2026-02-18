# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Architecture Overview

### Simulation / Rendering Separation

The codebase separates game logic from Phaser rendering:

- **`src/game/simulation/`**: Pure game logic with no Phaser dependency
  - `GameSimulation` orchestrates world state, player position, and scene transitions
  - `PlayerState` is a plain data object (position, direction, swimming flag)
  - `Serialization` handles save/load without re-running procedural generation
- **`src/game/entities/Player.ts`**: Phaser Graphics renderer for the otter sprite; reads from `PlayerState`
- **`src/game/rendering/TileRenderer.ts`**: Phaser Graphics renderer for the world tiles
- **`src/game/scenes/`**: Phaser scenes that wire input → simulation → renderer

`GameSimulation` is instantiated once in `Preloader` and stored in the Phaser registry (`this.registry.set('simulation', sim)`), then retrieved by other scenes.

### Scene Flow and State Management

**Scene Sequence:**
```
Boot → Preloader → WorldScene (overworld) ⟷ RiverScene (side-scrolling) → GameOver
```

**Dual-World System:**
The game uses a sleep/wake pattern to maintain state across two parallel scenes:

- **WorldScene** (`src/game/scenes/WorldScene.ts`): 500×500 tile overworld with procedurally-generated river
- **RiverScene** (`src/game/scenes/RiverScene.ts`): Side-scrolling river view (riverLength × 32 depth)

When transitioning:
- Entering river: WorldScene **sleeps**, RiverScene **wakes/launches**
- Exiting river: RiverScene **sleeps**, WorldScene **wakes**
- Both scenes preserve full state (no `create()` re-runs on wake)

**Event-Based Wake Handlers:**
Both scenes use `this.events.on(Phaser.Scenes.Events.WAKE, ...)` to handle repositioning when waking from sleep. The wake event receives data passed from `scene.wake('SceneName', data)`.

### World Generation System

**River Path Generation** (`src/game/world/World.ts`):
1. Creates continuous path from south (y=497) to north (y=2)
2. Starts 15% from left edge, meanders with drift
3. Each point: `{ x, y, width }` where width varies 8-16 tiles
4. **Continuity algorithm**: Linear interpolation between points prevents gaps
5. Final `riverPath` array is the primary mapping between overworld and river coordinates

**Tile Assignment by Distance** to nearest riverPath point:
- ≤30% of width: `RIVER_DEEP` (diveable into RiverScene)
- ≤70% of width: `RIVER_SHALLOW` (swimmable)
- ≤width+1: `SHORELINE` (walkable, 20% chance of shells)
- ≤width+2.5: `MUD` (walkable, 30% chance of mud resources)
- ≤width+4: `DIRT` (walkable)
- Otherwise: `GRASS` (walkable); 2% of grass tiles become `TREE` (blocking, twigs)
- Edges (2-tile border): `BOULDER` / `CLIFF` / `ROCK` (all blocking)

**River Depth Profile** (`src/game/world/River.ts`):
The RiverScene has varying depth at each x position:
- `skyDepth = 3`: Top 3 rows are always `SKY`
- `bottomDepth[x]`: Row where `RIVER_BOTTOM` starts (4–31)
- Rows between sky and bottom are `WATER`
- Entry/exit zones (≈3.3% of length) ease depth in/out
- Middle section varies randomly with bias toward gradual changes

### World-to-River Mapping

**Entry:**
1. Player stands on `RIVER_DEEP` tile and presses B
2. `sim.tryEnterRiver()` calls `world.findRiverPathIndex(tileX, tileY)` → `riverIndex`
3. Player placed in RiverScene at x=riverIndex, y=`river.skyDepth + 1` (first water row)
4. WorldScene sleeps, RiverScene wakes with `{ riverIndex }`

**Exit:**
1. Player swims to y=3 or 4 (just below sky) and presses B
2. `sim.tryExitRiver()` calls `world.getRiverPathPosition(riverX)` → overworld tile
3. Player repositioned in WorldScene at that tile
4. RiverScene sleeps, WorldScene wakes with `{ exitRiver: true }`

### Player Movement

**Grid-Based, Turn-Based** (1 tile per keypress):
1. Input (arrow keys / WASD) calls `sim.moveOverworld(dx, dy)` or `sim.moveRiver(dx, dy)`
2. Simulation validates bounds and tile walkability
3. On success: updates `PlayerState` position/direction, updates occupancy in World
4. Scene syncs the Phaser Player renderer via `player.syncFromState(playerState)`

**Movement Validation:**
- Overworld: `world.canMoveTo(x, y, isSwimming)` — accepts walkable land or swimmable water
- River: `river.isInBounds(x, y)` + `river.canMoveTo(x, y)` — blocks SKY and RIVER_BOTTOM tiles
- Otters can move freely between land and water tiles (no movement penalty)

**Occupancy Tracking:**
- `world.occupyTile(x, y, entity)` / `world.vacateTile(x, y)` prevent two entities on the same tile
- A tile with `occupiedBy !== null` blocks movement into it

### Rendering System

**TileRenderer** (`src/game/rendering/TileRenderer.ts`):
- Immediate-mode rendering using Phaser Graphics API (no sprite sheets or image assets)
- **Viewport culling**: Only renders visible tiles + 4-tile buffer outside screen edges
- Called every frame in `WorldScene.update()`
- Each tile: 32×32px filled rectangle with 0.1 alpha black border
- Color lookup by `TileType`:

| Tile | Color |
|------|-------|
| GRASS | 0x4A7C2C (green) |
| DIRT | 0x8B7355 (brown) |
| MUD | 0x6B5D4F (dark brown) |
| SHORELINE | 0xC2B280 (sandy beige) |
| RIVER_SHALLOW | 0x6BAED6 (light blue) |
| RIVER_DEEP | 0x2E75B6 (medium blue) |
| TREE | 0x2D5A1B (dark green) |
| BOULDER/CLIFF/ROCK | grey tones |

**RiverScene Rendering** (inline in `RiverScene.ts`):
- Same viewport-culling pattern
- Three tile types: `SKY` (white), `WATER` (blue), `RIVER_BOTTOM` (brown)

**Player Renderer** (`src/game/entities/Player.ts`):
- Drawn with Phaser Graphics (two circles: belly + head with eyes/nose/cheeks)
- Head offset from belly by 12px in the player's current direction
- `syncFromState(playerState)` updates visual from simulation data

### Key Constants (`src/game/constants.ts`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `SCREEN_WIDTH` | 800 | Viewport width (px) |
| `SCREEN_HEIGHT` | 800 | Viewport height (px) |
| `TILE_SIZE` | 32 | Pixels per tile |
| `TILES_HORIZONTAL` | 25 | Visible tile columns |
| `TILES_VERTICAL` | 25 | Visible tile rows |
| `WORLD_WIDTH` | 500 | World width (tiles) |
| `WORLD_HEIGHT` | 500 | World height (tiles) |

### Data Structures

**Tile** (`src/game/world/Tile.ts`):
```typescript
{
  x, y: number              // Grid position
  type: TileType            // GRASS | DIRT | MUD | SHORELINE | RIVER_SHALLOW | RIVER_DEEP
                            // | OCEAN | BOULDER | CLIFF | TREE | ROCK
  resourceType: ResourceType | null  // MUD | ROCKS | SHELLS | TWIGS
  resourceCount: number     // 0–3; decrements on harvestResource()
  items: TileItem[]         // Placed items (future system)
  occupiedBy: any           // Entity on this tile (null if empty)
}
```

**World** (`src/game/world/World.ts`):
```typescript
{
  tiles: Tile[][]                   // [y][x] 2D array (500×500)
  riverPath: {x, y, width}[]       // Sequential north→south river points
  river: River                      // RiverScene world object
}
```

**PlayerState** (`src/game/simulation/PlayerState.ts`):
```typescript
{
  tileX, tileY: number              // Grid position (overworld)
  direction: 'up'|'down'|'left'|'right'
  isSwimming: boolean
}
```

**GameSimulation** (`src/game/simulation/GameSimulation.ts`):
```typescript
{
  world: World
  player: PlayerState
  mode: 'overworld' | 'river'
  riverX, riverY: number            // Current river tile coordinates
  entryRiverIndex: number           // River x where player last entered
}
```

### Save/Load System (`src/game/simulation/Serialization.ts`)

`serialize(sim)` / `deserialize(data)` encode the full game state:

- Tile types compacted to single characters per row (`G`=grass, `D`=dirt, etc.)
- Resources stored as a separate sparse list `{ x, y, type, count }[]`
- River depth profile stored as a flat `number[]`
- Deserialization uses `Object.create(ClassName.prototype)` to restore class instances without re-running procedural generation

## Important Patterns

1. **Scene sleep/wake for state preservation**: Use `scene.sleep()` / `scene.wake()` instead of `scene.start()` to avoid regenerating worlds
2. **Event handlers for wake**: Register with `this.events.on(Phaser.Scenes.Events.WAKE, callback)`
3. **All game logic in simulation**: Input handlers in scenes should call `sim.*` methods, then sync renderers — never mutate world/player state directly in a scene
4. **Viewport culling**: Always compute visible tile range before iterating in render loops
5. **Occupancy tracking**: Call `world.occupyTile()` / `world.vacateTile()` whenever entities move; a tile with `occupiedBy` set blocks movement
6. **Simulation in registry**: Retrieve with `this.registry.get('simulation') as GameSimulation` in any scene

## Files to Ignore

`public.archive/` — Previous game version, do not reference or update
