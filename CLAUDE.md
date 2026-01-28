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

### Scene Flow and State Management

**Scene Sequence:**
```
Boot → Preloader → Game (overworld) ⟷ GameRiver (side-scrolling) → GameOver
```

**Dual-World System:**
The game uses a sleep/wake pattern to maintain state across two parallel worlds:

- **Game scene** (`src/game/scenes/Game.ts`): 500×500 tile overworld with procedurally-generated river
- **GameRiver scene** (`src/game/scenes/GameRiver.ts`): Side-scrolling river view (riverLength × 32 depth)

When transitioning:
- Entering river: Game scene **sleeps**, GameRiver **wakes/launches**
- Exiting river: GameRiver **sleeps**, Game scene **wakes**
- Both scenes preserve full state (no `create()` re-runs)

**Event-Based Wake Handlers:**
Both scenes use `this.events.on(Phaser.Scenes.Events.WAKE, ...)` to handle repositioning when waking from sleep. The wake event receives data passed from `scene.wake('SceneName', data)`.

### World Generation System

**River Path Generation** (`src/game/world/World.ts:72-173`):
1. Creates continuous path from south (y=497) to north (y=2)
2. Starts 15% from left edge, meanders with drift
3. Each point: `{ x, y, width }` where width varies 8-16 tiles
4. **Continuity algorithm**: Linear interpolation between points prevents gaps
5. Final `riverPath` array used for world-to-river mapping

**Tile Assignment by Distance:**
All tiles assigned type based on distance to nearest riverPath point:
- ≤30% width: `RIVER_DEEP` (can dive into GameRiver scene)
- ≤70% width: `RIVER_SHALLOW` (swimmable)
- ≤width+1: `SHORELINE` (walkable)
- ≤width+2.5: `MUD` (walkable, harvestable)
- ≤width+4: `DIRT` (walkable)
- Otherwise: `GRASS` (walkable)
- Edges: `BOULDER/CLIFF/ROCK` (blocking)

**River Depth Profile** (`src/game/world/River.ts:69-121`):
The GameRiver scene has varying depth at each x position:
- `bottomDepth[x]`: Where river bottom starts (4-31 tiles deep)
- Top 3 tiles always `SKY`
- Entry/exit zones (3.3% of length) ease depth in/out
- Middle section varies randomly with bias toward gradual changes

### World-to-River Mapping

**Entry:**
1. Player stands on `RIVER_DEEP` tile and presses 'b'
2. `world.findRiverPathIndex(tileX, tileY)` finds closest riverPath point
3. Player transferred to GameRiver at x=riverIndex, y=1

**Exit:**
1. Player swims to y=3-4 (near surface) and presses 'b'
2. Returns to Game scene at `world.getRiverPathPosition(riverIndex)`

### Rendering System

**TileRenderer** (`src/game/rendering/TileRenderer.ts`):
- Immediate-mode rendering using Phaser Graphics API (no sprite assets)
- **Viewport culling**: Only renders visible tiles + 4-tile buffer
- Called every frame in `Game.update()`
- Each tile: 32×32px filled rectangle with 0.1 alpha black border

**GameRiver Rendering** (`src/game/scenes/GameRiver.ts:160-192`):
Similar viewport culling but renders 3 tile types: `SKY` (white), `WATER` (blue), `RIVER_BOTTOM` (brown).

### Player Movement

**Grid-Based Turn-Based System** (`src/game/scenes/Game.ts:300-332`):
1. Input (arrow keys, WASD) triggers `movePlayer(dx, dy)`
2. Calculate new tile position
3. Check `world.canMoveTo(newX, newY, isSwimming)`
4. Vacate old tile, move player sprite, occupy new tile
5. Update `isSwimming` flag based on new tile type

Movement is discrete: 1 tile per keypress, 32 pixels per move.

### Key Constants

From `src/game/constants.ts`:
- `SCREEN_WIDTH/HEIGHT: 800` (viewport size)
- `TILE_SIZE: 32` (pixel size per tile)
- `WORLD_WIDTH/HEIGHT: 500` (overworld dimensions in tiles)
- `TILES_HORIZONTAL/VERTICAL: 25` (visible tiles per screen)

### Data Structures

**Tile** (`src/game/world/Tile.ts`):
```typescript
{
  x, y: number              // Grid position
  type: TileType           // GRASS | DIRT | RIVER_DEEP | etc
  resourceType: ResourceType | null  // mud | rocks | shells | twigs
  resourceCount: number    // 0-3
  occupiedBy: any          // Entity occupying this tile
}
```

**World** (`src/game/world/World.ts`):
```typescript
{
  tiles: Tile[][]                  // [y][x] 2D array
  riverPath: {x, y, width}[]      // Sequential river points
  river: River                     // River world object
}
```

## Important Patterns

1. **Scene sleep/wake for state preservation**: Use `scene.sleep()` / `scene.wake()` instead of `scene.start()` to avoid regenerating worlds
2. **Event handlers for wake**: Register wake handlers with `this.events.on(Phaser.Scenes.Events.WAKE, callback)`
3. **Viewport culling**: Always calculate visible tile range before rendering
4. **Distance-based tile assignment**: Use distance to riverPath for procedural tile types
5. **Grid movement validation**: Check `world.canMoveTo()` before moving entities
6. **Occupancy tracking**: Call `world.occupyTile()` / `world.vacateTile()` when entities move

## Files to Ignore

`public.archive/` - Previous game version, do not reference or update

