import { TileType, TILE_PROPERTIES } from './TileType';

export enum ResourceType {
    MUD = 'mud',
    ROCKS = 'rocks',
    SHELLS = 'shells',
    TWIGS = 'twigs'
}

export interface TileItem {
    type: string;
    x: number; // Position within tile (0-1)
    y: number; // Position within tile (0-1)
}

export class Tile {
    type: TileType;
    x: number; // Tile grid position
    y: number; // Tile grid position

    // Resources that can be harvested
    resourceType: ResourceType | null = null;
    resourceCount: number = 0;

    // Items placed in this tile
    items: TileItem[] = [];

    // Character occupancy
    occupiedBy: any = null; // Reference to entity occupying this tile

    constructor(x: number, y: number, type: TileType) {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    isWalkable(): boolean {
        if (this.occupiedBy) return false;
        return TILE_PROPERTIES[this.type].walkable;
    }

    isSwimmable(): boolean {
        return TILE_PROPERTIES[this.type].swimmable;
    }

    isInteractable(): boolean {
        return TILE_PROPERTIES[this.type].interactable || this.resourceCount > 0;
    }

    blocksMovement(): boolean {
        return TILE_PROPERTIES[this.type].blocksMovement || this.occupiedBy !== null;
    }

    canEnter(isSwimming: boolean): boolean {
        if (this.occupiedBy) return false;

        if (isSwimming) {
            return this.isSwimmable();
        } else {
            return this.isWalkable();
        }
    }

    setResource(type: ResourceType, count: number): void {
        this.resourceType = type;
        this.resourceCount = Math.min(Math.max(count, 0), 3);
    }

    harvestResource(): ResourceType | null {
        if (this.resourceCount > 0 && this.resourceType) {
            this.resourceCount--;
            return this.resourceType;
        }
        return null;
    }

    addItem(item: TileItem): void {
        this.items.push(item);
    }

    removeItem(item: TileItem): void {
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
        }
    }

    occupy(entity: any): void {
        this.occupiedBy = entity;
    }

    vacate(): void {
        this.occupiedBy = null;
    }
}
