export type Direction = 'up' | 'down' | 'left' | 'right';

export class PlayerState {
    tileX: number;
    tileY: number;
    direction: Direction;
    isSwimming: boolean;

    constructor(tileX: number, tileY: number, direction: Direction = 'right') {
        this.tileX = tileX;
        this.tileY = tileY;
        this.direction = direction;
        this.isSwimming = false;
    }
}
