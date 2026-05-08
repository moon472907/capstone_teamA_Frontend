import Phaser from 'phaser';
export default class MiniGameScene extends Phaser.Scene {
  constructor() {
    super({ key: "MiniGameScene" });
  }

  init(data) {
    this.playerCount = data.playerCount || 2;
    this.onComplete = data.onComplete;
    this.timeLeft = 10;
    this.playerScores = new Array(this.playerCount).fill(0);
  }

  create() {
    const { width, height } = this.scale;

    // 반투명 배경
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0x0f3460, 1);
    panel.fillRoundedRect(width / 2 - 330, 60, 660, 480, 20);

    this.add.text(width / 2, 100, "MINI GAME", {
      fontSize: "42px",
      fontFamily: "Impact",
      color: "#f7c948",
      stroke: "#c0392b",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 145, "Click your button as fast as possible!", {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#a8dadc"
    }).setOrigin(0.5);

    // 타이머
    this.timerText = this.add.text(width / 2, 185, `Time: ${this.timeLeft}`, {
      fontSize: "24px",
      fontFamily: "Impact",
      color: "#e74c3c"
    }).setOrigin(0.5);

    // 각 플레이어 버튼 + 카운터
    const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12];
    const labelColors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];
    const keys = ["Q", "P", "Z", "M"];
    const names = ["P1", "P2", "P3", "P4"];

    this.scoreTexts = [];

    const totalW = this.playerCount * 150 + (this.playerCount - 1) * 10;
    const startX = width / 2 - totalW / 2 + 75;

    for (let i = 0; i < this.playerCount; i++) {
      const bx = startX + i * 160;
      const by = 340;

      // 배경 박스
      const bg = this.add.graphics();
      bg.fillStyle(colors[i], 0.15);
      bg.fillRoundedRect(bx - 65, 220, 130, 260, 12);

      // 이름
      this.add.text(bx, 250, names[i], {
        fontSize: "20px",
        fontFamily: "Impact",
        color: labelColors[i]
      }).setOrigin(0.5);

      // 점수
      const scoreText = this.add.text(bx, 285, "0", {
        fontSize: "40px",
        fontFamily: "Impact",
        color: "#ffffff"
      }).setOrigin(0.5);
      this.scoreTexts.push(scoreText);

      // 버튼
      const btn = this.add.text(bx, by, `[ ${keys[i]} ]`, {
        fontSize: "28px",
        fontFamily: "Impact",
        color: "#ffffff",
        backgroundColor: `#${colors[i].toString(16).padStart(6, "0")}`,
        padding: { x: 16, y: 12 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const playerIdx = i;
      btn.on("pointerdown", () => this.addScore(playerIdx));

      // 키보드 입력
      const keyCode = keys[i].charCodeAt(0);
      this.input.keyboard.on("keydown-" + keys[i], () => this.addScore(playerIdx));

      // 키 힌트
      this.add.text(bx, by + 55, `Key: ${keys[i]}`, {
        fontSize: "13px",
        fontFamily: "Arial",
        color: "#7f8c8d"
      }).setOrigin(0.5);
    }

    // 타이머 시작
    this.timer = this.time.addEvent({
      delay: 1000,
      repeat: this.timeLeft - 1,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`Time: ${this.timeLeft}`);
        if (this.timeLeft <= 3) {
          this.timerText.setStyle({ color: "#e74c3c" });
          this.cameras.main.shake(200, 0.005);
        }
        if (this.timeLeft <= 0) {
          this.endMiniGame();
        }
      }
    });
  }

  addScore(playerIndex) {
    if (this.timeLeft <= 0) return;
    this.playerScores[playerIndex]++;
    this.scoreTexts[playerIndex].setText(`${this.playerScores[playerIndex]}`);

    // 탭 피드백
    this.tweens.add({
      targets: this.scoreTexts[playerIndex],
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 80,
      yoyo: true
    });
  }

  endMiniGame() {
    const { width, height } = this.scale;

    // 결과 계산 (1등 15코인, 2등 10코인, 나머지 5코인)
    const sorted = [...this.playerScores]
      .map((s, i) => ({ score: s, index: i }))
      .sort((a, b) => b.score - a.score);

    const rewards = new Array(this.playerCount).fill(5);
    if (sorted[0]) rewards[sorted[0].index] = 15;
    if (sorted[1]) rewards[sorted[1].index] = 10;

    // 결과 표시
    const resultBg = this.add.graphics();
    resultBg.fillStyle(0x000000, 0.8);
    resultBg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 200, "RESULTS!", {
      fontSize: "56px",
      fontFamily: "Impact",
      color: "#f7c948",
      stroke: "#c0392b",
      strokeThickness: 8
    }).setOrigin(0.5);

    const rewardLabels = ["1st: +15", "2nd: +10", "3rd: +5", "4th: +5"];
    sorted.forEach((item, rank) => {
      const names = ["P1", "P2", "P3", "P4"];
      this.add.text(width / 2, 290 + rank * 42,
        `${rewardLabels[rank]} -- ${names[item.index]} (${item.score} clicks)`,
        {
          fontSize: "20px",
          fontFamily: "Arial Black",
          color: "#ecf0f1"
        }
      ).setOrigin(0.5);
    });

    if (this.onComplete) this.onComplete(rewards);

    // 닫기 버튼
    const closeBtn = this.add.text(width / 2, 500, "[ Continue ]", {
      fontSize: "30px",
      fontFamily: "Impact",
      color: "#ffffff",
      backgroundColor: "#27ae60",
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on("pointerdown", () => {
      this.scene.stop();
    });
  }
}
