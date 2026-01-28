// OtterScene - Main game scene

class OtterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OtterScene' });
    }

    create() {
        // Use constants from config
        this.tileSize = GAME_CONSTANTS.TILE_SIZE;
        this.gridWidth = GAME_CONSTANTS.GRID_WIDTH;
        this.gridHeight = GAME_CONSTANTS.GRID_HEIGHT;

        this.createBackground();
        this.createOtterTextures();
        this.createPlayerOtter();
        this.createNPCOtters();
        this.setupInput();
        this.setupUI();
    }

    createBackground() {
        // Background - sky
        this.add.rectangle(400, 400, 800, 800, 0x87CEEB);

        // Draw grass banks on top and bottom
        this.add.rectangle(400, 150, 800, 300, 0x4CAF50); // Top grass
        this.add.rectangle(400, 650, 800, 300, 0x4CAF50); // Bottom grass

        // Draw river in the middle
        this.add.rectangle(400, 400, 800, 300, 0x4A90E2); // River water

        // Add river details (darker water ripples)
        for (let i = 0; i < 15; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(250, 550);
            this.add.ellipse(x, y, 50, 25, 0x3A7BC8, 0.3);
        }

        // Add grass detail on banks
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, 800);
            const yTop = Phaser.Math.Between(50, 200);
            const yBottom = Phaser.Math.Between(600, 750);
            this.add.circle(x, yTop, 6, 0x2E7D32);
            this.add.circle(x, yBottom, 6, 0x2E7D32);
        }
    }

    drawGrid() {
        // Helper function to visualize the grid (optional)
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0xffffff, 0.2);

        for (let x = 0; x <= this.gridWidth; x++) {
            graphics.lineBetween(x * this.tileSize, 0, x * this.tileSize, 800);
        }
        for (let y = 0; y <= this.gridHeight; y++) {
            graphics.lineBetween(0, y * this.tileSize, 800, y * this.tileSize);
        }
    }

    createOtterTextures() {
        // Define otter color variations
        const otterColors = [
            { name: 'otter-brown', color: 0x8B4513, belly: 0xD2B48C },
            { name: 'otter-dark', color: 0x654321, belly: 0x8B7355 },
            { name: 'otter-light', color: 0xA0826D, belly: 0xE5C9A3 },
            { name: 'otter-gray', color: 0x808080, belly: 0xC0C0C0 },
            { name: 'otter-tan', color: 0xD2B48C, belly: 0xF5DEB3 }
        ];

        otterColors.forEach(({ name, color, belly }) => {
            this.createSingleOtterTexture(name, color, belly);
        });
    }

    createSingleOtterTexture(name, color, belly) {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Rounder, cuter body
        graphics.fillStyle(color, 1);
        graphics.fillCircle(50, 55, 18);

        // Cute belly patch
        graphics.fillStyle(belly, 1);
        graphics.fillEllipse(50, 58, 12, 16);

        // Arms/paws
        graphics.fillStyle(color, 1);
        graphics.fillCircle(38, 58, 6);
        graphics.fillCircle(62, 58, 6);

        // Tail - fluffier
        graphics.fillCircle(50, 72, 10);
        graphics.fillCircle(52, 78, 8);

        // Head - bigger and rounder for cuteness
        graphics.fillCircle(50, 35, 14);

        // Cute ears - rounder
        graphics.fillCircle(42, 24, 5);
        graphics.fillCircle(58, 24, 5);

        // Belly on head (muzzle area)
        graphics.fillStyle(belly, 1);
        graphics.fillCircle(50, 40, 8);

        // BIG cute eyes with shine
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(44, 32, 4);
        graphics.fillCircle(56, 32, 4);

        // Eye shine for extra cuteness
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillCircle(45, 31, 1.5);
        graphics.fillCircle(57, 31, 1.5);

        // Cute little nose
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(50, 38, 2);

        // Whisker dots
        graphics.fillCircle(40, 36, 0.8);
        graphics.fillCircle(60, 36, 0.8);
        graphics.fillCircle(38, 38, 0.8);
        graphics.fillCircle(62, 38, 0.8);

        graphics.generateTexture(name, 100, 100);
        graphics.destroy();
    }

    createPlayerOtter() {
        this.otter = this.add.sprite(0, 0, 'otter-brown');
        this.otter.setScale(1.0);
        this.otter.setDepth(2);

        // Grid-based movement variables
        this.otterGridX = Math.floor(this.gridWidth / 2);
        this.otterGridY = Math.floor(this.gridHeight / 2);
        this.isMoving = false;
        this.moveSpeed = GAME_CONSTANTS.MOVE_SPEED;
        this.targetX = 0;
        this.targetY = 0;

        // Set initial position
        this.updateOtterPosition();
    }

    createNPCOtters() {
        this.npcOtters = [];

        const otterTypes = [
            { texture: 'otter-dark', scale: 0.9 },
            { texture: 'otter-light', scale: 1.1 },
            { texture: 'otter-gray', scale: 0.96 },
            { texture: 'otter-tan', scale: 1.04 }
        ];

        // Place otters in the water (middle area)
        this.spawnNPCOtters(otterTypes, 5, 10, 22);

        // Place otters on top grass bank
        this.spawnNPCOtters(otterTypes, 3, 0, 8);

        // Place otters on bottom grass bank
        this.spawnNPCOtters(otterTypes, 3, 24, 31);
    }

    spawnNPCOtters(otterTypes, count, minY, maxY) {
        for (let i = 0; i < count; i++) {
            const type = Phaser.Utils.Array.GetRandom(otterTypes);
            const gridX = Phaser.Math.Between(2, this.gridWidth - 3);
            const gridY = Phaser.Math.Between(minY, maxY);

            const npcOtter = this.add.sprite(
                gridX * this.tileSize + this.tileSize / 2,
                gridY * this.tileSize + this.tileSize / 2,
                type.texture
            );
            npcOtter.setScale(type.scale);
            npcOtter.setDepth(1);

            this.npcOtters.push({
                sprite: npcOtter,
                gridX: gridX,
                gridY: gridY
            });
        }
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            w: this.input.keyboard.addKey('W'),
            a: this.input.keyboard.addKey('A'),
            s: this.input.keyboard.addKey('S'),
            d: this.input.keyboard.addKey('D')
        };

        this.lastMoveTime = 0;
        this.moveDelay = GAME_CONSTANTS.MOVE_DELAY;
    }

    setupUI() {
        this.speedText = this.add.text(10, 10, '', { font: '16px Arial', fill: '#fff' });
    }

    checkNearbyOtters() {
        if (this.isMoving) return;

        for (let npc of this.npcOtters) {
            const distX = Math.abs(this.otterGridX - npc.gridX);
            const distY = Math.abs(this.otterGridY - npc.gridY);
            const distance = Math.sqrt(distX * distX + distY * distY);

            if (distance <= 0.5) {
                window.dialogueManager.showDialogue(npc, this);
                return;
            }
        }
    }

    updateOtterPosition() {
        this.targetX = this.otterGridX * this.tileSize + this.tileSize / 2;
        this.targetY = this.otterGridY * this.tileSize + this.tileSize / 2;
    }

    moveOtterToGrid(deltaX, deltaY) {
        if (this.isMoving) return;

        const newGridX = this.otterGridX + deltaX;
        const newGridY = this.otterGridY + deltaY;

        if (newGridX >= 0 && newGridX < this.gridWidth &&
            newGridY >= 0 && newGridY < this.gridHeight) {
            this.otterGridX = newGridX;
            this.otterGridY = newGridY;
            this.updateOtterPosition();
            this.isMoving = true;
        }
    }

    update(time, delta) {
        this.updateVirtualJoystickState();
        this.handleMovement(time, delta);
        this.updateDebugText();
    }

    updateVirtualJoystickState() {
        if (typeof window.virtualJoystick !== 'undefined') {
            this.virtualJoystickX = window.virtualJoystick.x;
            this.virtualJoystickY = window.virtualJoystick.y;
        } else {
            this.virtualJoystickX = 0;
            this.virtualJoystickY = 0;
        }
    }

    handleMovement(time, delta) {
        // Smooth movement towards target
        if (this.isMoving) {
            this.smoothMoveToTarget(delta);
        }

        // Process new movement input
        if (!this.isMoving && time > this.lastMoveTime + this.moveDelay) {
            const moved = this.processInput();
            if (moved) {
                this.lastMoveTime = time;
            }
        }
    }

    smoothMoveToTarget(delta) {
        const dx = this.targetX - this.otter.x;
        const dy = this.targetY - this.otter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
            this.otter.x = this.targetX;
            this.otter.y = this.targetY;
            this.isMoving = false;
            this.checkNearbyOtters();
        } else {
            const moveAmount = (this.moveSpeed * delta) / 1000;
            const ratio = Math.min(moveAmount / distance, 1);
            this.otter.x += dx * ratio;
            this.otter.y += dy * ratio;
        }
    }

    processInput() {
        const threshold = GAME_CONSTANTS.JOYSTICK_THRESHOLD;

        // Virtual joystick input (highest priority)
        if (Math.abs(this.virtualJoystickX) > threshold) {
            this.moveOtterToGrid(this.virtualJoystickX > 0 ? 1 : -1, 0);
            return true;
        }
        if (Math.abs(this.virtualJoystickY) > threshold) {
            this.moveOtterToGrid(0, this.virtualJoystickY > 0 ? 1 : -1);
            return true;
        }

        // Keyboard input
        if (this.cursors.left.isDown || this.keys.a.isDown) {
            this.moveOtterToGrid(-1, 0);
            return true;
        }
        if (this.cursors.right.isDown || this.keys.d.isDown) {
            this.moveOtterToGrid(1, 0);
            return true;
        }
        if (this.cursors.up.isDown || this.keys.w.isDown) {
            this.moveOtterToGrid(0, -1);
            return true;
        }
        if (this.cursors.down.isDown || this.keys.s.isDown) {
            this.moveOtterToGrid(0, 1);
            return true;
        }

        // Gamepad input
        return this.processGamepadInput(threshold);
    }

    processGamepadInput(threshold) {
        const gamepads = this.input.gamepad.gamepads;
        if (!gamepads[0]) return false;

        const pad = gamepads[0];

        if (pad.left || pad.dpadLeft || (pad.axes[0] && pad.axes[0].value < -threshold)) {
            this.moveOtterToGrid(-1, 0);
            return true;
        }
        if (pad.right || pad.dpadRight || (pad.axes[0] && pad.axes[0].value > threshold)) {
            this.moveOtterToGrid(1, 0);
            return true;
        }
        if (pad.up || pad.dpadUp || (pad.axes[1] && pad.axes[1].value < -threshold)) {
            this.moveOtterToGrid(0, -1);
            return true;
        }
        if (pad.down || pad.dpadDown || (pad.axes[1] && pad.axes[1].value > threshold)) {
            this.moveOtterToGrid(0, 1);
            return true;
        }

        return false;
    }

    updateDebugText() {
        this.speedText.setText(
            `Grid: (${this.otterGridX}, ${this.otterGridY}) | Position: (${Math.round(this.otter.x)}, ${Math.round(this.otter.y)})`
        );
    }
}
