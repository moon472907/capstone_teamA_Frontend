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

    // 주사위 애니메이션용 텍스트
    const centerX = this.scale.width / 2;
    const bottomY = this.scale.height - 160;

    this.diceResultText = this.add.text(centerX, bottomY, '', {
      fontSize: '80px',
      fontFamily: 'DungGeunMo',
      color: '#ffca28',
      stroke: '#003d73',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, fill: true },
    }).setOrigin(0.5).setDepth(1000).setScrollFactor(0).setVisible(false);

    // 줌 힌트 텍스트
    const hint = this.add.text(centerX, 24, "🖱 스크롤: 줌인/줌아웃  |  드래그: 이동  |  더블클릭: 전체 보기", {
      fontSize: "13px",
      fontFamily: "DungGeunMo",
      color: "#ffffff",
      backgroundColor: "#00000066",
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5, 0).setDepth(1001).setScrollFactor(0);

    // 3초 후 힌트 페이드 아웃
    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 800, onComplete: () => hint.destroy() });
    });

    // 줌 컨트롤 초기화
    this._setupZoomControls();

    // 스타 노드 마커 배치
    this._placeStarMarkers();
  }

  // ─────────────────────────────────────────────────────────────
  //  줌인/줌아웃 + 드래그 패닝 컨트롤
  // ─────────────────────────────────────────────────────────────
  _setupZoomControls() {
    const cam = this.cameras.main;
    const bm  = this.boardManager;

    // 맵 실제 월드 좌표
    const mapX = bm.mapOffsetX;
    const mapY = bm.mapOffsetY;
    const mapW = 1672 * bm.mapScale;  // dispW
    const mapH = 941  * bm.mapScale;  // dispH

    const W = this.scale.width;
    const H = this.scale.height;

    const MIN_ZOOM = 1.0;
    const MAX_ZOOM = 4.0;

    // Phaser 내장 setBounds로 맵 전체 영역을 스크롤 범위로 지정
    // → 줌인 상태에서 맵의 모든 구석을 드래그로 탐색 가능
    cam.setBounds(mapX, mapY, mapW, mapH);

    // ── 마우스 휠 줌 (커서 위치 기준) ────────────────────────
    this.input.on('wheel', (pointer, _o, _dx, deltaY) => {
      const oldZ = cam.zoom;
      const newZ = Phaser.Math.Clamp(oldZ * (deltaY > 0 ? 0.88 : 1.12), MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(newZ - oldZ) < 0.001) return;

      // 커서 아래 월드 좌표를 줌 전후로 고정
      const wx = cam.scrollX + pointer.x / oldZ;
      const wy = cam.scrollY + pointer.y / oldZ;
      cam.zoom    = newZ;
      cam.scrollX = wx - pointer.x / newZ;
      cam.scrollY = wy - pointer.y / newZ;
      // setBounds가 범위 초과 시 자동 보정

      this.game.canvas.style.cursor = newZ > MIN_ZOOM ? 'grab' : 'default';
    });

    // ── 드래그 패닝 ───────────────────────────────────────────
    let px0 = 0, py0 = 0, sx0 = 0, sy0 = 0;

    this.input.on('pointerdown', (p) => {
      px0 = p.x; py0 = p.y;
      sx0 = cam.scrollX; sy0 = cam.scrollY;
      if (cam.zoom > MIN_ZOOM) this.game.canvas.style.cursor = 'grabbing';
    });

    this.input.on('pointermove', (p) => {
      if (!p.isDown || cam.zoom <= MIN_ZOOM) return;
      cam.scrollX = sx0 - (p.x - px0) / cam.zoom;
      cam.scrollY = sy0 - (p.y - py0) / cam.zoom;
    });

    this.input.on('pointerup', () => {
      this.game.canvas.style.cursor = cam.zoom > MIN_ZOOM ? 'grab' : 'default';
    });

    // ── 더블클릭: 전체 맵 뷰로 리셋 ─────────────────────────
    this.input.on('pointerdoubletap', () => {
      cam.zoomTo(MIN_ZOOM, 350, 'Sine.easeInOut');
      cam.pan(W / 2, H / 2, 350, 'Sine.easeInOut');
      this.time.delayedCall(360, () => { this.game.canvas.style.cursor = 'default'; });
    });

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

  // 주사위 숫자 롤링 연출 후 콜백 (서버 이벤트용)
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

  // 주사위 애니메이션만 표시 (화면 하단 중앙에 고정 표시)
  showDiceAnimation(value, onComplete) {
    this.diceResultText.setPosition(this.scale.width / 2, this.scale.height - 160);
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
              this.time.delayedCall(600, () => {
                this.diceResultText.setVisible(false);
                if (onComplete) onComplete();
              });
            }
          });
        }
      }
    });
  }

  // 특정 nodeId로 플레이어를 직접 이동 (서버 최종 위치 지정)
  movePlayerToNode(targetNodeId, onComplete) {
    const player = this.gameManager.players[0];
    const target = this.boardManager.getNodeById(targetNodeId);
    if (!target) { if (onComplete) onComplete(); return; }

    this.playerManager._animateMove(0, target.x, target.y, () => {
      player.currentNodeId = targetNodeId;
      this.gameManager.isAnimating = false;
      if (onComplete) onComplete();
    });
  }

  // 로컬/데모 모드 주사위 굴리기
  startDiceRoll(result) {
    if (this.gameManager.isAnimating) return;
    this.gameManager.isAnimating = true;
    const diceValue = result || this.diceManager.roll();
    const sprite = this.playerManager.playerSprites[0]?.sprite;
    if (sprite) {
      this.diceResultText.setPosition(sprite.x, sprite.y - 70);
    }
    this.diceResultText.setVisible(true).setScale(1).setText('?');
    let count = 0;
    this.time.addEvent({
      delay: 60,
      repeat: 14,
      callback: () => {
        count++;
        this.diceResultText.setText(`${Phaser.Math.Between(1, 6)}`);
        if (count >= 15) {
          this.diceResultText.setText(`${diceValue}`);
          this.tweens.add({
            targets: this.diceResultText,
            scaleX: 1.5, scaleY: 1.5,
            duration: 150, yoyo: true, ease: 'Back.easeOut',
            onComplete: () => {
              this.time.delayedCall(400, () => {
                this.diceResultText.setVisible(false);
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

  // ─────────────────────────────────────────────────────────────
  //  두리버스: 정류장 노드 반짝 효과
  // ─────────────────────────────────────────────────────────────

  showBusSparkles(nodeIds) {
    this._busSparkles = [];

    nodeIds.forEach(nodeId => {
      const node = this.boardManager.getNodeById(nodeId);
      if (!node) return;

      // 바깥 링
      const ring = this.add.graphics().setDepth(302);
      ring.lineStyle(4, 0xFFD700, 1);
      ring.strokeCircle(0, 0, 22);
      ring.setPosition(node.x, node.y);

      // 안쪽 채움
      const fill = this.add.graphics().setDepth(301);
      fill.fillStyle(0xFFD700, 0.25);
      fill.fillCircle(0, 0, 16);
      fill.setPosition(node.x, node.y);

      // 버스 아이콘
      const icon = this.add.text(node.x, node.y - 40, '🚌', {
        fontSize: '18px',
      }).setOrigin(0.5).setDepth(303);

      // 펄스 트윈
      const tween = this.tweens.add({
        targets: [ring, fill],
        alpha: 0.05,
        scaleX: 1.7,
        scaleY: 1.7,
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 아이콘 보빙 트윈
      const iconTween = this.tweens.add({
        targets: icon,
        y: node.y - 48,
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this._busSparkles.push({ ring, fill, icon, tween, iconTween });
    });
  }

  hideBusSparkles() {
    if (!this._busSparkles) return;
    this._busSparkles.forEach(({ ring, fill, icon, tween, iconTween }) => {
      tween.stop();
      iconTween.stop();
      ring.destroy();
      fill.destroy();
      icon.destroy();
    });
    this._busSparkles = [];
  }

  // ─────────────────────────────────────────────────────────────
  //  두리버스: 버스 탑승 이동 애니메이션
  // ─────────────────────────────────────────────────────────────

  executeBusRide(targetNodeId, onComplete) {
    const player = this.gameManager.players[0];
    const { sprite, shadow } = this.playerManager.playerSprites[0];

    // BFS로 최단 경로(엣지 기준) 계산
    const path = this._bfsPath(player.currentNodeId, targetNodeId);
    if (path.length < 2) { if (onComplete) onComplete(); return; }

    // 플레이어 숨기기
    sprite.setVisible(false);
    shadow.setVisible(false);

    // 출발 노드에 버스 배치
    const startNode = this.boardManager.getNodeById(path[0]);
    const busW = Math.round(100 * this.boardManager.mapScale / 0.5);
    const bus  = this.add.image(startNode.x, startNode.y, 'bus')
      .setDisplaySize(busW, busW * 0.48)
      .setDepth(305);

    // 엣지를 따라 한 칸씩 이동
    let stepIdx = 1;

    const step = () => {
      if (stepIdx >= path.length) {
        // 목적지 도착
        bus.destroy();
        const dest = this.boardManager.getNodeById(targetNodeId);
        sprite.setPosition(dest.x, dest.y).setVisible(true);
        shadow.setPosition(dest.x, dest.y + 8).setVisible(true);
        sprite.play('player_idle');
        player.currentNodeId = targetNodeId;
        this.gameManager.isAnimating = false;
        if (onComplete) onComplete();
        return;
      }

      const next = this.boardManager.getNodeById(path[stepIdx]);
      // 진행 방향에 따라 좌우 반전
      bus.setFlipX(next.x < bus.x);

      this.tweens.add({
        targets: bus,
        x: next.x,
        y: next.y,
        duration: 180,
        ease: 'Linear',
        onComplete: () => { stepIdx++; step(); },
      });
    };

    step();
  }

  // BFS: 최단 경로 반환 (양방향 인접 그래프 기준)
  _bfsPath(startId, endId) {
    if (!this._adj) this._adj = this._buildAdjacency();
    if (startId === endId) return [startId];

    const queue   = [[startId]];
    const visited = new Set([startId]);

    while (queue.length) {
      const path = queue.shift();
      const curr = path[path.length - 1];
      for (const nb of (this._adj[curr] || [])) {
        if (nb === endId) return [...path, nb];
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([...path, nb]);
        }
      }
    }
    return [startId, endId]; // fallback
  }

  // nodeMap에서 양방향 인접 리스트 생성 (최초 1회)
  _buildAdjacency() {
    const adj = {};
    Object.values(this.boardManager.nodeMap).forEach(node => {
      if (!adj[node.id]) adj[node.id] = [];
      node.next.forEach(nextId => {
        if (!adj[nextId]) adj[nextId] = [];
        if (!adj[node.id].includes(nextId)) adj[node.id].push(nextId);
        if (!adj[nextId].includes(node.id))  adj[nextId].push(node.id);
      });
    });
    return adj;
  }

  // ─────────────────────────────────────────────────────────────
  //  스타 노드: 맵 마커 배치 + 픽업 애니메이션
  // ─────────────────────────────────────────────────────────────

  _placeStarMarkers() {
    const STAR_IDS = ['node4','node11','node19','node23','node28','node30','node42','node52'];
    const sc = this.boardManager.mapScale;
    const sz = Math.max(24, Math.round(38 * sc / 0.5));

    STAR_IDS.forEach(id => {
      const node = this.boardManager.getNodeById(id);
      if (!node) return;

      const img = this.add.image(node.x, node.y - sz * 0.6, 'star')
        .setDisplaySize(sz, sz)
        .setDepth(197)
        .setAlpha(0.9);

      // 위아래 둥실 애니메이션
      this.tweens.add({
        targets: img,
        y: node.y - sz * 0.6 - 7,
        duration: 950,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  // 스타 픽업 애니메이션 (React 이동 완료 콜백에서 호출)
  playStarPickup(nodeId, onComplete) {
    const node = this.boardManager.getNodeById(nodeId);
    if (!node) { if (onComplete) onComplete(); return; }

    const sc = this.boardManager.mapScale;
    const sz = Math.max(36, Math.round(52 * sc / 0.5));

    // 픽업 스타 (노드 위에 등장)
    const star = this.add.image(node.x, node.y - sz * 0.5, 'star')
      .setDisplaySize(sz, sz)
      .setAlpha(0)
      .setDepth(400);

    // 1) 페이드인
    this.tweens.add({
      targets: star,
      alpha: 1,
      duration: 180,
      ease: 'Linear',
      onComplete: () => {
        // 2) 살짝 커졌다가 → 위로 날아가며 사라짐
        this.tweens.add({
          targets: star,
          y: node.y - sz * 3,
          alpha: 0,
          duration: 650,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            star.destroy();
            if (onComplete) onComplete();
          },
        });
      },
    });

    // 반짝이 파티클 (금빛 원 8개가 사방으로 튐)
    const pDist = Math.max(28, Math.round(40 * sc / 0.5));
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spark = this.add.graphics().setDepth(399);
      spark.fillStyle(0xFFD700, 1);
      spark.fillCircle(0, 0, Math.max(2, Math.round(3 * sc / 0.5)));
      spark.setPosition(node.x, node.y - sz * 0.5);

      this.tweens.add({
        targets: spark,
        x: node.x + Math.cos(angle) * pDist,
        y: (node.y - sz * 0.5) + Math.sin(angle) * pDist,
        alpha: 0,
        duration: 480,
        delay: 80,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  // React에서 갈림길을 선택하면 호출됨
  selectBranch(nodeId) {
    if (this._pendingBranchCallback) {
      const cb = this._pendingBranchCallback;
      this._pendingBranchCallback = null;
      cb(nodeId);
    }
  }

  placePlayer(playerId, nodeName) {
    this.playerManager.placePlayer(playerId, nodeName);
  }
}
