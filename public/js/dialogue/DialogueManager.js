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

        // Get the otter's texture from the Phaser game
        const textureKey = npc.sprite.texture.key;
        const texture = scene.textures.get(textureKey);
        const source = texture.getSourceImage();

        // Draw the otter texture zoomed in on the face/head area
        // The otter texture is 100x100, head is centered around (50, 35)
        // Zoom in by 4x and center on the head
        const zoom = 4;
        const sourceX = 25;  // Start x in source (to center on head at x=50)
        const sourceY = 10;  // Start y in source (to capture from ears to muzzle)
        const sourceW = 50;  // Width of area to capture
        const sourceH = 50;  // Height of area to capture

        ctx.drawImage(
            source,
            sourceX, sourceY, sourceW, sourceH,  // Source rectangle
            0, 0, 200, 200                        // Destination rectangle (full canvas)
        );

        this.portraitDiv.appendChild(canvas);

        // Set random dialogue
        this.dialogueText.textContent = this.getRandomDialogue();

        // Show overlay
        this.overlay.classList.add('active');
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
