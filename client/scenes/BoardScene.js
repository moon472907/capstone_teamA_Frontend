// Campus colour palette
const C = {
  panelBg:     0x0d1f08,
  panelBg2:    0x142a0c,
  border:      0x5aaa28,
  borderDim:   0x2a6010,
  gold:        0xd4a020,
  cream:       0xf0e8c8,
  red:         0x8b2a1a,
  redHover:    0xb03828,
  green:       0x2a7a10,
  greenHover:  0x3aaa18,
  blue:        0x1a5a9a,
  blueHover:   0x2a7acc
};

class BoardScene extends Phaser.Scene {
  constructor() { super({ key: "BoardScene" }); }

  init() { /* demo: 1 player forced in GameManager */ }

  create() {
    this.gameManager   = new GameManager(1);
    this.boardManager  = new BoardManager(this);
    this.diceManager   = new DiceManager(this);
    this.playerManager = new PlayerManager(this, this.gameManager, this.boardManager);

    this.boardManager.createBoard();
    this.playerManager.createPlayers();

    this._buildUI();
    this._buildDiceButton();
  }

  // ─────────────────────────────────────────────────────────────
  //  UI
  // ─────────────────────────────────────────────────────────────
  _buildUI() {
    const W = 900, H = 760, BAR_H = 112, BAR_Y = H - BAR_H;

    // ── Header ───────────────────────────────────────────────
    const hdr = this.add.graphics().setDepth(400);
    hdr.fillStyle(C.panelBg, 0.96);
    hdr.fillRect(0, 0, W, 52);
    hdr.lineStyle(2, C.border, 0.9);
    hdr.lineBetween(0, 52, W, 52);

    // Decorative corner marks
    [[6, 4], [W - 6, 4]].forEach(([x, y]) => {
      hdr.lineStyle(1.5, C.gold, 0.7);
      hdr.strokeRect(x - 4, y, 8, 44);
    });

    this.add.text(W / 2, 26, "GOMDURI PARTY", {
      fontSize: "26px", fontFamily: "Impact",
      color: "#d4a020", stroke: "#0a1e08", strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 4, fill: true }
    }).setOrigin(0.5).setDepth(401);

    this.add.text(W / 2, 42, "CAMPUS BOARD GAME  —  DEMO", {
      fontSize: "9px", fontFamily: "Arial",
      color: "#7aaa40", letterSpacing: 3
    }).setOrigin(0.5).setDepth(401);

    // ── Bottom bar ───────────────────────────────────────────
    const bar = this.add.graphics().setDepth(400);
    bar.fillStyle(C.panelBg, 0.97);
    bar.fillRect(0, BAR_Y, W, BAR_H);
    // Top border line
    bar.lineStyle(2, C.border, 0.85);
    bar.lineBetween(0, BAR_Y, W, BAR_Y);
    // Gold accent stripe
    bar.lineStyle(1, C.gold, 0.4);
    bar.lineBetween(0, BAR_Y + 2, W, BAR_Y + 2);

    // ── Player card ──────────────────────────────────────────
    const CX = 14, CY = BAR_Y + 8, CW = 200, CH = BAR_H - 16;
    const card = this.add.graphics().setDepth(401);
    card.fillStyle(C.panelBg2, 1);
    card.fillRoundedRect(CX, CY, CW, CH, 8);
    card.lineStyle(1.5, C.border, 1);
    card.strokeRoundedRect(CX, CY, CW, CH, 8);
    card.lineStyle(1, C.gold, 0.35);
    card.strokeRoundedRect(CX + 2, CY + 2, CW - 4, CH - 4, 6);

    // Mini character icon (static frame from spritesheet)
    const icon = this.add.sprite(CX + 28, CY + CH / 2 + 2, "player_idle", 0)
      .setScale(0.32)
      .setDepth(403);

    this.add.text(CX + 52, CY + 10, "PLAYER 1", {
      fontSize: "13px", fontFamily: "Impact", color: "#d4a020"
    }).setDepth(402);

    this.nodeText = this.add.text(CX + 52, CY + 30, "위치: node1", {
      fontSize: "12px", fontFamily: "Arial", color: "#c8e8a8"
    }).setDepth(402);

