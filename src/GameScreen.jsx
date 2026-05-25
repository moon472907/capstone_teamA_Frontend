import { useState, useEffect, useRef, useCallback } from 'react';
import PhaserGame from './phaser/PhaserGame';
import { CHARACTERS } from './App';
import { api } from './api';
import { createGameSocket } from './socket';

function GameScreen({ onGoBack, gameId, user }) {
  const [players, setPlayers] = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(8);
  const [status, setStatus] = useState('게임 로딩 중...');
  const [branchOptions, setBranchOptions] = useState(null);
  const [acting, setActing] = useState(false);
  const [results, setResults] = useState(null);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const sceneRef = useRef(null);
  const clientRef = useRef(null);
  const boardRef = useRef(null);       // { idToName(id), adj }
  const playersRef = useRef([]);
  const myPlayerIdRef = useRef(null);
  const queueRef = useRef([]);
  const processingRef = useRef(false);

  const isMyTurn = currentPlayerId != null && currentPlayerId === myPlayerId;

  // ── 보드 그래프에서 from→to 경로(노드 이름 배열, 시작 제외) 탐색 ──
  const findPath = useCallback((fromId, toId) => {
    const board = boardRef.current;
    if (!board || fromId === toId) return [];
    const adj = board.adj;
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      for (const nx of adj[last] || []) {
        if (nx === toId) {
          return [...path.slice(1), nx].map((id) => board.idToName(id));
        }
        if (!visited.has(nx)) {
          visited.add(nx);
          queue.push([...path, nx]);
        }
      }
    }
    return null;
  }, []);

  // ── 이벤트 하나를 애니메이션으로 처리하고 done() 호출 ──
  const handleEvent = useCallback((msg, done) => {
    const scene = sceneRef.current;
    const p = msg.payload || {};
    switch (msg.type) {
      case 'DICE_ROLLED':
        setStatus(`${p.nickname}님이 🎲 ${p.diceValue}`);
        scene ? scene.showDice(p.diceValue, done) : done();
        break;
      case 'PLAYER_MOVED': {
        const path = findPath(p.fromTileId, p.toTileId);
        const toName = boardRef.current?.idToName(p.toTileId);
        if (scene && path && path.length) {
          scene.movePlayer(p.playerId, path, done);
        } else {
          if (scene && toName) scene.placePlayer(p.playerId, toName);
          done();
        }
        break;
      }
      case 'BRANCH_REQUIRED':
        if (p.playerId === myPlayerIdRef.current) {
          setBranchOptions(p.branchOptions);
        } else {
          setStatus('상대가 갈림길을 선택 중...');
        }
        done();
        break;
      case 'TILE_TRIGGERED':
        setPlayers((prev) =>
          prev.map((pl) => (pl.playerId === p.playerId ? { ...pl, coins: p.totalCoins } : pl))
        );
        if (p.description) setStatus(p.description);
        setTimeout(done, 700);
        break;
      case 'TURN_CHANGED':
        setCurrentPlayerId(p.currentPlayerId);
        setRound(p.round);
        setStatus(`${p.currentPlayerNickname}님의 차례`);
        setActing(false);
        done();
        break;
      case 'PLAYER_LEFT':
        setStatus(`${p.nickname}님이 나갔습니다`);
        done();
        break;
      case 'GAME_ENDED':
        setResults(p.results || []);
        done();
        break;
      default:
        done();
    }
  }, [findPath]);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    const evt = queueRef.current.shift();
    if (!evt) return;
    processingRef.current = true;
    handleEvent(evt, () => {
      processingRef.current = false;
      processQueue();
    });
  }, [handleEvent]);

  const enqueue = useCallback((msg) => {
    queueRef.current.push(msg);
    processQueue();
  }, [processQueue]);

  // ── 초기 로드: 스냅샷 + 보드 + 소켓 연결 ──
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    (async () => {
      const snap = await api.getGameState(gameId);
      const board = await api.getWorld(snap.boardId);
      if (cancelled) return;

      const idToTileIndex = {};
      const adj = {};
      board.nodes.forEach((n) => {
        idToTileIndex[n.id] = n.tileIndex;
        adj[n.id] = n.nextNodeIds;
      });
      boardRef.current = {
        idToName: (id) => `node${idToTileIndex[id] + 1}`,
        adj,
      };

      const ps = snap.players.map((p) => ({
        ...p,
        icon: CHARACTERS.find((c) => c.id === p.characterKey)?.icon || '❔',
      }));
      playersRef.current = ps;
      const mine = ps.find((p) => p.nickname === user?.name)?.playerId ?? null;
      myPlayerIdRef.current = mine;

      setPlayers(ps);
      setMyPlayerId(mine);
      setCurrentPlayerId(ps[snap.currentPlayerIndex]?.playerId ?? null);
      setRound(snap.round);
      setMaxRounds(snap.maxRounds);
      setStatus(`${snap.currentPlayerNickname}님의 차례`);
      setSnapshotLoaded(true);

      clientRef.current = createGameSocket(gameId, {
        onMessage: enqueue,
        onConnect: () => console.log('게임 소켓 연결됨'),
        onError: (e) => console.error('게임 소켓 에러', e),
      });
    })().catch((e) => {
      console.error(e);
      setStatus('게임 로드 실패: ' + e.message);
    });

    return () => {
      cancelled = true;
      clientRef.current?.deactivate();
    };
  }, [gameId, user, enqueue]);

  // ── 보드 씬 + 스냅샷 준비되면 말 배치 ──
  useEffect(() => {
    if (!snapshotLoaded || !sceneReady || !sceneRef.current) return;
    const scene = sceneRef.current;
    scene.initPlayers(
      playersRef.current.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        nodeName: boardRef.current.idToName(p.tileId),
      }))
    );
  }, [snapshotLoaded, sceneReady]);

  const handleBoardReady = (scene) => {
    sceneRef.current = scene;
    setSceneReady(true);
  };

  const handleRoll = async () => {
    if (!isMyTurn || branchOptions || acting) return;
    setActing(true);
    try {
      await api.rollDice(gameId);
    } catch (e) {
      alert(e.message);
      setActing(false);
    }
  };

  const handleBranch = async (nodeId) => {
    setBranchOptions(null);
    try {
      await api.selectBranch(gameId, nodeId);
    } catch (e) {
      alert(e.message);
    }
  };

  const branchNodeName = (id) => boardRef.current?.idToName(id) || id;

  return (
    <div className="game-container">
      <div className="in-game-title-container">
        <h1 className="in-game-title">
          <span className="title-text">강대</span>
          <span className="title-text">마블</span>
        </h1>
      </div>

      <div className="top-info">
        <button className="settings-btn" title="나가기" onClick={() => setShowExitPopup(true)}>
          🚪
        </button>
      </div>

      <div className="board-wrapper">
        <div className="board-area">
          <PhaserGame onBoardReady={handleBoardReady} />
        </div>
      </div>

      <div className="dice-container">
        <button className="dice-button" onClick={handleRoll} disabled={!isMyTurn || !!branchOptions || acting}>
          {isMyTurn ? (acting ? '🎲' : '주사위 굴리기') : '상대 차례'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 6, color: '#fff', textShadow: '1px 1px 2px #000', fontSize: 14 }}>
          {status}
        </div>
      </div>

      <div className="players-dock">
        {players.map((player) => (
          <div
            key={player.playerId}
            className={`player-badge ${player.playerId === currentPlayerId ? 'active' : ''}`}
          >
            <div className="badge-icon">{player.icon}</div>
            <div className="badge-info">
              <span className="badge-name">
                {player.nickname}{player.playerId === myPlayerId ? ' (나)' : ''}
              </span>
              <div className="badge-stats">
                <span className="badge-gpa">코인: {player.coins ?? 0}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="turn-badge">턴 {round} / {maxRounds}</div>
      </div>

      {branchOptions && (
        <div className="turn-overlay">
          <div className="branch-alert">
            <h2>갈림길 선택!</h2>
            <p>어느 방향으로 이동하시겠습니까?</p>
            <div className="branch-btn-group">
              {branchOptions.map((nodeId, idx) => (
                <button
                  key={nodeId}
                  className={`branch-btn ${idx === 1 ? 'orange' : ''}`}
                  onClick={() => handleBranch(nodeId)}
                >
                  {idx + 1}번 길 ({branchNodeName(nodeId)})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="exit-overlay fade-in">
          <div className="exit-popup pop-in">
            <h2>게임 종료!</h2>
            <div style={{ margin: '16px 0' }}>
              {results.map((r) => (
                <div key={r.playerId} style={{ padding: '4px 0', fontSize: 16 }}>
                  {r.rank}위 — {r.nickname} ({r.coins} 코인)
                </div>
              ))}
            </div>
            <button className="confirm-btn" onClick={onGoBack}>메인 메뉴로</button>
          </div>
        </div>
      )}

      {showExitPopup && (
        <div className="exit-overlay fade-in">
          <div className="exit-popup pop-in">
            <h2>정말 나가시겠습니까?</h2>
            <p>진행 중인 게임에서 나갑니다.</p>
            <div className="exit-buttons">
              <button className="cancel-btn" onClick={() => setShowExitPopup(false)}>취소</button>
              <button className="confirm-btn" onClick={onGoBack}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
