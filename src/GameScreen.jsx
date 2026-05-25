import React, { useState, useEffect, useRef, useCallback } from 'react';
import PhaserGame from './phaser/PhaserGame';
import { rollDice, selectBranch, getGameState, toNodeId, toTileId } from './services/api';
import { createGameSocket, WS_EVENTS } from './services/websocket';
import { EVENT_NODES, EVENT_TYPE_LABEL, pickRandomEvent } from './data/kangwonEvents';

const STAR_NODES    = new Set(['node4','node11','node19','node23','node28','node30','node42','node52']);
const BUS_NODES     = new Set(['node15', 'node22', 'node31', 'node36']);
const ALL_BUS_IDS   = ['node15', 'node22', 'node31', 'node36'];
const BUS_NODE_LABEL = {
  node15: '정류장 ①',
  node22: '정류장 ②',
  node31: '정류장 ③',
  node36: '정류장 ④',
};

// 로컬 더미 플레이어 (서버 연결 전 폴백)
const DUMMY_PLAYERS = [
  { id: 2, name: '나래(플레이어2)', color: '#FF8C00', icon: '🕊️',  gpa: 0 },
  { id: 3, name: '강대생A',         color: '#005BAC', icon: '🎓',  gpa: 0 },
  { id: 4, name: '강대생B',         color: '#48BB78', icon: '☘️', gpa: 0 },
];

