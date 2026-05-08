const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 760,       // 640 -> 760 으로 증가
  backgroundColor: "#1a1a2e",
  parent: "game-container",
  scene: [PreloadScene, MenuScene, BoardScene]
};

const game = new Phaser.Game(config);
