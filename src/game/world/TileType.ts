/**
 * Tile type definitions
 */

export enum TileType {
    // Walkable terrain
    DIRT = 'dirt',
    GRASS = 'grass',
    MUD = 'mud',
    SHORELINE = 'shoreline',

    // Water tiles (swimmable/walkable for otters)
    RIVER_SHALLOW = 'river_shallow',
    RIVER_DEEP = 'river_deep',
    OCEAN = 'ocean',

    // Blocking terrain
    BOULDER = 'boulder',
    CLIFF = 'cliff',
    TREE = 'tree',
    ROCK = 'rock'
}

export interface TileProperties {
    walkable: boolean;
    swimmable: boolean;
    interactable: boolean;
    blocksMovement: boolean;
}

export const TILE_PROPERTIES: Record<TileType, TileProperties> = {
    [TileType.DIRT]: { walkable: true, swimmable: false, interactable: false, blocksMovement: false },
    [TileType.GRASS]: { walkable: true, swimmable: false, interactable: false, blocksMovement: false },
    [TileType.MUD]: { walkable: true, swimmable: false, interactable: true, blocksMovement: false },
    [TileType.SHORELINE]: { walkable: true, swimmable: false, interactable: false, blocksMovement: false },
    [TileType.RIVER_SHALLOW]: { walkable: true, swimmable: true, interactable: false, blocksMovement: false },
    [TileType.RIVER_DEEP]: { walkable: true, swimmable: true, interactable: false, blocksMovement: false },
    [TileType.OCEAN]: { walkable: true, swimmable: true, interactable: false, blocksMovement: false },
    [TileType.BOULDER]: { walkable: false, swimmable: false, interactable: false, blocksMovement: true },
    [TileType.CLIFF]: { walkable: false, swimmable: false, interactable: false, blocksMovement: true },
    [TileType.TREE]: { walkable: false, swimmable: false, interactable: true, blocksMovement: true },
    [TileType.ROCK]: { walkable: false, swimmable: false, interactable: false, blocksMovement: true }
};
