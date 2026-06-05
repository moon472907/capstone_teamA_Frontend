import { CHARACTER_MANIFEST, assetKeyFor } from '../../data/characters';

// 보드 위 말이 어느 캐릭터든 일정한 높이로 보이도록 하는 목표 표시 높이(px)
const TARGET_DISPLAY_H = 74;

// 같은 타일에 여러 말이 겹치지 않도록 플레이어별 픽셀 오프셋
const OFFSETS = [
  { x: -16, y: -6 },
  { x: 16, y: -6 },
  { x: -16, y: 10 },
  { x: 16, y: 10 },
];

const COLORS = ['#85CDEE', '#FF8C00', '#005BAC', '#48BB78'];

const DEFAULT_ASSET = Object.keys(CHARACTER_MANIFEST)[0];

export default class PlayerManager {
  constructor(scene, boardManager) {
    this.scene = scene;
    this.boardManager = boardManager;
    this.pawns = {}; // playerId -> { sprite, shadow, label, nodeName, offset, assetKey, idleScale, runScale }
  }

  // assetKey 별 idle/run 애니메이션을 1회 생성하고 idle/run 스케일을 반환
  _ensureAnims(assetKey) {
    const c = CHARACTER_MANIFEST[assetKey] || CHARACTER_MANIFEST[DEFAULT_ASSET];
    const idleKey = `${assetKey}_idle`;
    const runKey = `${assetKey}_run`;
    if (!this.scene.anims.exists(idleKey)) {
      this.scene.anims.create({
        key: idleKey,
        frames: this.scene.anims.generateFrameNumbers(idleKey, { start: 0, end: c.idle.frames - 1 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.scene.anims.exists(runKey)) {
      this.scene.anims.create({
        key: runKey,
        frames: this.scene.anims.generateFrameNumbers(runKey, { start: 0, end: c.run.frames - 1 }),
        frameRate: 12,
        repeat: -1,
      });
    }
    return {
      idleScale: TARGET_DISPLAY_H / c.idle.frameHeight,
      runScale: TARGET_DISPLAY_H / c.run.frameHeight,
    };
  }

  createPlayer(playerId, nodeName, name, index, characterKey) {
    const node = this.boardManager.getNodeById(nodeName);
    if (!node) {
      console.warn('createPlayer: 노드 없음', nodeName);
      return;
    }
    const assetKey = CHARACTER_MANIFEST[characterKey] ? characterKey : assetKeyFor(characterKey);
    const { idleScale, runScale } = this._ensureAnims(assetKey);

    const off = OFFSETS[index % OFFSETS.length];
    const x = node.x + off.x;
    const y = node.y + off.y;

    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillEllipse(0, 0, 34, 11);
    shadow.setPosition(x, y + 8).setDepth(194);

    const sprite = this.scene.add.sprite(x, y, `${assetKey}_idle`)
      .setScale(idleScale)
      .setOrigin(0.5, 0.92)
      .setDepth(196);
    sprite.play(`${assetKey}_idle`);

    const label = this.scene.add.text(x, y - 46, name, {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: COLORS[index % COLORS.length],
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(197);

    this.pawns[playerId] = { sprite, shadow, label, nodeName, offset: off, assetKey, idleScale, runScale };
  }

  // 캐릭터별 idle/run 프레임 높이가 달라 전환 시 크기 점프가 없도록 스케일도 함께 바꾼다
  _playIdle(pawn) {
    pawn.sprite.setScale(pawn.idleScale).play(`${pawn.assetKey}_idle`);
  }

  _playRun(pawn) {
    pawn.sprite.setScale(pawn.runScale).play(`${pawn.assetKey}_run`);
  }

  placePlayer(playerId, nodeName) {
    const pawn = this.pawns[playerId];
    const node = this.boardManager.getNodeById(nodeName);
    if (!pawn || !node) return;
    const x = node.x + pawn.offset.x;
    const y = node.y + pawn.offset.y;
    pawn.sprite.setPosition(x, y);
    pawn.shadow.setPosition(x, y + 8);
    pawn.label.setPosition(x, y - 46);
    pawn.nodeName = nodeName;
  }

  /** node 이름 배열을 따라 순차 hop 애니메이션. */
  animatePath(playerId, pathNodeNames, onComplete) {
    const pawn = this.pawns[playerId];
    if (!pawn || !pathNodeNames || pathNodeNames.length === 0) {
      onComplete?.();
      return;
    }

    let i = 0;
    const step = () => {
      if (i >= pathNodeNames.length) {
        this._playIdle(pawn);
        onComplete?.();
        return;
      }
      const node = this.boardManager.getNodeById(pathNodeNames[i]);
      i++;
      if (!node) { step(); return; }
      const tx = node.x + pawn.offset.x;
      const ty = node.y + pawn.offset.y;
      this._hop(pawn, tx, ty, () => {
        pawn.nodeName = pathNodeNames[i - 1];
        this.scene.time.delayedCall(70, step);
      });
    };
    step();
  }

  _hop(pawn, tx, ty, onComplete) {
    this._playRun(pawn);
    this.scene.tweens.add({
      targets: pawn.sprite,
      x: tx, y: ty - 26,
      duration: 150,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: pawn.sprite,
          y: ty,
          duration: 120,
          ease: 'Bounce.easeOut',
          onComplete: () => onComplete?.(),
        });
      },
    });
    this.scene.tweens.add({
      targets: pawn.label,
      x: tx, y: ty - 46,
      duration: 270,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: pawn.shadow,
      x: tx, y: ty + 8,
      duration: 270,
      ease: 'Sine.easeInOut',
    });
  }

  // ── Main movement controller ─────────────────────────────────
  movePlayer(playerIndex, steps, onBranchChoice, onFinish) {
    const player = this.gameManager.players[playerIndex];
    let stepsLeft = steps;

    const doMove = (targetId) => {
      const target = this.boardManager.getNodeById(targetId);
      if (!target) { onFinish(false); return; }

      const afterLand = () => {
        player.currentNodeId = targetId;
        stepsLeft--;
        if (target.status === "finish") { onFinish(true); return; }
        this.scene.time.delayedCall(80, moveStep);
      };

      this._animateMove(playerIndex, target.x, target.y, afterLand);
    };

    const moveStep = () => {
      if (stepsLeft <= 0) { onFinish(false); return; }

      const node = this.boardManager.getNodeById(player.currentNodeId);
      if (!node || node.next.length === 0) { onFinish(false); return; }

      if (node.next.length > 1) {
        onBranchChoice(node.next, player.currentNodeId, (chosen) => doMove(chosen));
      } else {
        doMove(node.next[0]);
      }
    };

    moveStep();
  }
}
