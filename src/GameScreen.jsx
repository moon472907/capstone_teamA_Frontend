import React, { useState, useEffect, useRef, useCallback } from 'react';
import PhaserGame from './phaser/PhaserGame';
import {
  rollDice, selectBranch, getGameState,
  selectCardTarget, resolveDefense, selectBusDestination,
  toNodeId, toTileId
} from './services/api';
import { createGameSocket, WS_EVENTS } from './services/websocket';
import { EVENT_NODES, EVENT_TYPE_LABEL, pickRandomEvent } from './data/kangwonEvents';

// 서버 카드(cardKey/cardType/title/description) → 화면 표시용 변환
const CARD_EMOJI = {
  police: '🚔', freeloader: '😴', course_fail: '😱', drinking: '🍻', skipper: '🏃', breakup: '💔',
  guardian: '🐻‍❄️', top: '🏆', global: '🌍', work: '💼', veteran: '🎖️', capstone: '🎓',
};
const CARD_TYPE_TO_KIND = { ATTACK: 'attack', DEFENSE: 'defense', SCHOLARSHIP: 'scholarship' };

// 서버 플레이어의 characterKey → 이모지 (뱃지 표시용)
const CHAR_ICON = {
  gomduri: '🐻‍❄️', narae: '🕊️', daramji: '🐿️', bunny: '🐰', fox: '🦊', cat: '🐱',
};
const serverCardToDisplay = (p) => ({
  type: CARD_TYPE_TO_KIND[p.cardType] || 'attack',
  emoji: CARD_EMOJI[p.cardKey] || '🎴',
  title: p.title,
  description: p.description,
});

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
  const [busRideOptions, setBusRideOptions] = useState(null);          // 로컬 모드 (정류장 nodeId 문자열)
  const [serverBusOptions, setServerBusOptions] = useState(null);      // 서버 모드 (nodeNumber 배열)

  // ── 서버 카드 인터랙션 ─────────────────────────────────────
  const [cardTargetOptions, setCardTargetOptions] = useState(null);    // 공격 대상 지정 (playerId 배열)
  const [pendingAttackCard,  setPendingAttackCard]  = useState(null);  // { cardKey, title }
  const [defensePrompt,      setDefensePrompt]      = useState(null);   // { attackerPlayerId, title, starsChange, defenseCards }
  const [busy,               setBusy]               = useState(false);  // 서버 액션 전송 중

  // ── 스타 ───────────────────────────────────────────────────
  const [stars,         setStars]         = useState(0);
  const [showStarNotif, setShowStarNotif] = useState(false);

  // ── Phaser 브릿지 ──────────────────────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState(null); // 건물 상세 정보 팝업용 상태
  const phaserGameRef = useRef(null);
  const wsClientRef   = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);
  const boardInitedRef = useRef(false);

  const getBoardScene = useCallback(() => {
    return phaserGameRef.current?.scene?.getScene('BoardScene') ?? null;
  }, []);

  // 서버 플레이어로 보드 말 생성 (씬 준비 + 플레이어 로드 후 1회)
  useEffect(() => {
    if (!gameId || !sceneReady || boardInitedRef.current || !players?.length) return;
    const scene = getBoardScene();
    if (!scene) return;
    scene.initPlayers(players.map(p => ({
      playerId: p.playerId,
      nodeName: toNodeId(p.tileNumber ?? p.tileId ?? 1),
      nickname: p.nickname,
    })));
    boardInitedRef.current = true;
  }, [gameId, sceneReady, players, getBoardScene]);

  // ── 현재 표시할 플레이어 목록 (서버 or 더미) ───────────────
  const displayPlayers = players ?? [
    { playerId: 1, nickname: selectedCharacter?.name || '나', icon: selectedCharacter?.icon || '🐻‍❄️', coins: 0, gpa: 0, color: '#85CDEE' },
    ...DUMMY_PLAYERS.map(p => ({ playerId: p.id, nickname: p.name, icon: p.icon, coins: 0, gpa: 0, color: p.color }))
  ];

  // 서버 플레이어 목록에서 본인 playerId 식별 (로그인 memberId == user.id 매칭). 실패 시 prop 폴백
  const myPlayerId = (players?.find(p => p.memberId === user?.id)?.playerId) ?? playerId;
  const isMyTurn = !gameId || (displayPlayers[currentPlayerIdx]?.playerId === myPlayerId);

  // WS 콜백에서 최신 myPlayerId를 참조하기 위한 ref (stale closure 방지)
  const myPlayerIdRef = useRef(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  // ── WebSocket 연결 (gameId 있을 때만; 토큰은 createGameSocket이 localStorage 폴백) ──
  useEffect(() => {
    if (!gameId) return;

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
        // 서버는 nodeNumber(1~53)를 보냄 → 해당 playerId의 말을 그 노드로 이동
        const n = payload.nodeNumber ?? payload.tileIndex ?? payload.toTileId;
        getBoardScene()?.movePlayer(payload.playerId, [toNodeId(n)]);
        break;
      }

      case WS_EVENTS.BRANCH_REQUIRED:
        // 갈림길은 굴린 본인에게만 표시 (branchOptions = nodeNumber 배열)
        if (payload.playerId === myPlayerIdRef.current) {
          setBranchOptions(payload.branchOptions);
        }
        break;

      case WS_EVENTS.TILE_TRIGGERED:
        // 스타/코인 변동을 해당 플레이어에 반영
        if (payload.playerId != null && (payload.totalStars != null || payload.totalCoins != null)) {
          setPlayers(prev => prev?.map(p => p.playerId === payload.playerId
            ? { ...p,
                stars: payload.totalStars ?? p.stars,
                coins: payload.totalCoins ?? p.coins,
                defenseCards: payload.defenseCards ?? p.defenseCards }
            : p));
        }
        setTileEvent({
          coinsChange: payload.coinsChange,
          totalCoins:  payload.totalCoins,
          starsChange: payload.starsChange,
          totalStars:  payload.totalStars,
          description: payload.description,
          tileType:    payload.tileType
        });
        setTimeout(() => setTileEvent(null), 3000);
        break;

      case WS_EVENTS.CARD_DRAWN:
        // 모든 플레이어에게 뽑힌 카드 공개 (잠시 후 자동 닫힘)
        setActiveEvent(serverCardToDisplay(payload));
        setEventFlipped(false);
        setTimeout(() => setEventFlipped(true), 800);
        setTimeout(() => { setActiveEvent(null); setEventFlipped(false); }, 3500);
        break;

      case WS_EVENTS.CARD_TARGET_REQUIRED:
        // 공격 카드를 뽑은 본인만 대상 선택 UI 표시
        if (payload.playerId === myPlayerIdRef.current) {
          setPendingAttackCard({ cardKey: payload.cardKey, title: payload.title });
          setCardTargetOptions(payload.targetOptions);
        }
        break;

      case WS_EVENTS.DEFENSE_PROMPT:
        // 피격 대상 본인만 방어 사용 여부 UI 표시
        if (payload.targetPlayerId === myPlayerIdRef.current) {
          setDefensePrompt({
            attackerPlayerId: payload.attackerPlayerId,
            title: payload.title,
            starsChange: payload.starsChange,
            defenseCards: payload.defenseCards
          });
        }
        break;

      case WS_EVENTS.BUS_RIDE_REQUIRED:
        // 현재 플레이어 본인만 정류장 선택 UI 표시
        if (payload.playerId === myPlayerIdRef.current) {
          setServerBusOptions(payload.busOptions);
        }
        break;

      case WS_EVENTS.TURN_SKIPPED:
        setNextPlayerName(`${payload.nickname}님은 이번 턴을 쉽니다`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 1800);
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
  }, [getBoardScene, playerId]);

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
      // 서버 권위: 주사위/이동/분기 연출은 모두 WS 이벤트(DICE_ROLLED/PLAYER_MOVED/BRANCH_REQUIRED)로 구동
      try {
        await rollDice(gameId);
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
      // 서버 권위: 이동/추가 분기 연출은 WS 이벤트로 구동 (branchOptions는 nodeNumber)
      try {
        await selectBranch(gameId, tileId);
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

  // ── 서버 모드: 공격 카드 대상 지정 ─────────────────────────
  const handleCardTargetSelect = useCallback(async (targetPlayerId) => {
    if (busy) return;
    setBusy(true);
    setCardTargetOptions(null);
    setPendingAttackCard(null);
    try {
      await selectCardTarget(gameId, targetPlayerId);
    } catch (err) {
      console.error('카드 대상 지정 실패:', err);
    } finally {
      setBusy(false);
    }
  }, [busy, gameId]);

  // ── 서버 모드: 방어 카드 사용 여부 ─────────────────────────
  const handleDefenseChoice = useCallback(async (useDef) => {
    if (busy) return;
    setBusy(true);
    setDefensePrompt(null);
    try {
      await resolveDefense(gameId, useDef);
    } catch (err) {
      console.error('방어 처리 실패:', err);
    } finally {
      setBusy(false);
    }
  }, [busy, gameId]);

  // ── 서버 모드: 두리버스 정류장 선택 ────────────────────────
  const handleServerBusSelect = useCallback(async (nodeNumber) => {
    if (busy) return;
    setBusy(true);
    setServerBusOptions(null);
    try {
      await selectBusDestination(gameId, nodeNumber);
    } catch (err) {
      console.error('정류장 선택 실패:', err);
    } finally {
      setBusy(false);
    }
  }, [busy, gameId]);

  // ── Phaser 이동 완료 콜백 ──────────────────────────────────
  const handleMoveDone = ({ isWin, nodeId }) => {
    // 서버 모드: 카드/버스/스타는 서버 이벤트가 구동하므로 로컬 처리 안 함
    if (gameId) return;

    if (isWin) {
      setGameResult([{ nickname: displayPlayers[0]?.nickname || '플레이어', rank: 1, coins: 0 }]);
      setIsRolling(false);
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

  const handleLandmarkClick = useCallback((buildingData) => {
    setSelectedBuilding(buildingData);
  }, []);



  const handleGameReady = useCallback((gameInstance) => {
    phaserGameRef.current = gameInstance;
    setSceneReady(true);
  }, []);

  // ── 타일 이벤트 색상 ──────────────────────────────────────
  const tileEventColor = {
    RANDOM_REWARD: '#48BB78',
    TRAP:          '#E53E3E',
    STAR:          '#F6AD55',
    MINIGAME:      '#9F7AEA',
    CARD:          '#4299E1',
    BUS:           '#38B2AC',
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
            onLandmarkClick={handleLandmarkClick}
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
              {player.icon ?? CHAR_ICON[player.characterKey] ?? '🎮'}
            </div>
            <div className="badge-info">
              <span className="badge-name">{player.nickname ?? player.name}</span>
              <div className="badge-stats">
                <span className="badge-star">⭐ {player.stars ?? (idx === 0 ? stars : 0)}</span>
                {(player.defenseCards ?? 0) > 0 && <span className="badge-gpa">🛡️ {player.defenseCards}</span>}
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
              {tileEvent.tileType === 'STAR'     ? '⭐ 스타!' :
               tileEvent.tileType === 'MINIGAME' ? '🎮 미니게임!' :
               tileEvent.tileType === 'CARD'     ? '🎴 이벤트 카드!' :
               tileEvent.tileType === 'BUS'      ? '🚌 두리버스!' : '📋 이벤트'}
            </p>
            {tileEvent.starsChange != null && tileEvent.starsChange !== 0 && (
              <h3 style={{ color: tileEventColor, margin: '0 0 4px' }}>
                {tileEvent.starsChange > 0 ? `+${tileEvent.starsChange}` : tileEvent.starsChange} ⭐
              </h3>
            )}
            <p style={{ fontSize: '0.9rem', color: '#4A5568', margin: 0 }}>{tileEvent.description}</p>
            {tileEvent.totalStars != null && (
              <p style={{ fontSize: '0.85rem', color: '#718096', margin: '4px 0 0' }}>
                보유 스타: {tileEvent.totalStars} ⭐
              </p>
            )}
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

      {/* 두리버스 탑승 (서버 모드) */}
      {serverBusOptions && (
        <div className="bus-overlay fade-in">
          <div className="bus-popup pop-in">
            <div className="bus-popup-header">
              <span className="bus-icon-large">🚌</span>
              <h2 className="bus-title">두리버스 탑승!</h2>
              <p className="bus-sub">이동할 정류장을 선택하세요</p>
            </div>
            <div className="bus-options">
              {serverBusOptions.map(nodeNumber => (
                <button
                  key={nodeNumber}
                  className="bus-option-btn"
                  disabled={busy}
                  onClick={() => handleServerBusSelect(nodeNumber)}
                >
                  <span className="bus-option-icon">📍</span>
                  <span>{BUS_NODE_LABEL[`node${nodeNumber}`] ?? `정류장 (#${nodeNumber})`}</span>
                </button>
              ))}
            </div>
            <p className="bus-hint">✨ 선택한 정류장으로 순간이동합니다</p>
          </div>
        </div>
      )}

      {/* 공격 카드 대상 지정 (서버 모드) */}
      {cardTargetOptions && (
        <div className="turn-overlay">
          <div className="branch-alert">
            <h2>🎯 공격 대상 선택</h2>
            <p>{pendingAttackCard?.title} — 누구를 공격할까요?</p>
            <div className="branch-btn-group">
              {cardTargetOptions.map((targetId, idx) => {
                const target = displayPlayers.find(p => p.playerId === targetId);
                return (
                  <button
                    key={targetId}
                    className={`branch-btn ${idx % 2 === 1 ? 'orange' : ''}`}
                    disabled={busy}
                    onClick={() => handleCardTargetSelect(targetId)}
                  >
                    {target?.nickname ?? `플레이어 ${targetId}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 방어 카드 사용 여부 (서버 모드) */}
      {defensePrompt && (
        <div className="turn-overlay">
          <div className="branch-alert">
            <h2>🛡️ 곰두리의 수호</h2>
            <p>
              {defensePrompt.title} 공격! (스타 {defensePrompt.starsChange})<br />
              방어 카드를 사용할까요? (보유 {defensePrompt.defenseCards}장)
            </p>
            <div className="branch-btn-group">
              <button className="branch-btn" disabled={busy} onClick={() => handleDefenseChoice(true)}>
                방어 사용
              </button>
              <button className="branch-btn orange" disabled={busy} onClick={() => handleDefenseChoice(false)}>
                그냥 맞기
              </button>
            </div>
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
                  <span>{r.stars ?? r.coins} ⭐</span>
                </div>
              ))}
            </div>
            <div className="exit-buttons">
              <button className="confirm-btn" onClick={onGoBack}>메인으로</button>
            </div>
          </div>
        </div>
      )}

      {/* 랜드마크 건물 상세 정보 레트로 팝업 모달 */}
      {selectedBuilding && (
        <div className="building-modal-overlay" onClick={() => setSelectedBuilding(null)}>
          <div className="building-modal-content pixel-chunky-border" onClick={(e) => e.stopPropagation()}>
            {/* 닫기 버튼 */}
            <button className="building-modal-close" onClick={() => setSelectedBuilding(null)}>
              ×
            </button>
            
            {/* 건물 이미지 */}
            <div className="building-modal-image-container">
              <img 
                src={selectedBuilding.image} 
                alt={selectedBuilding.name} 
                className="building-modal-image"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/300x200/2d3748/00ffcc?text=KNU+Landmark';
                }}
              />
            </div>

            {/* 건물 정보 */}
            <div className="building-modal-info">
              <h2 className="building-modal-title">{selectedBuilding.name}</h2>
              <div className="building-modal-divider"></div>
              <p className="building-modal-description">{selectedBuilding.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
