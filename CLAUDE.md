# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Otter Life is an interactive browser-based 2D game built with Phaser 3 and vanilla JavaScript. Players control an otter, explore a river environment, and interact with NPC otters through dialogue.

## Development Commands

```bash
npm start       # Start HTTP server at http://localhost:8080
```

No build step required - changes to JS/CSS/HTML are reflected immediately in the browser.

## Architecture

### Entry Point Flow
1. `public/index.html` loads Phaser 3 from CDN and all JS modules
2. `public/js/main.js` initializes on DOMContentLoaded, creates the Phaser game instance
3. `OtterScene` is the main game scene where gameplay logic lives

### Core Modules

- **`public/js/scenes/OtterScene.js`** - Main game scene extending `Phaser.Scene`. Handles rendering, player movement, NPC spawning, procedural otter texture generation, and input processing
- **`public/js/dialogue/DialogueManager.js`** - NPC dialogue overlay system with canvas-based otter portrait rendering
- **`public/js/controls/VirtualControls.js`** - Touch/mouse joystick input handler. Exposes state via `window.virtualJoystick`
- **`public/js/config.js`** - Game constants (tile size, grid dimensions, movement speeds)

### Key Constants (from config.js)
- Grid: 32x32 tiles, 25px per tile
- Movement: 200ms speed, 150ms delay between moves
- Joystick threshold: 0.3

### Input System
Three input methods with priority: Virtual Joystick > Keyboard (arrows/WASD) > Gamepad. Movement is grid-based (turn-based), not continuous.

### Graphics
All graphics are procedurally generated using Phaser's Graphics API - no external image assets. Five otter color variations, 100x100px sprites.

## Tech Stack
- Phaser 3.55.2 (CDN-loaded)
- Vanilla ES6 JavaScript (no bundler)
- HTML5 Canvas
- CSS with mobile breakpoints at 850px and 480px
