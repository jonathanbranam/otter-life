import { Scene } from 'phaser';

export type Direction = 'up' | 'down' | 'left' | 'right';

export class Player {
    belly: Phaser.GameObjects.Graphics | null;
    head: Phaser.GameObjects.Graphics | null;
    direction: Direction;

    // Size constants - fits within 32x32 square
    readonly BELLY_RADIUS = 10;
    readonly HEAD_RADIUS = 6;
    readonly HEAD_OFFSET = 12; // Distance from center to head position

    constructor(scene: Scene, x: number, y: number) {
        this.direction = 'right';

        // Create belly (round circle) - darker brown
        this.belly = scene.add.graphics();
        this.belly.fillStyle(0x8B4513, 1); // Saddle brown
        this.belly.fillCircle(0, 0, this.BELLY_RADIUS);

        // Add belly highlight (lighter brown)
        this.belly.fillStyle(0xA0522D, 1); // Sienna brown
        this.belly.fillCircle(-2, -2, this.BELLY_RADIUS * 0.6);

        this.belly.setPosition(x, y);
        this.belly.setData('parent', this);

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

        this.head.setData('parent', this);

        // Set initial head position based on direction
        this.updateHeadPosition(x, y);

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

    setDirection(direction: Direction): void {
        this.direction = direction;
        if (this.belly) {
            this.updateHeadPosition(this.belly.x, this.belly.y);
        }
    }

    updateHeadPosition(centerX: number, centerY: number): void {
        if (!this.head) return;

        let headX = centerX;
        let headY = centerY;

        switch (this.direction) {
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

    move(dx: number, dy: number): void {
        if (!this.belly) return;

        const newX = this.belly.x + dx;
        const newY = this.belly.y + dy;

        // Update direction based on movement
        if (dx > 0) this.setDirection('right');
        else if (dx < 0) this.setDirection('left');
        else if (dy < 0) this.setDirection('up');
        else if (dy > 0) this.setDirection('down');

        this.setPosition(newX, newY);
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

    getTilePosition(): { x: number, y: number } {
        const pos = this.getPosition();
        return {
            x: Math.floor(pos.x / 32), // TILE_SIZE = 32
            y: Math.floor(pos.y / 32)
        };
    }
}
