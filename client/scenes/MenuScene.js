class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }); }

  create() {
    const W = 900, H = 760;

    // ── Background ───────────────────────────────────────────
    this.add.image(W / 2, H / 2, "bg");

    // Subtle dot pattern
    for (let i = 0; i < 40; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(0x4aaa28, Phaser.Math.FloatBetween(0.04, 0.18));
      dot.fillCircle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.Between(2, 6)
      );
      this.tweens.add({
        targets: dot, alpha: 0.02,
        duration: Phaser.Math.Between(1200, 3200),
        yoyo: true, repeat: -1
      });
    }

    // ── Gold border frame ─────────────────────────────────────
    const frame = this.add.graphics();
    frame.lineStyle(2, 0xd4a020, 0.5);
    frame.strokeRect(20, 20, W - 40, H - 40);
    frame.lineStyle(1, 0x5aaa28, 0.3);
    frame.strokeRect(26, 26, W - 52, H - 52);

    // Corner ornaments
    [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]].forEach(([cx, cy]) => {
      frame.fillStyle(0xd4a020, 0.8);
      frame.fillCircle(cx, cy, 5);
    });

    // ── Title block ───────────────────────────────────────────
    const titlePanel = this.add.graphics();
    titlePanel.fillStyle(0x0d1f08, 0.88);
    titlePanel.fillRoundedRect(W / 2 - 240, 60, 480, 110, 10);
    titlePanel.lineStyle(2, 0x5aaa28, 0.9);
    titlePanel.strokeRoundedRect(W / 2 - 240, 60, 480, 110, 10);
    titlePanel.lineStyle(1, 0xd4a020, 0.4);
    titlePanel.strokeRoundedRect(W / 2 - 237, 63, 474, 104, 7);

    const title = this.add.text(W / 2, 110, "GOMDURI PARTY", {
      fontSize: "58px", fontFamily: "Impact",
      color: "#d4a020", stroke: "#0a1e08", strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: "#000000", blur: 10, fill: true }
    }).setOrigin(0.5);

    this.add.text(W / 2, 152, "CAMPUS  BOARD  GAME", {
      fontSize: "13px", fontFamily: "Impact",
      color: "#7aaa40", letterSpacing: 6
    }).setOrigin(0.5);

    // Title pulse
    this.tweens.add({
      targets: title, scaleX: 1.03, scaleY: 1.03,
      duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
    });

    // ── Character preview ─────────────────────────────────────
    const charPanel = this.add.graphics();
    charPanel.fillStyle(0x0d1f08, 0.75);
    charPanel.fillRoundedRect(W / 2 - 70, 200, 140, 130, 10);
    charPanel.lineStyle(1.5, 0x5aaa28, 0.7);
    charPanel.strokeRoundedRect(W / 2 - 70, 200, 140, 130, 10);

    // Shadow under character
    const charShadow = this.add.graphics();
    charShadow.fillStyle(0x000000, 0.28);
    charShadow.fillEllipse(W / 2, 316, 72, 18);

    const charSprite = this.add.sprite(W / 2, 280, "player_idle")
      .setScale(0.72)
      .setOrigin(0.5, 0.85);

    if (!this.anims.exists("menu_idle")) {
      this.anims.create({
        key: "menu_idle",
        frames: this.anims.generateFrameNumbers("player_idle", { start: 0, end: 8 }),
        frameRate: 7, repeat: -1
      });
    }
    charSprite.play("menu_idle");

    // Floating animation on the character
    this.tweens.add({
      targets: [charSprite, charShadow],
      y: "-=6",
      duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
    });

    // ── Info text ─────────────────────────────────────────────
    this.add.text(W / 2, 356, "DEMO VERSION  ·  1 PLAYER", {
      fontSize: "12px", fontFamily: "Impact",
      color: "#5aaa28", letterSpacing: 3
    }).setOrigin(0.5);

    this.add.text(W / 2, 390, "주사위를 굴려 캠퍼스를 탐험하세요!\nFINISH에 가장 먼저 도착한 플레이어가 승리합니다.", {
      fontSize: "15px", fontFamily: "Arial",
      color: "#c8e8a8", align: "center", lineSpacing: 6
    }).setOrigin(0.5);

    // ── START button ──────────────────────────────────────────
    const BW = 260, BH = 58, BX = W / 2 - 130, BY = 460;
    const startBtn = this.add.graphics();
    const drawStart = (h) => {
      startBtn.clear();
      startBtn.fillStyle(h ? 0x3aaa18 : 0x2a7a10, 1);
      startBtn.fillRoundedRect(BX, BY, BW, BH, 10);
      startBtn.lineStyle(2, h ? 0x7aee40 : 0x5aaa28, 1);
      startBtn.strokeRoundedRect(BX, BY, BW, BH, 10);
      startBtn.lineStyle(1, 0xd4a020, h ? 0.6 : 0.3);
      startBtn.strokeRoundedRect(BX + 3, BY + 3, BW - 6, BH - 6, 7);
    };
    drawStart(false);
    startBtn.setInteractive(
      new Phaser.Geom.Rectangle(BX, BY, BW, BH),
      Phaser.Geom.Rectangle.Contains
    );

    const startLabel = this.add.text(W / 2, BY + BH / 2, "▶  게임 시작", {
      fontSize: "26px", fontFamily: "Impact",
      color: "#f0e8c8", stroke: "#0a1e08", strokeThickness: 3
    }).setOrigin(0.5);

    startBtn.on("pointerover",  () => { drawStart(true);  startLabel.setStyle({ color: "#d4a020" }); });
    startBtn.on("pointerout",   () => { drawStart(false); startLabel.setStyle({ color: "#f0e8c8" }); });
    startBtn.on("pointerdown",  () => {
      this.tweens.add({
        targets: [startBtn, startLabel],
        scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true,
        onComplete: () => this.scene.start("BoardScene", {})
      });
    });

    // ── Footer ─────────────────────────────────────────────────
    this.add.text(W / 2, H - 34, "Capstone Project  ·  Gomduri Party  ·  2026", {
      fontSize: "11px", fontFamily: "Arial",
      color: "#3a6a18", letterSpacing: 1
    }).setOrigin(0.5);
  }
}