    this.stepText = this.add.text(CX + 52, CY + 50, "", {
      fontSize: "11px", fontFamily: "Arial", color: "#8ac870"
    }).setDepth(402);

    // Separating line
    const sep = this.add.graphics().setDepth(400);
    sep.lineStyle(1, C.borderDim, 0.8);
    sep.lineBetween(CX + CW + 8, BAR_Y + 12, CX + CW + 8, BAR_Y + BAR_H - 12);

    // ── Dice panel ───────────────────────────────────────────
    const DX = W - 220;
    const dpanel = this.add.graphics().setDepth(401);
    dpanel.fillStyle(C.panelBg2, 1);
    dpanel.fillRoundedRect(DX - 6, BAR_Y + 8, 214, BAR_H - 16, 8);
    dpanel.lineStyle(1.5, C.border, 1);
    dpanel.strokeRoundedRect(DX - 6, BAR_Y + 8, 214, BAR_H - 16, 8);
    dpanel.lineStyle(1, C.gold, 0.35);
    dpanel.strokeRoundedRect(DX - 4, BAR_Y + 10, 210, BAR_H - 20, 6);

    this.add.text(DX + 40, BAR_Y + 14, "DICE", {
      fontSize: "11px", fontFamily: "Impact", color: "#7aaa40", letterSpacing: 2
    }).setDepth(402);

    this.diceResultText = this.add.text(DX + 40, BAR_Y + 58, "?", {
      fontSize: "46px", fontFamily: "Impact",
      color: "#d4a020", stroke: "#0a1e08", strokeThickness: 3
    }).setOrigin(0.5).setDepth(402);

