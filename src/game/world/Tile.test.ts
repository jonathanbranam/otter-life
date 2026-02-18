import { describe, it, expect } from 'vitest';
import { Tile, ResourceType } from './Tile';
import { TileType } from './TileType';

describe('Tile', () => {
    describe('canEnter', () => {
        it('returns true for walkable land tile', () => {
            expect(new Tile(0, 0, TileType.GRASS).canEnter()).toBe(true);
            expect(new Tile(0, 0, TileType.DIRT).canEnter()).toBe(true);
            expect(new Tile(0, 0, TileType.MUD).canEnter()).toBe(true);
            expect(new Tile(0, 0, TileType.SHORELINE).canEnter()).toBe(true);
        });

        it('returns true for water tiles', () => {
            expect(new Tile(0, 0, TileType.RIVER_SHALLOW).canEnter()).toBe(true);
            expect(new Tile(0, 0, TileType.RIVER_DEEP).canEnter()).toBe(true);
        });

        it('returns false for blocking tiles', () => {
            expect(new Tile(0, 0, TileType.TREE).canEnter()).toBe(false);
            expect(new Tile(0, 0, TileType.BOULDER).canEnter()).toBe(false);
            expect(new Tile(0, 0, TileType.CLIFF).canEnter()).toBe(false);
            expect(new Tile(0, 0, TileType.ROCK).canEnter()).toBe(false);
        });

        it('returns false when occupied, regardless of tile type', () => {
            const grass = new Tile(0, 0, TileType.GRASS);
            grass.occupy({});
            expect(grass.canEnter()).toBe(false);

            const water = new Tile(0, 0, TileType.RIVER_DEEP);
            water.occupy({});
            expect(water.canEnter()).toBe(false);
        });

        it('returns true again after tile is vacated', () => {
            const tile = new Tile(0, 0, TileType.GRASS);
            const entity = {};
            tile.occupy(entity);
            expect(tile.canEnter()).toBe(false);
            tile.vacate();
            expect(tile.canEnter()).toBe(true);
        });
    });

    describe('isWaterTile', () => {
        it('returns true for swimmable tiles', () => {
            expect(new Tile(0, 0, TileType.RIVER_SHALLOW).isWaterTile()).toBe(true);
            expect(new Tile(0, 0, TileType.RIVER_DEEP).isWaterTile()).toBe(true);
        });

        it('returns false for land tiles', () => {
            expect(new Tile(0, 0, TileType.GRASS).isWaterTile()).toBe(false);
            expect(new Tile(0, 0, TileType.DIRT).isWaterTile()).toBe(false);
        });
    });

    describe('occupancy', () => {
        it('occupy sets occupiedBy', () => {
            const tile = new Tile(0, 0, TileType.GRASS);
            const entity = { id: 'player' };
            tile.occupy(entity);
            expect(tile.occupiedBy).toBe(entity);
        });

        it('vacate clears occupiedBy', () => {
            const tile = new Tile(0, 0, TileType.GRASS);
            tile.occupy({ id: 'player' });
            tile.vacate();
            expect(tile.occupiedBy).toBeNull();
        });

        it('blocksMovement when occupied', () => {
            const tile = new Tile(0, 0, TileType.GRASS);
            expect(tile.blocksMovement()).toBe(false);
            tile.occupy({});
            expect(tile.blocksMovement()).toBe(true);
        });
    });

    describe('resources', () => {
        it('setResource clamps count between 0 and 3', () => {
            const tile = new Tile(0, 0, TileType.MUD);
            tile.setResource(ResourceType.MUD, 10);
            expect(tile.resourceCount).toBe(3);
            tile.setResource(ResourceType.MUD, -1);
            expect(tile.resourceCount).toBe(0);
        });

        it('harvestResource returns the resource type and decrements count', () => {
            const tile = new Tile(0, 0, TileType.MUD);
            tile.setResource(ResourceType.MUD, 2);
            expect(tile.harvestResource()).toBe(ResourceType.MUD);
            expect(tile.resourceCount).toBe(1);
        });

        it('harvestResource returns null when count reaches zero', () => {
            const tile = new Tile(0, 0, TileType.MUD);
            tile.setResource(ResourceType.MUD, 1);
            tile.harvestResource();
            expect(tile.harvestResource()).toBeNull();
        });

        it('harvestResource returns null when no resource is set', () => {
            const tile = new Tile(0, 0, TileType.GRASS);
            expect(tile.harvestResource()).toBeNull();
        });
    });
});
