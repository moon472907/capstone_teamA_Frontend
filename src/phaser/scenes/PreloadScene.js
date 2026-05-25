import Phaser from 'phaser';
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // Loading bar
    this.add.graphics()
      .fillStyle(0x1a3a10, 1)
      .fillRect(150, 350, 600, 8);

    const fill = this.add.graphics();
    this.load.on("progress", (v) => {
      fill.clear()
        .fillStyle(0xd4a020, 1)
        .fillRect(150, 350, 600 * v, 8);
    });

    this.add.text(450, 320, "Loading...", {
      fontSize: "18px", fontFamily: "Impact",
      color: "#d4a020"
    }).setOrigin(0.5);

    // Map assets
    this.load.image("map", "/assets/images/map.png");
    this.load.json("mapData", "/assets/map_data.json");

    // Character spritesheets  (112×96 per frame, 9 frames)
    this.load.spritesheet("player_idle", "/assets/images/characters/player1.png",
      { frameWidth: 112, frameHeight: 96 });
    this.load.spritesheet("player_run",  "/assets/images/characters/player1_run.png",
      { frameWidth: 112, frameHeight: 96 });

    // Bus image for 두리버스 animation
    this.load.image("bus", "/assets/images/bus'/bus.png");

    // Star image for star tile
    this.load.image("star", "/assets/images/star/star.jpg");

    // Procedural bg texture (used by MenuScene)
    this.createBgTexture();
  }

  createBgTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillGradientStyle(0x0a1e08, 0x0a1e08, 0x061208, 0x061208, 1);
    g.fillRect(0, 0, 900, 760);
    g.generateTexture("bg", 900, 760);
    g.destroy();
  }

  create() {
    this.scene.start("BoardScene");
  }
}
