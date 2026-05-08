import Phaser from 'phaser';
export default class DiceManager {
  constructor(scene) {
    this.scene = scene;
  }

  roll() {
    return Phaser.Math.Between(1, 6);
  }
}
