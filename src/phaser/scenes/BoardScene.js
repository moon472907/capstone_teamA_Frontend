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
  }

  // ─────────────────────────────────────────────────────────────
  //  React ↔ Phaser Bridge Methods
  // ─────────────────────────────────────────────────────────────

  // React에서 주사위 굴리기 버튼을 누르면 호출됨
  startDiceRoll(result) {
    if (this.gameManager.isAnimating) return;
    this.gameManager.isAnimating = true;

    // React로부터 주사위 결과값을 받거나 여기서 직접 굴림
    const diceValue = result || this.diceManager.roll();

    // 약간의 딜레이 후 이동 시작 (React UI 애니메이션 시간 확보)
    this.time.delayedCall(500, () => {
      this.playerManager.movePlayer(
        0, // currentPlayerId
        diceValue,
        (opts, fromId, cb) => {
          // 갈림길 선택이 필요할 때 React로 이벤트 발생
          this._pendingBranchCallback = cb;
          this.game.events.emit('requireBranchChoice', opts, fromId);
        },
        (isWin) => this._onMoveDone(isWin)
      );
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
