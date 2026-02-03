import { Scene, GameObjects } from 'phaser';
import { SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_HEIGHT } from '../constants';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(SCREEN_CENTER_X, SCREEN_CENTER_Y, 'background');

        // Logo positioned at ~39% from top (maintaining original 300/768 ratio)
        this.logo = this.add.image(SCREEN_CENTER_X, SCREEN_HEIGHT * 0.390625, 'logo');

        // Title positioned at ~60% from top (maintaining original 460/768 ratio)
        this.title = this.add.text(SCREEN_CENTER_X, SCREEN_HEIGHT * 0.598958, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {

            this.scene.start('WorldScene');

        });
    }
}
