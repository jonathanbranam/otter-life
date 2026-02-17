import { Scene } from 'phaser';
import { TILE_SIZE } from '../constants';
import { PlayerState } from '../simulation/PlayerState';

/**
 * Phaser rendering layer for the player.
 * Reads position/direction from a PlayerState and syncs the Phaser graphics.
 */
export class Player {
    belly: Phaser.GameObjects.Graphics | null;
    head: Phaser.GameObjects.Graphics | null;
    state: PlayerState;

    // Size constants - fits within 32x32 square
    readonly BELLY_RADIUS = 10;
    readonly HEAD_RADIUS = 6;
    readonly HEAD_OFFSET = 12; // Distance from center to head position

    constructor(scene: Scene, state: PlayerState) {
        this.state = state;

        const pixelX = state.tileX * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = state.tileY * TILE_SIZE + TILE_SIZE / 2;

        // Create belly (round circle) - darker brown
        this.belly = scene.add.graphics();
        this.belly.fillStyle(0x8B4513, 1); // Saddle brown
        this.belly.fillCircle(0, 0, this.BELLY_RADIUS);

        // Add belly highlight (lighter brown)
        this.belly.fillStyle(0xA0522D, 1); // Sienna brown
        this.belly.fillCircle(-2, -2, this.BELLY_RADIUS * 0.6);

        this.belly.setPosition(pixelX, pixelY);

        // Create head (smaller circle) - medium brown
        this.head = scene.add.graphics();
        this.head.fillStyle(0x8B4513, 1); // Saddle brown
        this.head.fillCircle(0, 0, this.HEAD_RADIUS);

        // Add facial features to head
        this.head.fillStyle(0x000000, 1); // Black for eyes and nose
        this.head.fillCircle(-2, -1.5, 1); // Left eye
        this.head.fillCircle(2, -1.5, 1); // Right eye
        this.head.fillCircle(0, 1, 1.5); // Nose

        // Add lighter brown cheeks
        this.head.fillStyle(0xD2691E, 0.6); // Chocolate brown
        this.head.fillCircle(-3, 0, 2); // Left cheek
        this.head.fillCircle(3, 0, 2); // Right cheek

        // Set initial head position based on direction
        this.updateHeadPosition(pixelX, pixelY);

        // Handle destruction
        this.belly.once('destroy', this.onBellyDestroyed, this);
        this.head.once('destroy', this.onHeadDestroyed, this);
    }

    onBellyDestroyed(): void {
        this.belly = null;
    }

    onHeadDestroyed(): void {
        this.head = null;
    }

    /**
     * Sync the Phaser graphics positions from the PlayerState tile coordinates.
     */
    syncFromState(): void {
        const pixelX = this.state.tileX * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = this.state.tileY * TILE_SIZE + TILE_SIZE / 2;
        this.setPosition(pixelX, pixelY);
    }

    /**
     * Sync from arbitrary tile coordinates (e.g. river coordinates).
     */
    syncFromTile(tileX: number, tileY: number): void {
        const pixelX = tileX * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = tileY * TILE_SIZE + TILE_SIZE / 2;
        this.setPosition(pixelX, pixelY);
    }

    updateHeadPosition(centerX: number, centerY: number): void {
        if (!this.head) return;

        let headX = centerX;
        let headY = centerY;

        switch (this.state.direction) {
            case 'right':
                headX += this.HEAD_OFFSET;
                break;
            case 'left':
                headX -= this.HEAD_OFFSET;
                break;
            case 'up':
                headY -= this.HEAD_OFFSET;
                break;
            case 'down':
                headY += this.HEAD_OFFSET;
                break;
        }

        this.head.setPosition(headX, headY);
    }

    setPosition(x: number, y: number): void {
        if (this.belly) {
            this.belly.setPosition(x, y);
            this.updateHeadPosition(x, y);
        }
    }

    destroy(): void {
        if (this.belly) {
            this.belly.destroy();
        }
        if (this.head) {
            this.head.destroy();
        }
    }

    setDepth(depth: number): void {
        if (this.belly) this.belly.setDepth(depth);
        if (this.head) this.head.setDepth(depth);
    }

    getPosition(): { x: number, y: number } {
        if (this.belly) {
            return { x: this.belly.x, y: this.belly.y };
        }
        return { x: 0, y: 0 };
    }
}
