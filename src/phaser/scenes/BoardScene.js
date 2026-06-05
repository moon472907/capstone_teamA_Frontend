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

    // 건물(랜드마크) 인터랙션 활성화
    this._setupBuildingInteractions();
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

  // players: [{ playerId, nodeName, nickname, characterKey }]
  initPlayers(players) {
    players.forEach((p, i) => {
      this.playerManager.createPlayer(p.playerId, p.nodeName, p.nickname, i, p.characterKey);
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

  // ─────────────────────────────────────────────────────────────
  //  어드민/로컬 모드 전용
  // ─────────────────────────────────────────────────────────────

  // 로컬 플레이어 생성 (node1 시작)
  initLocalPlayer(nickname = '관리자', characterKey) {
    this._local = { nodeId: 'node1', isAnimating: false };
    this.initPlayers([{ playerId: 'local', nodeName: 'node1', nickname, characterKey }]);
  }

  // 로컬 주사위 굴리기
  startDiceRoll() {
    if (!this._local || this._local.isAnimating) return;
    this._local.isAnimating = true;

    const diceValue = Phaser.Math.Between(1, 6);
    const pawn = this.playerManager.pawns['local'];
    if (pawn) {
      this.diceResultText.setPosition(pawn.sprite.x, pawn.sprite.y - 70);
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
                this._doLocalMove(this._local.nodeId, diceValue);
              });
            },
          });
        }
      },
    });
  }

  // 로컬 이동: 1칸씩 hop, 분기점에서 React 선택 요청
  _doLocalMove(fromId, stepsLeft) {
    if (stepsLeft <= 0) {
      this._local.isAnimating = false;
      const node = this.boardManager.getNodeById(this._local.nodeId);
      this.game.events.emit('moveDone', {
        isWin: node?.status === 'finish',
        nodeId: this._local.nodeId,
      });
      return;
    }

    const node = this.boardManager.getNodeById(fromId);
    if (!node || node.next.length === 0) {
      this._local.isAnimating = false;
      this.game.events.emit('moveDone', { isWin: false, nodeId: this._local.nodeId });
      return;
    }

    if (node.next.length > 1) {
      // 분기점: React에 선택 UI 요청 후 콜백 대기
      const nums = node.next.map(n => parseInt(n.replace('node', ''), 10));
      this._pendingBranchCallback = (chosenNodeId) => {
        this.movePlayer('local', [chosenNodeId], () => {
          this._local.nodeId = chosenNodeId;
          this._doLocalMove(chosenNodeId, stepsLeft - 1);
        });
      };
      this.game.events.emit('requireBranchChoice', nums, fromId);
      return;
    }

    const nextId = node.next[0];
    this.movePlayer('local', [nextId], () => {
      this._local.nodeId = nextId;
      this._doLocalMove(nextId, stepsLeft - 1);
    });
  }

  // pathNodeNames: 도착까지 거쳐가는 노드 이름 배열(시작 제외)
  // 목적지 1개만 주어지면 directed BFS로 전체 경로를 자동 복원
  movePlayer(playerId, pathNodeNames, onComplete) {
    if (pathNodeNames.length === 1) {
      const pawn = this.playerManager.pawns[playerId];
      const dest = pathNodeNames[0];
      if (pawn?.nodeName && pawn.nodeName !== dest) {
        const full = this._directedPath(pawn.nodeName, dest);
        this.playerManager.animatePath(playerId, full.length ? full : [dest], onComplete);
        return;
      }
    }
    this.playerManager.animatePath(playerId, pathNodeNames, onComplete);
  }

  // Directed BFS: next 방향만 따라 start→end 최단 경로 반환 (start 제외, end 포함)
  _directedPath(startId, endId) {
    if (!this._dirAdj) this._dirAdj = this._buildDirectedAdjacency();
    if (startId === endId) return [];

    const queue   = [[startId]];
    const visited = new Set([startId]);

    while (queue.length) {
      const path = queue.shift();
      const curr = path[path.length - 1];
      for (const nb of (this._dirAdj[curr] || [])) {
        if (nb === endId) return [...path.slice(1), nb];
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([...path, nb]);
        }
      }
    }
    return [endId]; // fallback
  }

  _buildDirectedAdjacency() {
    const adj = {};
    Object.values(this.boardManager.nodeMap).forEach(node => {
      adj[node.id] = [...node.next];
    });
    return adj;
  }

  // ── 카메라 줌 헬퍼 ───────────────────────────────────────────

  // 해당 플레이어 말 위치로 줌인 (턴 시작 시 호출)
  zoomToPlayer(playerId, duration = 500) {
    const pawn = this.playerManager.pawns[playerId];
    if (!pawn) return;
    const cam = this.cameras.main;
    cam.zoomTo(2.2, duration, 'Sine.easeInOut');
    cam.pan(pawn.sprite.x, pawn.sprite.y, duration, 'Sine.easeInOut');
  }

  // 전체 맵 기본 뷰로 줌아웃 (이동 시작 시 호출)
  zoomToDefault(duration = 450) {
    const cam = this.cameras.main;
    cam.zoomTo(1.0, duration, 'Sine.easeInOut');
    cam.pan(this.scale.width / 2, this.scale.height / 2, duration, 'Sine.easeInOut');
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
    // 로컬 모드: 'local' 플레이어, 서버 모드: 첫 번째 pawn
    const playerId = this._local ? 'local' : Object.keys(this.playerManager.pawns)[0];
    const pawn = this.playerManager.pawns[playerId];
    if (!pawn) { if (onComplete) onComplete(); return; }

    const fromNodeId = pawn.nodeName;

    // BFS로 최단 경로(엣지 기준) 계산
    const path = this._bfsPath(fromNodeId, targetNodeId);
    if (path.length < 2) { if (onComplete) onComplete(); return; }

    // 플레이어 숨기기
    pawn.sprite.setVisible(false);
    pawn.shadow.setVisible(false);

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
        const ox = pawn.offset?.x ?? 0;
        const oy = pawn.offset?.y ?? 0;
        pawn.sprite.setPosition(dest.x + ox, dest.y + oy).setVisible(true);
        pawn.shadow.setPosition(dest.x + ox, dest.y + oy + 8).setVisible(true);
        pawn.label?.setPosition(dest.x + ox, dest.y + oy - 46);
        this.playerManager._playIdle(pawn);
        pawn.nodeName = targetNodeId;
        if (this._local) this._local.nodeId = targetNodeId;
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
  //  건물(랜드마크) 마우스 호버 피드백 및 클릭 이벤트 처리
  // ─────────────────────────────────────────────────────────────

  _setupBuildingInteractions() {
    // 6개 지정 노드에 대한 상세 정보 정의 (나중에 사용자가 수정할 수 있게 최상단에 놓음)
    const BUILDING_DATA = {
      node41: {
        id: 'node41',
        label: '1',
        name: '중앙도서관',
        description: '강원대 학생들이 가장 많이 이용하는 대표 도서관입니다. 열람실·스터디룸·멀티미디어실 등 다양한 학습 공간을 갖추고 있으며, 시험기간에는 많은 학생들이 이용하는 공부의 중심 공간 역할을 합니다. 그룹스터디룸과 시설 예약도 가능해 팀플이나 과제 준비에도 자주 활용됩니다.',
        image: '/assets/buildings/central_library.jpg'
      },
      node22: {
        id: 'node22',
        label: '2',
        name: '백령스포츠센터',
        description: '헬스장·수영장 등 다양한 체육시설을 갖춘 대표 스포츠 공간입니다. 온라인 예약 시스템을 통해 체육시설과 강좌를 편리하게 이용할 수 있어 학생들의 활용도가 높은 편입니다.',
        image: '/assets/buildings/sports_center.png'
      },
      node23: {
        id: 'node23',
        label: '3',
        name: 'KNU 미래도서관',
        description: '최신식 학습 공간과 다양한 편의시설을 갖춘 대표 도서관입니다. 스터디룸과 회의실 예약이 가능하며, 플레이스테이션 이용 공간 등 학생 참여형 시설도 운영되어 공부와 휴식을 함께 즐길 수 있습니다.',
        image: '/assets/buildings/future_library.png'
      },
      node39: {
        id: 'node39',
        label: '4',
        name: '미래광장',
        description: '학생들이 가장 많이 모이는 강원대 대표 광장입니다. 축제 부스, 동아리 행사, 버스킹 등 다양한 학생 활동이 열리며 중앙도서관 앞에 위치해 있어 캠퍼스의 중심 공간 역할을 합니다.',
        image: '/assets/buildings/future_square.png'
      },
      node36: {
        id: 'node36',
        label: '5',
        name: '60주년기념관',
        description: '대형 강의실과 국제회의실 등을 갖춘 강원대 대표 강의동 중 하나입니다. 다양한 수업과 행사, 특강이 자주 진행되며 계단식 강의실과 회의 공간 예약 시스템도 운영되어 학술행사나 학생 활동 공간으로 활용되고 있습니다.',
        image: '/assets/buildings/60th_anniversary.jpg'
      },
      node37: {
        id: 'node37',
        label: '6',
        name: '함인섭광장 & 대운동장',
        description: '학생들이 가장 많이 모이고 다양한 행사가 열리는 강원대 대표 야외공간입니다. 중앙동아리 홍보제, 축제 등 학생 참여 행사가 자주 진행되며 넓은 운동장과 광장이 함께 어우러져 강원대 캠퍼스 분위기를 가장 잘 느낄 수 있는 장소 중 하나입니다. 함인섭광장은 강원대학교 초대 학장인 함인섭 박사를 기념해 조성된 공간이기도 합니다.',
        image: '/assets/buildings/playground.jpg'
      }
    };

    // Tiled 에디터 포인트가 배경 이미지의 실제 타일 정중앙과 살짝 어긋난 경우 미세 보정하는 테이블
    const OFFSET_CORRECTIONS = {
      node23: { dx: 19, dy: 3 }, // 3번 노드(node23)의 호버 서클 및 텍스트 위치를 완벽한 정중앙으로 미세 보정 (오른쪽 19px, 아래쪽 3px 미세 이동)
      // 나중에 다른 노드도 어긋나 보이면 여기에 { dx, dy } 한 줄만 추가해주시면 됩니다!
    };

    const sc = this.boardManager.mapScale;
    
    // 1. 마우스 클릭 히트 영역
    const hitR = Math.max(20, Math.round(28 * sc / 0.5)); 
    
    // 2. 시각적인 호버 링 크기 (14px 수준으로 고정, 절대 수정 금지)
    const visualR = Math.max(10, Math.round(14 * sc / 0.5));

    Object.keys(BUILDING_DATA).forEach(nodeId => {
      const node = this.boardManager.getNodeById(nodeId);
      if (!node) return;

      const data = BUILDING_DATA[nodeId];
      const correction = OFFSET_CORRECTIONS[nodeId] || { dx: 0, dy: 0 };
      
      // 보정 좌표 계산 (스케일 보정 포함)
      const adjX = node.x + (correction.dx * sc);
      const adjY = node.y + (correction.dy * sc);

      // 호버 시 나타날 글로우 그래픽스 생성 (기본은 투명)
      const glow = this.add.graphics().setDepth(198).setAlpha(0);
      
      // 얇고 깔끔한 네온 청록색 라인 및 은은한 반투명 채우기
      glow.lineStyle(2, 0x00ffcc, 1);
      glow.strokeCircle(0, 0, visualR);
      glow.fillStyle(0x00ffcc, 0.08);
      glow.fillCircle(0, 0, visualR - 1);
      glow.setPosition(adjX, adjY);

      // 번호 라벨 생성 (기본 숨김, 심플한 작은 크기)
      const labelText = this.add.text(adjX, adjY - visualR - 12, data.label, {
        fontSize: `${Math.max(14, Math.round(18 * sc / 0.5))}px`,
        fontFamily: 'DungGeunMo',
        color: '#00ffcc',
        stroke: '#000000',
        strokeThickness: 3.5,
      }).setOrigin(0.5).setDepth(200).setAlpha(0);

      // 보이지 않는 인터랙티브 히트 영역 생성
      const hitZone = this.add.circle(adjX, adjY, hitR, 0x000000, 0)
        .setDepth(199)
        .setInteractive({ useHandCursor: true });

      let pulseTween = null;

      // 1. 마우스 호버 IN 피드백 (글로우 + 숫자 라벨 등장)
      hitZone.on('pointerover', () => {
        if (pulseTween) pulseTween.stop();
        this.tweens.add({
          targets: glow,
          alpha: 1,
          duration: 150,
          ease: 'Sine.easeOut'
        });
        
        this.tweens.add({
          targets: labelText,
          alpha: 1,
          duration: 150,
          ease: 'Sine.easeOut'
        });

        // 펄스 효과
        pulseTween = this.tweens.add({
          targets: glow,
          scaleX: 1.12,
          scaleY: 1.12,
          alpha: 0.9,
          duration: 550,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });

      // 2. 마우스 호버 OUT (글로우 + 숫자 라벨 퇴장)
      hitZone.on('pointerout', () => {
        if (pulseTween) pulseTween.stop();
        this.tweens.add({
          targets: glow,
          alpha: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 180,
          ease: 'Sine.easeIn'
        });

        this.tweens.add({
          targets: labelText,
          alpha: 0,
          duration: 180,
          ease: 'Sine.easeIn'
        });
      });

      // 3. 마우스 클릭 피드백 및 React 이벤트 방출
      hitZone.on('pointerup', () => {
        this.tweens.add({
          targets: glow,
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 0,
          duration: 100,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            glow.setScale(1);
            glow.setAlpha(0);
          }
        });

        // React로 건물 정보 전송
        this.game.events.emit('landmarkClicked', data);
      });
    });
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

  // ─────────────────────────────────────────────────────────────
  //  갈림길: 후보 칸을 반짝이게 + 클릭 가능하게 표시
  //  tileNumbers: 후보 nodeNumber 배열, onPick: (tileNumber) => void
  // ─────────────────────────────────────────────────────────────
  showBranchPicker(tileNumbers, onPick) {
    this.clearBranchPicker();
    this._branchPickerItems = [];

    const sc = this.boardManager.mapScale;
    const r  = Math.max(16, Math.round(24 * sc / 0.5));

    tileNumbers.forEach((num) => {
      const node = this.boardManager.getNodeById(`node${num}`);
      if (!node) return;

      // 펄스 글로우 링
      const glow = this.add.graphics().setDepth(350);
      glow.lineStyle(3, 0xffdd00, 1);
      glow.strokeCircle(0, 0, r);
      glow.fillStyle(0xffdd00, 0.18);
      glow.fillCircle(0, 0, r);
      glow.setPosition(node.x, node.y);

      const pulse = this.tweens.add({
        targets: glow,
        scaleX: 1.28, scaleY: 1.28,
        alpha: 0.45,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 위쪽 포인터 아이콘 (둥실)
      const icon = this.add.text(node.x, node.y - r - 14, '👇', {
        fontSize: `${Math.max(18, Math.round(24 * sc / 0.5))}px`,
      }).setOrigin(0.5).setDepth(351);

      const iconBob = this.tweens.add({
        targets: icon,
        y: node.y - r - 22,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 클릭 히트존
      const hit = this.add.circle(node.x, node.y, r + 8, 0x000000, 0)
        .setDepth(352)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => glow.setAlpha(1));
      hit.on('pointerup', () => {
        if (this._branchPicked) return;     // 중복 클릭 방지
        this._branchPicked = true;
        this.clearBranchPicker();
        if (onPick) onPick(num);
      });

      this._branchPickerItems.push({ glow, icon, hit, pulse, iconBob });
    });

    this._branchPicked = false;
  }

  clearBranchPicker() {
    if (!this._branchPickerItems) return;
    this._branchPickerItems.forEach(({ glow, icon, hit, pulse, iconBob }) => {
      pulse?.stop();
      iconBob?.stop();
      glow.destroy();
      icon.destroy();
      hit.destroy();
    });
    this._branchPickerItems = [];
  }

  placePlayer(playerId, nodeName) {
    this.playerManager.placePlayer(playerId, nodeName);
  }
}
