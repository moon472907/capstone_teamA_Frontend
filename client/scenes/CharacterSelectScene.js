// Character data ported from React src/App.jsx (CHARACTERS array)
const CHARACTERS = [
  { id: "gomduri",  name: "곰두리",  icon: "🐻‍❄️", desc: "강원대 대표 마스코트" },
  { id: "narae",    name: "나래",    icon: "🕊️",  desc: "하늘을 나는 비둘기"  },
  { id: "daramji",  name: "다람쥐",  icon: "🐿️",  desc: "캠퍼스 다람쥐"       },
  { id: "bunny",    name: "토끼",    icon: "🐰",  desc: "춘천 옥토끼"         },
  { id: "fox",      name: "여우",    icon: "🦊",  desc: "영리한 산여우"       },
  { id: "cat",      name: "고양이",  icon: "🐱",  desc: "캠퍼스 길고양이"     },
];

class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelectScene" });
  }

  init(data) {
    this.selectedIdx = (data && data.preSelected !== undefined) ? data.preSelected : 0;
  }

  create() {
    const W = 900, H = 760;

    // ── Background ────────────────────────────────────────────
    this.add.image(W / 2, H / 2, "bg");
    for (let i = 0; i < 35; i++) {
      const d = this.add.graphics();
      d.fillStyle(0x4aaa28, Phaser.Math.FloatBetween(0.04, 0.14));
      d.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.Between(2, 5));
      this.tweens.add({ targets: d, alpha: 0.02, duration: Phaser.Math.Between(1200, 3200), yoyo: true, repeat: -1 });
    }
    const frame = this.add.graphics();
    frame.lineStyle(2, 0xd4a020, 0.45);
    frame.strokeRect(20, 20, W - 40, H - 40);

    // ── Title ─────────────────────────────────────────────────
    const tp = this.add.graphics();
    tp.fillStyle(0x0d1f08, 0.9);
    tp.fillRoundedRect(W / 2 - 210, 28, 420, 64, 10);
    tp.lineStyle(2, 0x5aaa28, 0.9);
    tp.strokeRoundedRect(W / 2 - 210, 28, 420, 64, 10);

    this.add.text(W / 2, 54, "캐릭터 선택", {
      fontSize: "30px", fontFamily: "Impact", color: "#d4a020", stroke: "#0a1e08", strokeThickness: 4
    }).setOrigin(0.5);
    this.add.text(W / 2, 78, "함께 캠퍼스를 탐험할 캐릭터를 선택하세요", {
      fontSize: "12px", fontFamily: "Arial", color: "#8ac870"
    }).setOrigin(0.5);

    // ── Cards (3 × 2 grid) ────────────────────────────────────
    const CW = 242, CH = 116, GAP_X = 16, GAP_Y = 14, COLS = 3;
    const totalW = COLS * CW + (COLS - 1) * GAP_X;
    const SX = (W - totalW) / 2, SY = 108;

    // Store per-card refs for live update on selection change
    this._cards = CHARACTERS.map((char, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = SX + col * (CW + GAP_X);
      const cy = SY + row * (CH + GAP_Y);
      return this._createCard(char, i, cx, cy, CW, CH);
    });

    // ── Preview panel ─────────────────────────────────────────
    const PY = SY + 2 * (CH + GAP_Y) + 12;
    const pp = this.add.graphics();
    pp.fillStyle(0x0d1f08, 0.9);
    pp.fillRoundedRect(W / 2 - 200, PY, 400, 70, 10);
    pp.lineStyle(2, 0x5aaa28, 0.85);
    pp.strokeRoundedRect(W / 2 - 200, PY, 400, 70, 10);

    this._prevIcon = this.add.text(W / 2 - 158, PY + 35, "", { fontSize: "34px" }).setOrigin(0.5);
    this._prevName = this.add.text(W / 2 - 108, PY + 20, "", { fontSize: "19px", fontFamily: "Impact", color: "#d4a020" }).setOrigin(0, 0.5);
    this._prevDesc = this.add.text(W / 2 - 108, PY + 46, "", { fontSize: "12px", fontFamily: "Arial", color: "#a8d888" }).setOrigin(0, 0.5);
    this._refreshPreview();

    // ── Start button ──────────────────────────────────────────
    const BW = 258, BH = 52, BX = W / 2 - 129, BY = PY + 84;
    const startBtn = this.add.graphics();
    const drawStart = (h) => {
      startBtn.clear();
      startBtn.fillStyle(h ? 0x3aaa18 : 0x2a7a10, 1);
      startBtn.fillRoundedRect(BX, BY, BW, BH, 10);
      startBtn.lineStyle(2, h ? 0x7aee40 : 0x5aaa28, 1);
      startBtn.strokeRoundedRect(BX, BY, BW, BH, 10);
    };
    drawStart(false);
    startBtn.setInteractive(new Phaser.Geom.Rectangle(BX, BY, BW, BH), Phaser.Geom.Rectangle.Contains);

    const startLabel = this.add.text(W / 2, BY + BH / 2, "▶  게임 시작", {
      fontSize: "23px", fontFamily: "Impact", color: "#f0e8c8", stroke: "#0a1e08", strokeThickness: 3
    }).setOrigin(0.5);

    startBtn.on("pointerover",  () => { drawStart(true);  startLabel.setStyle({ color: "#d4a020" }); });
    startBtn.on("pointerout",   () => { drawStart(false); startLabel.setStyle({ color: "#f0e8c8" }); });
    startBtn.on("pointerdown",  () => {
      this.tweens.add({
        targets: [startBtn, startLabel], scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true,
        onComplete: () => this.scene.start("BoardScene", { character: CHARACTERS[this.selectedIdx] })
      });
    });

    // ── Back button ───────────────────────────────────────────
    const back = this.add.text(38, 52, "← 뒤로", {
      fontSize: "14px", fontFamily: "Impact", color: "#7aaa40", stroke: "#0a1e08", strokeThickness: 2
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on("pointerover",  () => back.setStyle({ color: "#d4a020" }));
    back.on("pointerout",   () => back.setStyle({ color: "#7aaa40" }));
    back.on("pointerdown",  () => this.scene.start("MenuScene"));
  }

  _createCard(char, idx, cx, cy, CW, CH) {
    const isSelected = idx === this.selectedIdx;

    // Card background (redrawn on selection change)
    const bg = this.add.graphics();
    this._drawCardBg(bg, cx, cy, CW, CH, isSelected);
    bg.setInteractive(new Phaser.Geom.Rectangle(cx, cy, CW, CH), Phaser.Geom.Rectangle.Contains);
    bg.on("pointerover",  () => { if (idx !== this.selectedIdx) { this._drawCardBg(bg, cx, cy, CW, CH, false, true); } });
    bg.on("pointerout",   () => { if (idx !== this.selectedIdx) { this._drawCardBg(bg, cx, cy, CW, CH, false, false); } });
    bg.on("pointerdown",  () => this._selectChar(idx));

    // Icon
    const icon = this.add.text(cx + 46, cy + CH / 2, char.icon, { fontSize: "36px" }).setOrigin(0.5);
    icon.setInteractive();
    icon.on("pointerdown", () => this._selectChar(idx));

    // Name
    const nameTxt = this.add.text(cx + 84, cy + 26, char.name, {
      fontSize: "17px", fontFamily: "Impact", color: isSelected ? "#d4a020" : "#f0e8c8"
    });

    // Desc
    this.add.text(cx + 84, cy + 50, char.desc, {
      fontSize: "11px", fontFamily: "Arial", color: "#8ac870"
    });

    // Selection checkmark (shown only when selected)
    const check = this.add.text(cx + CW - 14, cy + 14, "✓", {
      fontSize: "13px", fontFamily: "Impact", color: "#d4a020"
    }).setOrigin(0.5).setAlpha(isSelected ? 1 : 0);

    return { bg, nameTxt, check, cx, cy, CW, CH, idx };
  }

  _drawCardBg(g, cx, cy, CW, CH, selected, hover = false) {
    g.clear();
    if (selected) {
      g.fillStyle(0x1a3a10, 1);
      g.fillRoundedRect(cx, cy, CW, CH, 10);
      g.lineStyle(2.5, 0xd4a020, 1);
      g.strokeRoundedRect(cx, cy, CW, CH, 10);
      g.lineStyle(1, 0xd4a020, 0.35);
      g.strokeRoundedRect(cx + 3, cy + 3, CW - 6, CH - 6, 7);
    } else if (hover) {
      g.fillStyle(0x152a10, 1);
      g.fillRoundedRect(cx, cy, CW, CH, 10);
      g.lineStyle(1.5, 0x7aaa40, 1);
      g.strokeRoundedRect(cx, cy, CW, CH, 10);
    } else {
      g.fillStyle(0x0d1f08, 0.88);
      g.fillRoundedRect(cx, cy, CW, CH, 10);
      g.lineStyle(1.5, 0x3a7a20, 1);
      g.strokeRoundedRect(cx, cy, CW, CH, 10);
    }
  }

  _selectChar(idx) {
    if (idx === this.selectedIdx) return;
    const prev = this.selectedIdx;
    this.selectedIdx = idx;

    // Update previous card (deselect)
    const prevCard = this._cards[prev];
    this._drawCardBg(prevCard.bg, prevCard.cx, prevCard.cy, prevCard.CW, prevCard.CH, false);
    prevCard.nameTxt.setStyle({ color: "#f0e8c8" });
    prevCard.check.setAlpha(0);

    // Update new card (select)
    const newCard = this._cards[idx];
    this._drawCardBg(newCard.bg, newCard.cx, newCard.cy, newCard.CW, newCard.CH, true);
    newCard.nameTxt.setStyle({ color: "#d4a020" });
    newCard.check.setAlpha(1);

    this._refreshPreview();
  }

  _refreshPreview() {
    const char = CHARACTERS[this.selectedIdx];
    this._prevIcon.setText(char.icon);
    this._prevName.setText(char.name);
    this._prevDesc.setText(char.desc);
  }
}