    this.logText = this.add.text(DX + 148, BAR_Y + 34, "", {
      fontSize: "11px", fontFamily: "Arial",
      color: "#a8d888", wordWrap: { width: 100 }, align: "center"
    }).setOrigin(0.5, 0).setDepth(402);
  }

  _buildDiceButton() {
    const W = 900, BAR_Y = 760 - 112;
    this._btnX = W - 212;
    this._btnY = BAR_Y + 72;

    this.diceBtn = this.add.graphics().setDepth(402);
    this._drawBtn(false);
    this.diceBtn.setInteractive(
      new Phaser.Geom.Rectangle(this._btnX, this._btnY, 178, 34),
      Phaser.Geom.Rectangle.Contains
    );

    this.diceBtnLabel = this.add.text(
      this._btnX + 89, this._btnY + 17,
      "주사위 굴리기!",
      { fontSize: "15px", fontFamily: "Impact", color: "#f0e8c8", stroke: "#0a1e08", strokeThickness: 2 }
    ).setOrigin(0.5).setDepth(403);

    this.diceBtn.on("pointerover",  () => { if (!this.gameManager.isAnimating) this._drawBtn(true);  });
    this.diceBtn.on("pointerout",   () => this._drawBtn(false));
    this.diceBtn.on("pointerdown",  () => { if (!this.gameManager.isAnimating) this._rollDice(); });
  }

  _drawBtn(hover) {
    this.diceBtn.clear();
    this.diceBtn.fillStyle(hover ? C.greenHover : C.green, 1);
    this.diceBtn.fillRoundedRect(this._btnX, this._btnY, 178, 34, 7);
    this.diceBtn.lineStyle(1.5, hover ? 0x7aee40 : C.border, 1);
    this.diceBtn.strokeRoundedRect(this._btnX, this._btnY, 178, 34, 7);
  }

  // ─────────────────────────────────────────────────────────────
  //  Dice roll
  // ─────────────────────────────────────────────────────────────
  _rollDice() {
    this.gameManager.isAnimating = true;
    this._drawBtn(false);
    this.diceBtnLabel.setText("굴리는 중...");
    this.diceBtn.disableInteractive();
    this.stepText.setText("");

    let count = 0;
    this.time.addEvent({
      delay: 60, repeat: 14,
      callback: () => {
        this.diceResultText.setText(`${Phaser.Math.Between(1, 6)}`);
        count++;
        if (count >= 15) {
          const result = this.diceManager.roll();
          this.diceResultText.setText(`${result}`);
          this.tweens.add({
            targets: this.diceResultText,
            scaleX: 1.45, scaleY: 1.45,
            duration: 140, yoyo: true, ease: "Back.easeOut"
          });
          this.stepText.setText(`이동: ${result}칸`);

          this.time.delayedCall(280, () => {
            this.playerManager.movePlayer(
              0, result,
              (opts, fromId, cb) => this._showBranchUI(opts, fromId, cb),
              (isWin)            => this._onMoveDone(isWin)
            );
          });
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Branch choice UI  (rules 5 & 6)
  // ─────────────────────────────────────────────────────────────
  _showBranchUI(options, fromNodeId, onSelect) {
    const W = 900;
    const objs = [];
    const cleanup = () => { objs.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); };

    // ── Compact floating panel (top-center, does not cover the map much) ──
    const PW = 370, PH = 88, PX = (W - PW) / 2, PY = 58;

    const panel = this.add.graphics().setDepth(501);
    panel.fillStyle(C.panelBg, 0.92);
    panel.fillRoundedRect(PX, PY, PW, PH, 10);
    panel.lineStyle(2, C.border, 1);
    panel.strokeRoundedRect(PX, PY, PW, PH, 10);
    objs.push(panel);

    objs.push(this.add.text(W / 2, PY + 16, "경로 선택", {
      fontSize: "14px", fontFamily: "Impact", color: "#d4a020", letterSpacing: 2
    }).setOrigin(0.5).setDepth(502));

    // Destination highlights on the map
    const fromNode = this.boardManager.getNodeById(fromNodeId);
    const btnColors  = [C.blue,     C.red];
    const btnHovers  = [C.blueHover, C.redHover];
    const ringColors = [0x3b9fe8,   0xe84040];

    options.forEach((nodeId, i) => {
      const node = this.boardManager.getNodeById(nodeId);
      if (!node) return;

      const ring = this.add.graphics().setDepth(200);
      ring.lineStyle(3, ringColors[i], 1);
      ring.strokeCircle(node.x, node.y, 22);
      objs.push(ring);
      this.tweens.add({ targets: ring, alpha: 0.2, duration: 380, yoyo: true, repeat: -1 });

      const badge = this.add.text(node.x, node.y - 28, `${i + 1}`, {
        fontSize: "13px", fontFamily: "Impact",
        color: i === 0 ? "#3b9fe8" : "#e84040",
        stroke: "#000000", strokeThickness: 3
      }).setOrigin(0.5).setDepth(201);
      objs.push(badge);
    });

    // Compact choice buttons inside the panel
    const BTN_W = 148, BTN_H = 36, BTN_Y = PY + 40;

    options.forEach((nodeId, i) => {
      const BX = PX + 16 + i * (BTN_W + 26);
      const node = this.boardManager.getNodeById(nodeId);
      const dir  = fromNode && node ? this._dirLabel(fromNode, node) : "";

      const btn = this.add.graphics().setDepth(502);
      const draw = (h) => {
        btn.clear();
        btn.fillStyle(h ? btnHovers[i] : btnColors[i], 1);
        btn.fillRoundedRect(BX, BTN_Y, BTN_W, BTN_H, 7);
        btn.lineStyle(1.5, h ? 0xffffff : C.border, h ? 0.5 : 0.7);
        btn.strokeRoundedRect(BX, BTN_Y, BTN_W, BTN_H, 7);
      };
      draw(false);
      btn.setInteractive(new Phaser.Geom.Rectangle(BX, BTN_Y, BTN_W, BTN_H), Phaser.Geom.Rectangle.Contains);
      objs.push(btn);

      objs.push(this.add.text(BX + BTN_W / 2, BTN_Y + BTN_H / 2, `${i + 1}번  ${dir}`, {
        fontSize: "13px", fontFamily: "Impact", color: "#f0e8c8"
      }).setOrigin(0.5).setDepth(503));

      btn.on("pointerover",  () => draw(true));
      btn.on("pointerout",   () => draw(false));
      btn.on("pointerdown",  () => { cleanup(); onSelect(nodeId); });
    });
  }

  // Cardinal direction hint for branch buttons
  _dirLabel(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (a > -45  && a <=  45)  return "→ 오른쪽";
    if (a >  45  && a <= 135)  return "↓ 아래쪽";
    if (a > 135  || a <= -135) return "← 왼쪽";
    return "↑ 위쪽";
  }

  // ─────────────────────────────────────────────────────────────
  //  After movement completes
  // ─────────────────────────────────────────────────────────────
  _onMoveDone(isWin) {
    const player = this.gameManager.players[0];
    this.nodeText.setText(`위치: ${player.currentNodeId}`);

    if (isWin) { this._showWinScreen(); return; }

    const isTeleport = (player.currentNodeId === "node38" || player.currentNodeId === "node40");
    this.logText.setText(isTeleport ? "✦ 워프 발동!" : `도착: ${player.currentNodeId}`);
    this.stepText.setText("");

    this.time.delayedCall(700, () => {
      this.gameManager.isAnimating = false;
      this.diceBtnLabel.setText("주사위 굴리기!");
      this.diceBtn.setInteractive(
        new Phaser.Geom.Rectangle(this._btnX, this._btnY, 178, 34),
        Phaser.Geom.Rectangle.Contains
      );
      this._drawBtn(false);
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Win screen
  // ─────────────────────────────────────────────────────────────
  _showWinScreen() {
    const W = 900, H = 760;

    // Dark overlay
    this.add.graphics().setDepth(800)
      .fillStyle(0x000000, 0.75)
      .fillRect(0, 0, W, H);

    // Trophy panel
    const PW = 480, PH = 280, PX = (W - PW) / 2, PY = (H - PH) / 2;
    const panel = this.add.graphics().setDepth(801);
    panel.fillStyle(C.panelBg, 1);
    panel.fillRoundedRect(PX, PY, PW, PH, 16);
    panel.lineStyle(3, C.gold, 1);
    panel.strokeRoundedRect(PX, PY, PW, PH, 16);
    panel.lineStyle(1, C.border, 0.5);
    panel.strokeRoundedRect(PX + 4, PY + 4, PW - 8, PH - 8, 12);

    // Decorative corner dots
    [PX + 18, PX + PW - 18].forEach(cx => {
      [PY + 18, PY + PH - 18].forEach(cy => {
        panel.fillStyle(C.gold, 0.6);
        panel.fillCircle(cx, cy, 4);
      });
    });

    this.add.text(W / 2, PY + 52, "GOAL!", {
      fontSize: "68px", fontFamily: "Impact",
      color: "#d4a020", stroke: "#0a1e08", strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: "#000000", blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(802);

    this.add.text(W / 2, PY + 128, "목적지에 도착했습니다!", {
      fontSize: "24px", fontFamily: "Arial Black",
      color: "#f0e8c8", stroke: "#0a1e08", strokeThickness: 3
    }).setOrigin(0.5).setDepth(802);

    // Character on win screen
    const charSprite = this.add.sprite(W / 2 - 140, PY + 110, "player_idle", 0)
      .setScale(0.6).setDepth(803);

    // Restart button
    const BW = 200, BH = 48, BX = W / 2 - 100, BY = PY + 206;
    const btn = this.add.graphics().setDepth(802);
    const drawRestart = (h) => {
      btn.clear();
      btn.fillStyle(h ? C.greenHover : C.green, 1);
      btn.fillRoundedRect(BX, BY, BW, BH, 9);
      btn.lineStyle(1.5, h ? 0x7aee40 : C.border, 1);
      btn.strokeRoundedRect(BX, BY, BW, BH, 9);
    };
    drawRestart(false);
    btn.setInteractive(new Phaser.Geom.Rectangle(BX, BY, BW, BH), Phaser.Geom.Rectangle.Contains);

    this.add.text(W / 2, BY + BH / 2, "다시 시작", {
      fontSize: "20px", fontFamily: "Impact", color: "#f0e8c8"
    }).setOrigin(0.5).setDepth(803);

    btn.on("pointerover",  () => drawRestart(true));
    btn.on("pointerout",   () => drawRestart(false));
    btn.on("pointerdown",  () => this.scene.restart());

    // Bounce animation on the panel
    this.tweens.add({
      targets: [panel],
      scaleX: 1.015, scaleY: 1.015,
      duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
    });
  }
}
