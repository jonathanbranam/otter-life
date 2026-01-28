// Main entry point - Initialize game and all modules

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Add scene to config
    gameConfig.scene = OtterScene;

    // Create the game
    const game = new Phaser.Game(gameConfig);

    // Initialize virtual controls
    const virtualControls = new VirtualControls();

    // Initialize dialogue manager (needs game reference)
    window.dialogueManager = new DialogueManager(game);
});
