// Dialogue Manager Module - Handles NPC dialogues and overlay

class DialogueManager {
    constructor(game) {
        this.game = game;
        this.overlay = document.getElementById('dialogue-overlay');
        this.portraitDiv = document.getElementById('otter-portrait');
        this.dialogueText = document.getElementById('dialogue-text');
        this.okButton = document.getElementById('dialogue-ok');

        this.dialogues = [
            "Hey there! The water's great today!",
            "Have you seen any fish around here?",
            "I love floating on my back!",
            "Did you know otters hold hands while sleeping?",
            "These rocks are perfect for cracking open shellfish!",
            "The current is especially nice downstream.",
            "I found the best sliding spot earlier!",
            "Nothing beats a good swim in the morning!",
            "Have you tried catching crawfish? They're delicious!",
            "I'm just taking a little break on the bank.",
            "The water temperature is perfect right now!",
            "Want to race to the other side?",
            "I saw a family of ducks earlier, so cute!",
            "This is my favorite spot to relax.",
            "The fish are really active today!",
            "I love living by this river!",
            "Sometimes I just float and watch the clouds.",
            "Have you explored the whole river yet?",
            "I'm looking for smooth pebbles for my collection!",
            "Nice day for a swim, isn't it?"
        ];

        this.init();
    }

    init() {
        this.okButton.addEventListener('click', () => this.closeDialogue());
    }

    getRandomDialogue() {
        return Phaser.Utils.Array.GetRandom(this.dialogues);
    }

    showDialogue(npc, scene) {
        // Pause the game
        scene.scene.pause();

        // Clear previous portrait
        this.portraitDiv.innerHTML = '';

        // Create a canvas for the otter portrait
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Get the otter's texture color from its key
        const textureKey = npc.sprite.texture.key;
        let otterColor = this.getOtterColor(textureKey);

        // Draw larger otter portrait
        this.drawOtterPortrait(ctx, otterColor);

        this.portraitDiv.appendChild(canvas);

        // Set random dialogue
        this.dialogueText.textContent = this.getRandomDialogue();

        // Show overlay
        this.overlay.classList.add('active');
    }

    getOtterColor(textureKey) {
        if (textureKey.includes('dark')) return 0x654321;
        if (textureKey.includes('light')) return 0xA0826D;
        if (textureKey.includes('gray')) return 0x808080;
        if (textureKey.includes('tan')) return 0xD2B48C;
        return 0x8B4513; // default brown
    }

    drawOtterPortrait(ctx, otterColor) {
        ctx.fillStyle = '#' + otterColor.toString(16).padStart(6, '0');

        // Scale up for portrait (2x size)
        const scale = 2;

        // Otter body
        ctx.beginPath();
        ctx.arc(100, 100, 24 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Otter head
        ctx.beginPath();
        ctx.arc(100, 70, 18 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(94, 64, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(106, 64, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#' + otterColor.toString(16).padStart(6, '0');
        ctx.beginPath();
        ctx.arc(90, 56, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(110, 56, 6 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.arc(116, 104, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    closeDialogue() {
        this.overlay.classList.remove('active');

        // Resume the game
        const scene = this.game.scene.scenes[0];
        if (scene.scene.isPaused()) {
            scene.scene.resume();
        }
    }
}