function GameScreen({ onGoBack, selectedCharacter, gameId, playerId, user, accessToken, isSoundOn, onToggleSound }) {
  // ── 공통 UI 상태 ───────────────────────────────────────────
  const [isRolling,        setIsRolling]        = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [nextPlayerName,   setNextPlayerName]   = useState('');
  const [showSettings,     setShowSettings]     = useState(false);
  const [showExitPopup,    setShowExitPopup]    = useState(false);
  const settingsRef = useRef(null);

  // ── 게임 상태 ──────────────────────────────────────────────
  const [players,          setPlayers]          = useState(null);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [turn,             setTurn]             = useState(1);
  const [maxRounds,        setMaxRounds]        = useState(8);
  const [branchOptions,    setBranchOptions]    = useState(null);

  // ── 타일 이벤트 알림 ───────────────────────────────────────
  const [tileEvent, setTileEvent] = useState(null);
  // { coinsChange, totalCoins, description, tileType }

  // ── 게임 종료 결과 ─────────────────────────────────────────
  const [gameResult, setGameResult] = useState(null);

  // ── 강대 이벤트 카드 ───────────────────────────────────────
  const [activeEvent,  setActiveEvent]  = useState(null);
  const [eventFlipped, setEventFlipped] = useState(false);
  const pendingTurnRef = useRef(false);

  // ── 두리버스 ───────────────────────────────────────────────
  const [busRideOptions, setBusRideOptions] = useState(null);

  // ── 스타 ───────────────────────────────────────────────────
  const [stars,         setStars]         = useState(0);
  const [showStarNotif, setShowStarNotif] = useState(false);

  // ── Phaser 브릿지 ──────────────────────────────────────────
  const phaserGameRef = useRef(null);
  const wsClientRef   = useRef(null);

  const getBoardScene = useCallback(() => {
    return phaserGameRef.current?.scene?.getScene('BoardScene') ?? null;
  }, []);

  // ── 현재 표시할 플레이어 목록 (서버 or 더미) ───────────────
  const displayPlayers = players ?? [
    { playerId: 1, nickname: selectedCharacter?.name || '나', icon: selectedCharacter?.icon || '🐻‍❄️', coins: 0, gpa: 0, color: '#85CDEE' },
    ...DUMMY_PLAYERS.map(p => ({ playerId: p.id, nickname: p.name, icon: p.icon, coins: 0, gpa: 0, color: p.color }))
  ];

  const isMyTurn = !gameId || (displayPlayers[currentPlayerIdx]?.playerId === playerId);

  // ── WebSocket 연결 (gameId 있을 때만) ──────────────────────
  useEffect(() => {
    if (!gameId || !accessToken) return;

    wsClientRef.current = createGameSocket({
      gameId,
      accessToken,
      onEvent: handleWebSocketEvent,
      onConnected: () => {
        getGameState(gameId).then(state => {
          if (!state) return;
          setPlayers(state.players);
          setCurrentPlayerIdx(state.currentPlayerIndex);
          setTurn(state.round);
          setMaxRounds(state.maxRounds);
        }).catch(console.error);
      }
    });

    return () => {
      wsClientRef.current?.deactivate();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, accessToken]);

  // ── WebSocket 이벤트 핸들러 ────────────────────────────────
  const handleWebSocketEvent = useCallback((type, payload) => {
    switch (type) {
      case WS_EVENTS.DICE_ROLLED:
        getBoardScene()?.showDiceAnimation(payload.diceValue);
        break;

      case WS_EVENTS.PLAYER_MOVED: {
        const nodeId = toNodeId(payload.tileIndex ?? payload.toTileId);
        getBoardScene()?.movePlayerToNode(nodeId);
        break;
      }

      case WS_EVENTS.BRANCH_REQUIRED:
        setBranchOptions(payload.branchOptions);
        break;

      case WS_EVENTS.TILE_TRIGGERED:
        setTileEvent({
          coinsChange:  payload.coinsChange,
          totalCoins:   payload.totalCoins,
          description:  payload.description,
          tileType:     payload.tileType
        });
        setTimeout(() => setTileEvent(null), 3000);
        break;

      case WS_EVENTS.TURN_CHANGED:
        setCurrentPlayerIdx(payload.currentPlayerIndex);
        setTurn(payload.round);
        setIsRolling(false);
        setNextPlayerName(payload.currentPlayerNickname);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
        break;

      case WS_EVENTS.GAME_ENDED:
        setGameResult(payload.results);
        break;

      default:
        break;
    }
  }, [getBoardScene]);

  // ── 설정 드롭다운 바깥 클릭 닫기 ──────────────────────────
  useEffect(() => {
    const close = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target))
        setShowSettings(false);
    };
    if (showSettings) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showSettings]);

  // ── 주사위 굴리기 ──────────────────────────────────────────
  const handleRollDice = async () => {
    if (isRolling || showNotification || branchOptions || !isMyTurn) return;
    setIsRolling(true);

    if (gameId) {
      try {
        const data = await rollDice(gameId);
        const scene = getBoardScene();
        scene?.showDiceAnimation(data.diceValue, () => {
          if (data.nextState === 'BRANCH_SELECT') {
            setBranchOptions(data.branchOptions);
          } else {
            const nodeId = toNodeId(data.toTileId);
            scene?.movePlayerToNode(nodeId, () => {
              if (data.gameEnded) setIsRolling(false);
            });
          }
        });
      } catch (err) {
        console.error('주사위 굴리기 실패:', err);
        setIsRolling(false);
      }
    } else {
      const scene = getBoardScene();
      if (scene) scene.startDiceRoll();
      else setIsRolling(false);
    }
  };

  // ── Phaser 갈림길 요청 수신 (로컬 모드) ────────────────────
  const handleRequireBranchChoice = (opts) => {
    setBranchOptions(opts.map(n => (typeof n === 'string' ? toTileId(n) : n)));
  };

  // ── 갈림길 선택 ────────────────────────────────────────────
  const handleBranchSelect = async (tileId) => {
    setBranchOptions(null);

    if (gameId) {
      try {
        const data = await selectBranch(gameId, tileId);
        const nodeId = toNodeId(data.toTileId);
        const scene  = getBoardScene();
        if (data.nextState === 'BRANCH_SELECT') {
          scene?.movePlayerToNode(nodeId, () => setBranchOptions(data.branchOptions));
        } else {
          scene?.movePlayerToNode(nodeId);
        }
      } catch (err) {
        console.error('분기 선택 실패:', err);
      }
    } else {
      const scene = getBoardScene();
      if (scene) scene.selectBranch(toNodeId(tileId));
    }
  };

  // ── 로컬 모드 턴 넘기기 ────────────────────────────────────
  const doLocalTurnChange = useCallback(() => {
    setIsRolling(false);
    const nextIdx = (currentPlayerIdx + 1) % displayPlayers.length;
    setNextPlayerName(displayPlayers[nextIdx]?.nickname ?? '');
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setCurrentPlayerIdx(nextIdx);
      if (nextIdx === 0) setTurn(prev => Math.min(prev + 1, maxRounds));
    }, 2000);
  }, [currentPlayerIdx, displayPlayers, maxRounds]);

  // ── 이벤트 카드 닫기 ───────────────────────────────────────
  const handleEventCardClose = useCallback(() => {
    setActiveEvent(null);
    setEventFlipped(false);
    if (pendingTurnRef.current) {
      pendingTurnRef.current = false;
      doLocalTurnChange();
    }
  }, [doLocalTurnChange]);

  // ── 두리버스 정류장 선택 ──────────────────────────────────
  const handleBusRideSelect = useCallback((targetNodeId) => {
    setBusRideOptions(null);
    const scene = getBoardScene();
    scene?.hideBusSparkles();
    scene?.executeBusRide(targetNodeId, () => {
      if (pendingTurnRef.current) {
        pendingTurnRef.current = false;
        doLocalTurnChange();
      }
    });
  }, [getBoardScene, doLocalTurnChange]);

  // ── Phaser 이동 완료 콜백 ──────────────────────────────────
  const handleMoveDone = ({ isWin, nodeId }) => {
    if (isWin) {
      setGameResult([{ nickname: displayPlayers[0]?.nickname || '플레이어', rank: 1, coins: 0 }]);
      if (!gameId) setIsRolling(false);
      return;
    }

    if (nodeId && BUS_NODES.has(nodeId)) {
      const options = ALL_BUS_IDS.filter(n => n !== nodeId);
      setBusRideOptions(options);
      getBoardScene()?.showBusSparkles(options);
      if (!gameId) pendingTurnRef.current = true;
      return;
    }

    if (nodeId && STAR_NODES.has(nodeId)) {
      const scene = getBoardScene();
      const doAfterStar = () => {
        setStars(prev => prev + 1);
        setShowStarNotif(true);
        setTimeout(() => setShowStarNotif(false), 2200);
        if (!gameId) doLocalTurnChange();
      };
      if (scene) scene.playStarPickup(nodeId, doAfterStar);
      else doAfterStar();
      return;
    }

    if (nodeId && EVENT_NODES.has(nodeId)) {
      setActiveEvent(pickRandomEvent());
      setEventFlipped(false);
      setTimeout(() => setEventFlipped(true), 800);
      if (!gameId) pendingTurnRef.current = true;
      return;
    }

    if (!gameId) doLocalTurnChange();
  };

  const handleGameReady = (gameInstance) => {
    phaserGameRef.current = gameInstance;
  };

  // ── 타일 이벤트 색상 ──────────────────────────────────────
  const tileEventColor = {
    RANDOM_REWARD: '#48BB78',
    TRAP:          '#E53E3E',
  }[tileEvent?.tileType] ?? '#CBD5E0';

  // ── 렌더 ───────────────────────────────────────────────────
  return (
    <div className="game-container">
      <div className="in-game-title-container">
        <h1 className="in-game-title">
          <span className="title-text">강대</span>
          <span className="title-text">마블</span>
        </h1>
      </div>

      {/* 설정 버튼 */}
      <div className="top-info" ref={settingsRef}>
        <div style={{ position: 'relative' }}>
          <button className="settings-btn" title="설정" onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
          {showSettings && (
            <div className="settings-dropdown">
              <button className="settings-item" onClick={onToggleSound}>
                {isSoundOn ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'}
              </button>
              <button className="settings-item exit-btn" onClick={() => { setShowExitPopup(true); setShowSettings(false); }}>
                🚪 메인 메뉴로
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phaser 캔버스 */}
      <div className="board-wrapper">
        <div className="board-area">
          <PhaserGame
            selectedCharacter={selectedCharacter}
            onGameReady={handleGameReady}
            onRequireBranchChoice={handleRequireBranchChoice}
            onMoveDone={handleMoveDone}
          />
        </div>
      </div>

      {/* 주사위 버튼 */}
      <div className="dice-container">
        <button
          className="dice-button"
          onClick={handleRollDice}
          disabled={isRolling || showNotification || !!branchOptions || !isMyTurn}
        >
          {isRolling ? '🎲' : isMyTurn ? '주사위 굴리기' : '상대방 턴'}
        </button>
      </div>

      {/* 플레이어 정보 */}
      <div className="players-dock">
        {displayPlayers.map((player, idx) => (
          <div key={player.playerId ?? idx} className={`player-badge ${idx === currentPlayerIdx ? 'active' : ''}`}>
            <div className="badge-icon" style={{ backgroundColor: player.color ?? '#85CDEE' }}>
              {player.icon ?? player.characterKey ?? '🎮'}
            </div>
            <div className="badge-info">
              <span className="badge-name">{player.nickname ?? player.name}</span>
              <div className="badge-stats">
                <span className="badge-gpa">코인: {player.coins ?? 0}</span>
                {idx === 0 && <span className="badge-star">⭐ {stars}</span>}
              </div>
            </div>
          </div>
        ))}
        <div className="turn-badge">턴 {turn} / {maxRounds}</div>
      </div>

      {/* 턴 전환 알림 */}
      {showNotification && (
        <div className="turn-overlay" style={{ pointerEvents: 'none' }}>
          <div className="turn-alert pop-in">
            <p>{nextPlayerName}님의 차례!</p>
          </div>
        </div>
      )}

      {/* 타일 이벤트 알림 */}
      {tileEvent && (
        <div className="turn-overlay" style={{ pointerEvents: 'none' }}>
          <div className="turn-alert" style={{ border: `2px solid ${tileEventColor}`, textAlign: 'center' }}>
            <p style={{ color: tileEventColor, fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 8px' }}>
              {tileEvent.tileType === 'RANDOM_REWARD' ? '🎉 행운!' :
               tileEvent.tileType === 'TRAP'          ? '💀 함정!' : '📋 이벤트'}
            </p>
            <h3 style={{ color: tileEventColor, margin: '0 0 4px' }}>
              {tileEvent.coinsChange > 0 ? `+${tileEvent.coinsChange}` : tileEvent.coinsChange} 코인
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#4A5568', margin: 0 }}>{tileEvent.description}</p>
            <p style={{ fontSize: '0.85rem', color: '#718096', margin: '4px 0 0' }}>
              보유 코인: {tileEvent.totalCoins}
            </p>
          </div>
        </div>
      )}

      {/* 갈림길 선택 UI */}
      {branchOptions && (
        <div className="turn-overlay">
          <div className="branch-alert">
            <h2>갈림길 선택!</h2>
            <p>어느 방향으로 이동하시겠습니까?</p>
            <div className="branch-btn-group">
              {branchOptions.map((tileId, idx) => (
                <button
                  key={tileId}
                  className={`branch-btn ${idx === 1 ? 'orange' : ''}`}
                  onClick={() => handleBranchSelect(tileId)}
                >
                  {idx + 1}번 길
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 두리버스 탑승 */}
      {busRideOptions && (
        <div className="bus-overlay fade-in">
          <div className="bus-popup pop-in">
            <div className="bus-popup-header">
              <span className="bus-icon-large">🚌</span>
              <h2 className="bus-title">두리버스 탑승!</h2>
              <p className="bus-sub">이동할 정류장을 선택하세요</p>
            </div>
            <div className="bus-options">
              {busRideOptions.map(nodeId => (
                <button
                  key={nodeId}
                  className="bus-option-btn"
                  onClick={() => handleBusRideSelect(nodeId)}
                >
                  <span className="bus-option-icon">📍</span>
                  <span>{BUS_NODE_LABEL[nodeId]}</span>
                </button>
              ))}
            </div>
            <p className="bus-hint">✨ 지도에서 반짝이는 정류장으로 이동합니다</p>
          </div>
        </div>
      )}

      {/* 강대 이벤트 카드 */}
      {activeEvent && (
        <div className="event-card-overlay fade-in">
          <p className="event-card-label">모두의 강대 이벤트</p>
          <div className="event-card-scene">
            <div className={`event-card${eventFlipped ? ' flipped' : ''}`}>
              <div className="event-card-face event-card-back">
                <div className="card-back-inner">
                  <span className="card-back-title">강대마블</span>
                  <span className="card-back-icon">🎴</span>
                  <span className="card-back-sub">이벤트 카드</span>
                </div>
              </div>
              <div className={`event-card-face event-card-front event-card-${activeEvent.type}`}>
                <div className="card-type-badge">{EVENT_TYPE_LABEL[activeEvent.type]}</div>
                <div className="card-emoji">{activeEvent.emoji}</div>
                <h2 className="card-title">{activeEvent.title}</h2>
                <p className="card-desc">{activeEvent.description}</p>
                {eventFlipped && (
                  <button className="card-confirm-btn" onClick={handleEventCardClose}>
                    확인
                  </button>
                )}
              </div>
            </div>
          </div>
          {!eventFlipped && <p className="event-card-hint">잠시 후 카드가 공개됩니다...</p>}
        </div>
      )}

      {/* 스타 획득 알림 */}
      {showStarNotif && (
        <div className="turn-overlay" style={{ pointerEvents: 'none' }}>
          <div className="star-alert pop-in">
            <div className="star-alert-img">
              <img src="/assets/images/star/star.jpg" alt="star" />
            </div>
            <h2>스타 획득!</h2>
            <p>보유 스타: {stars}개</p>
          </div>
        </div>
      )}

      {/* 나가기 확인 팝업 */}
      {showExitPopup && (
        <div className="exit-overlay fade-in">
          <div className="exit-popup pop-in">
            <h2>정말 나가시겠습니까?</h2>
            <p>진행 중인 게임 데이터가 모두 사라집니다.</p>
            <div className="exit-buttons">
              <button className="cancel-btn"  onClick={() => setShowExitPopup(false)}>취소</button>
              <button className="confirm-btn" onClick={onGoBack}>나가기</button>
            </div>
          </div>
        </div>
      )}

      {/* 게임 종료 결과 화면 */}
      {gameResult && (
        <div className="exit-overlay fade-in">
          <div className="exit-popup pop-in" style={{ minWidth: '340px' }}>
            <h2 style={{ color: '#f7c948' }}>🏆 게임 종료!</h2>
            <div style={{ margin: '12px 0' }}>
              {gameResult.map((r) => (
                <div key={r.playerId ?? r.rank} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 12px', borderBottom: '1px solid #e2e8f0',
                  fontWeight: r.rank === 1 ? 'bold' : 'normal',
                  color: r.rank === 1 ? '#f7c948' : '#4A5568'
                }}>
                  <span>{r.rank}위  {r.nickname}</span>
                  <span>{r.coins} 코인</span>
                </div>
              ))}
            </div>
            <div className="exit-buttons">
              <button className="confirm-btn" onClick={onGoBack}>메인으로</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
