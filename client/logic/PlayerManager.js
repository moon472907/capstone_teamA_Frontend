const SPRITE_SCALE = 0.45; // 112×96 → ~50×43 px on screen

class PlayerManager {
  constructor(scene, gameManager, boardManager) {
    this.scene = scene;
    this.gameManager = gameManager;
    this.boardManager = boardManager;
    this.playerSprites = [];
  }

  createPlayers() {
    // Register animations (guard against duplicate registration on scene restart)
    if (!this.scene.anims.exists("player_idle")) {
      this.scene.anims.create({
        key: "player_idle",
        frames: this.scene.anims.generateFrameNumbers("player_idle", { start: 0, end: 8 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.scene.anims.exists("player_run")) {
      this.scene.anims.create({
        key: "player_run",
        frames: this.scene.anims.generateFrameNumbers("player_run", { start: 0, end: 8 }),
        frameRate: 12,
        repeat: -1
      });
    }

    const startNode = this.boardManager.getNodeById("node1");
    if (!startNode) return;

    const sx = startNode.x, sy = startNode.y;

    // Shadow ellipse beneath the character
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillEllipse(0, 0, 38, 12);
    shadow.setPosition(sx, sy + 8).setDepth(194);

    // Character sprite
    // Origin (0.5, 0.85): character's feet area sits at the node position
    const sprite = this.scene.add.sprite(sx, sy, "player_idle")
      .setScale(SPRITE_SCALE)
      .setOrigin(0.5, 0.85)
      .setDepth(196);
    sprite.play("player_idle");

    this.playerSprites.push({ sprite, shadow });
  }

  // ── Normal hop movement ──────────────────────────────────────
  _animateMove(si, tx, ty, onComplete) {
    const s = this.playerSprites[si];
    s.sprite.play("player_run");

    // Arc jump to target
    this.scene.tweens.add({
      targets: s.sprite,
      x: tx, y: ty - 28,
      duration: 160,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: s.sprite,
          y: ty,
          duration: 130,
          ease: "Bounce.easeOut",
          onComplete: () => {
            s.sprite.play("player_idle");
            if (onComplete) onComplete();
          }
        });
      }
    });

    // Shadow follows smoothly
    this.scene.tweens.add({
      targets: s.shadow,
      x: tx, y: ty + 8,
      duration: 290,
      ease: "Sine.easeInOut"
    });
  }

  // ── Teleport: shrink-rise → snap → fall-grow  (rules 7 & 8) ─
  _animateTeleport(si, tx, ty, onComplete) {
    const s = this.playerSprites[si];
    s.sprite.play("player_run");

    // Phase 1 — rise, shrink, fade out
    this.scene.tweens.add({
      targets: s.sprite,
      y: s.sprite.y - 110,
      scaleX: 0, scaleY: 0,
      alpha: 0,
      duration: 520,
      ease: "Sine.easeIn",
      onComplete: () => {
        // Snap to above destination (invisible)
        s.sprite.setPosition(tx, ty - 90).setScale(0).setAlpha(0);
        s.shadow.setPosition(tx, ty + 8).setAlpha(0);

        // Phase 2 — fall, grow, fade in
        this.scene.tweens.add({
          targets: s.sprite,
          y: ty,
          scaleX: SPRITE_SCALE,
          scaleY: SPRITE_SCALE,
          alpha: 1,
          duration: 640,
          ease: "Bounce.easeOut",
          onComplete: () => {
            s.sprite.play("player_idle");
            if (onComplete) onComplete();
          }
        });
        this.scene.tweens.add({
          targets: s.shadow,
          alpha: 1,
          duration: 400
        });
      }
    });

    // Shadow fades out independently
    this.scene.tweens.add({
      targets: s.shadow,
      alpha: 0,
      duration: 320
    });
  }

  // ── Main movement controller ─────────────────────────────────
  movePlayer(playerIndex, steps, onBranchChoice, onFinish) {
    const player = this.gameManager.players[playerIndex];
    let stepsLeft = steps;

    const doMove = (targetId, useTeleport) => {
      const target = this.boardManager.getNodeById(targetId);
      if (!target) { onFinish(false); return; }

      const afterLand = () => {
        player.currentNodeId = targetId;
        stepsLeft--;
        if (target.status === "finish") { onFinish(true); return; }
        this.scene.time.delayedCall(80, moveStep);
      };

      useTeleport
        ? this._animateTeleport(playerIndex, target.x, target.y, afterLand)
        : this._animateMove(playerIndex, target.x, target.y, afterLand);
    };

    const moveStep = () => {
      if (stepsLeft <= 0) { onFinish(false); return; }

      const node = this.boardManager.getNodeById(player.currentNodeId);
      if (!node || node.next.length === 0) { onFinish(false); return; }

      const isTeleport = (player.currentNodeId === "node38" || player.currentNodeId === "node40");

      if (isTeleport) {
        doMove(node.next[Math.floor(Math.random() * node.next.length)], true);
      } else if (node.next.length > 1) {
        onBranchChoice(node.next, player.currentNodeId, (chosen) => doMove(chosen, false));
      } else {
        doMove(node.next[0], false);
      }
    };

    moveStep();
  }
}
