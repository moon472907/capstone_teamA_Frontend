import Phaser from 'phaser';
import GameManager from '../logic/GameManager.js';
import BoardManager from '../logic/BoardManager.js';
import DiceManager from '../logic/DiceManager.js';
import PlayerManager from '../logic/PlayerManager.js';
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

export default class BoardScene extends Phaser.Scene {
  constructor() { super({ key: "BoardScene" }); }

  init() { /* demo: 1 player forced in GameManager */ }

  create() {
    this.gameManager   = new GameManager(1);
    this.boardManager  = new BoardManager(this);
    this.diceManager   = new DiceManager(this);
    this.playerManager = new PlayerManager(this, this.gameManager, this.boardManager);

    this.boardManager.createBoard();
    this.playerManager.createPlayers();

    // 주사위 애니메이션용 텍스트 생성 (화면 하단 중앙, React 버튼 위쪽)
    const centerX = this.scale.width / 2;
    const bottomY = this.scale.height - 160;

    this.diceResultText = this.add.text(centerX, bottomY, "", {
      fontSize: "80px", 
      fontFamily: "DungGeunMo",
      color: "#ffca28", // KNU Gold/Yellow
      stroke: "#003d73", // KNU Dark Blue Outline
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: "#000000", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(1000).setVisible(false);
  }

  // ─────────────────────────────────────────────────────────────
  //  React ↔ Phaser Bridge Methods
  // ─────────────────────────────────────────────────────────────

  // React에서 주사위 굴리기 버튼을 누르면 호출됨
  startDiceRoll(result) {
    if (this.gameManager.isAnimating) return;
    this.gameManager.isAnimating = true;

    const diceValue = result || this.diceManager.roll();
    
    // 주사위 롤링 애니메이션 시작
    this.diceResultText.setVisible(true).setScale(1).setText("?");
    
    let count = 0;
    this.time.addEvent({
      delay: 60,
      repeat: 14,
      callback: () => {
        count++;
        // 랜덤 숫자 표시 (롤링 효과)
        this.diceResultText.setText(`${Phaser.Math.Between(1, 6)}`);
        
        if (count >= 15) {
          // 최종 결과 표시
          this.diceResultText.setText(`${diceValue}`);
          
          // 결과 강조 연출 (스케일 트윈)
          this.tweens.add({
            targets: this.diceResultText,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 150,
            yoyo: true,
            ease: "Back.easeOut",
            onComplete: () => {
              // 약간의 대기 후 이동 시작
              this.time.delayedCall(600, () => {
                this.diceResultText.setVisible(false);
                this.playerManager.movePlayer(
                  0, 
                  diceValue,
                  (opts, fromId, cb) => {
                    this._pendingBranchCallback = cb;
                    this.game.events.emit('requireBranchChoice', opts, fromId);
                  },
                  (isWin) => this._onMoveDone(isWin)
                );
              });
            }
          });
        }
      }
    });

    return diceValue;
  }

  // React에서 갈림길을 선택하면 호출됨
  selectBranch(nodeId) {
    if (this._pendingBranchCallback) {
      const cb = this._pendingBranchCallback;
      this._pendingBranchCallback = null;
      cb(nodeId);
    }
  }

  _onMoveDone(isWin) {
    const player = this.gameManager.players[0];
    this.gameManager.isAnimating = false;
    
    // 이동 완료 이벤트를 React로 전송
    this.game.events.emit('moveDone', {
      isWin: isWin,
      nodeId: player.currentNodeId
    });
  }
}
