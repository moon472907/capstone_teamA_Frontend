import Phaser from 'phaser';
import { CHARACTER_MANIFEST } from '../../data/characters';
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

    // 캐릭터 스프라이트시트 — 매니페스트(characterManifest.json) 기반으로
    // 모든 캐릭터의 idle/run 을 균일 가로 스트립으로 로드한다.
    // 텍스처 키: `${assetKey}_idle`, `${assetKey}_run`
    Object.values(CHARACTER_MANIFEST).forEach((c) => {
      this.load.spritesheet(`${c.key}_idle`, c.idle.sheet,
        { frameWidth: c.idle.frameWidth, frameHeight: c.idle.frameHeight });
      this.load.spritesheet(`${c.key}_run`, c.run.sheet,
        { frameWidth: c.run.frameWidth, frameHeight: c.run.frameHeight });
    });

    // Bus image for 두리버스 animation
    this.load.image("bus", "/assets/images/bus'/bus.png");

    // Star image for star tile
    this.load.image("star", "/assets/images/star/star.png");

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
