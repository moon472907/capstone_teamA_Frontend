import Phaser from 'phaser';
import BoardManager from '../logic/BoardManager.js';
import PlayerManager from '../logic/PlayerManager.js';

/**
 * 서버 주도 보드 렌더러. 게임 로직(주사위/이동/턴)은 백엔드가 담당하고,
 * 이 씬은 React에서 전달하는 명령(initPlayers/showDice/movePlayer)을
 * 애니메이션으로만 표현한다.
 */
export default class BoardScene extends Phaser.Scene {
  constructor() { super({ key: 'BoardScene' }); }

  create() {
    this.boardManager = new BoardManager(this);
    this.boardManager.createBoard();
    this.playerManager = new PlayerManager(this, this.boardManager);

    const centerX = this.scale.width / 2;
    const bottomY = this.scale.height - 160;
    this.diceResultText = this.add.text(centerX, bottomY, '', {
      fontSize: '80px',
      fontFamily: 'DungGeunMo',
      color: '#ffca28',
      stroke: '#003d73',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, fill: true },
    }).setOrigin(0.5).setDepth(1000).setVisible(false);

    // React에 씬 준비 완료 통지
    this.game.events.emit('boardReady');
  }

  // ── React → Phaser bridge ──────────────────────────────

  // players: [{ playerId, nodeName, nickname }]
  initPlayers(players) {
    players.forEach((p, i) => {
      this.playerManager.createPlayer(p.playerId, p.nodeName, p.nickname, i);
    });
  }

  // 주사위 숫자 롤링 연출 후 콜백
  showDice(value, onComplete) {
    this.diceResultText.setVisible(true).setScale(1).setText('?');
    let count = 0;
    this.time.addEvent({
      delay: 60,
      repeat: 14,
      callback: () => {
        count++;
        this.diceResultText.setText(`${Phaser.Math.Between(1, 6)}`);
        if (count >= 15) {
          this.diceResultText.setText(`${value}`);
          this.tweens.add({
            targets: this.diceResultText,
            scaleX: 1.5, scaleY: 1.5,
            duration: 150, yoyo: true, ease: 'Back.easeOut',
            onComplete: () => {
              this.time.delayedCall(400, () => {
                this.diceResultText.setVisible(false);
                onComplete?.();
              });
            },
          });
        }
      },
    });
  }

  // pathNodeNames: 도착까지 거쳐가는 노드 이름 배열(시작 제외)
  movePlayer(playerId, pathNodeNames, onComplete) {
    this.playerManager.animatePath(playerId, pathNodeNames, onComplete);
  }

  placePlayer(playerId, nodeName) {
    this.playerManager.placePlayer(playerId, nodeName);
  }
}
