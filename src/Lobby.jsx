import React, { useState, useEffect, useRef } from 'react';
import './Lobby.css';
import { CHARACTERS } from './App';
import { api } from './api';
import { createGameSocket, WS_EVENTS } from './services/websocket';

const charIcon = (key) => CHARACTERS.find((c) => c.id === key)?.icon ?? '🎮';

function Lobby({ onJoinRoom, onGoBack, selectedCharacter, setSelectedCharacter, user }) {
  const [roomList, setRoomList] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [roster, setRoster] = useState(null); // { gameId, title, maxPlayers, hostMemberId, players: [...] }
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('browser');

  const wsRef = useRef(null);

  // ── 로스터 파생 값 ──────────────────────────────────────────
  const players = roster?.players ?? [];
  const maxPlayers = roster?.maxPlayers ?? 4;
  const myPlayer = players.find((p) => p.memberId === user?.id);
  const isHost = roster?.hostMemberId === user?.id;
  const isReady = myPlayer?.ready ?? false;
  const allReady = players.length === maxPlayers && players.every((p) => p.ready);

  // ── 방 목록 ────────────────────────────────────────────────
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsRefreshing(true);
    try {
      setRoomList(await api.listGames());
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── 방 입장 시: WS 구독 + 로스터 동기화 ─────────────────────
  useEffect(() => {
    if (currentView !== 'room' || !currentGameId) return;

    const fetchRoster = async () => {
      try {
        setRoster(await api.getGame(currentGameId));
      } catch {
        // 방이 사라졌을 수 있음 — 목록으로 복귀
        leaveToBrowser();
      }
    };

    fetchRoster();

    wsRef.current = createGameSocket({
      gameId: currentGameId,
      onConnected: fetchRoster,
      onEvent: (type, payload) => {
        switch (type) {
          case WS_EVENTS.PLAYER_JOINED:
          case WS_EVENTS.PLAYER_LEFT:
          case WS_EVENTS.PLAYER_READY:
            fetchRoster();
            break;
          case WS_EVENTS.GAME_STARTED:
            onJoinRoom({ gameId: currentGameId });
            break;
          default:
            break;
        }
      },
    });

    return () => {
      wsRef.current?.deactivate();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, currentGameId]);

  // 서버가 실제 배정한 캐릭터로 미리보기 동기화 (자동 배정 결과 반영)
  useEffect(() => {
    if (!roster || !user) return;
    const mine = roster.players.find((p) => p.memberId === user.id);
    const ch = mine && CHARACTERS.find((c) => c.id === mine.characterKey);
    if (ch && ch.id !== selectedCharacter.id) setSelectedCharacter(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster]);

  const leaveToBrowser = () => {
    wsRef.current?.deactivate();
    wsRef.current = null;
    setCurrentGameId(null);
    setRoster(null);
    setCurrentView('browser');
    fetchRooms();
  };

  // ── 방 입장 ────────────────────────────────────────────────
  // 선택한 캐릭터를 선호값으로 보냄 — 이미 사용 중이면 서버가 사용 가능한 캐릭터로 자동 배정
  const handleSelectRoom = async (room) => {
    if (room.currentPlayers >= room.maxPlayers) return;
    try {
      await api.joinGame(room.gameId, {
        nickname: user.name,
        characterKey: selectedCharacter.id,
      });
      setCurrentGameId(room.gameId);
      setCurrentView('room');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmCreate = async () => {
    if (!newRoomTitle.trim()) return;
    try {
      const gameId = await api.createGame({
        boardId: null,
        hostNickname: user.name,
        title: newRoomTitle.trim(),
        characterKey: selectedCharacter.id,
      });
      setCurrentGameId(gameId);
      setShowCreateModal(false);
      setCurrentView('room');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeaveRoom = async () => {
    if (currentGameId) {
      try {
        await api.leaveGame(currentGameId);
      } catch (err) {
        console.error(err);
      }
    }
    leaveToBrowser();
  };

  const handleReady = async () => {
    try {
      await api.ready(currentGameId); // 토글 — 결과는 PLAYER_READY 수신 후 로스터 재조회로 반영
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartGame = async () => {
    try {
      await api.startGame(currentGameId); // GAME_STARTED 수신 시 전원 게임으로 전환
    } catch (err) {
      alert(err.message);
    }
  };

  const openCreateModal = () => {
    setNewRoomTitle('');
    setShowCreateModal(true);
  };

  // ── 플레이어 슬롯 (실제 로스터 기반) ─────────────────────────
  const renderSlots = () => {
    const slots = [];
    for (let i = 0; i < maxPlayers; i++) {
      const p = players[i];
      if (p) {
        const isMe = p.memberId === user?.id;
        const isRoomHost = p.memberId === roster?.hostMemberId;
        slots.push(
          <div key={`slot-${p.playerId}`} className="player-slot occupied pop-in">
            {isRoomHost && <div className="slot-master-badge">👑 방장</div>}
            <div className="slot-avatar">{charIcon(p.characterKey)}</div>
            <div className="slot-info">
              <span className="slot-name">{p.nickname}{isMe ? ' (나)' : ''}</span>
              {p.ready ? (
                <span className="slot-ready-status pop-in-bounce">READY!</span>
              ) : (
                <span className="slot-waiting-status">준비 중...</span>
              )}
            </div>
          </div>
        );
      } else {
        slots.push(
          <div key={`slot-empty-${i}`} className="player-slot empty fade-in">
            <span className="empty-text">플레이어 대기 중...</span>
          </div>
        );
      }
    }
    return slots;
  };

  const filteredRooms = roomList.filter((room) =>
    room.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="lobby-container">
      <div className="top-right-actions">
        {currentView === 'browser' ? (
          <button className="menu-exit-btn" onClick={onGoBack}>
            🏠 메인 메뉴로
          </button>
        ) : (
          <button className="menu-exit-btn" onClick={handleLeaveRoom}>
            🚪 방 나가기 (목록으로)
          </button>
        )}
      </div>

      <div className="lobby-content-area">
        {currentView === 'browser' && (
          <div className="server-browser glass-panel fade-in">
            <div className="browser-header">
              <h2>대기방 목록</h2>
              <div className="browser-actions">
                <input
                  type="text"
                  className="search-input"
                  placeholder="방 제목 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="text-icon-btn" onClick={fetchRooms} disabled={isRefreshing}>
                  {isRefreshing ? '불러오는 중...' : '🔄 새로고침'}
                </button>
                <button className="btn-create-room glow-effect" onClick={openCreateModal}>
                  ➕ 새로운 방 만들기
                </button>
              </div>
            </div>

            <div className="room-list-grid">
              {isRefreshing ? (
                <div className="loading-state" style={{ gridColumn: '1 / -1' }}>
                  <span className="loading-spinner">⏳</span>
                  서버에서 목록을 불러오는 중...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="empty-search-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-primary)', fontSize: '20px' }}>
                  {searchQuery ? '검색 결과가 없습니다.' : '현재 대기 중인 방이 없습니다.'}
                </div>
              ) : filteredRooms.map((room) => {
                const isFull = room.currentPlayers >= room.maxPlayers;
                return (
                  <div key={room.gameId} className={`room-card ${isFull ? 'full' : ''}`}>
                    <div className="room-card-header">
                      <span className="room-item-title">{room.title}</span>
                    </div>
                    <div className="room-card-body">
                      <span className="room-item-count">인원: {room.currentPlayers} / {room.maxPlayers}</span>
                      {isFull ? (
                        <span className="badge-full">가득 참</span>
                      ) : (
                        <button className="badge-join" onClick={() => handleSelectRoom(room)}>입장하기</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentView === 'room' && roster && (
          <div className="waiting-room-layout pop-in">
            <div className="waiting-room glass-panel">
              <div className="waiting-room-header">
                <div className="waiting-room-title-info">
                  <h2>{roster.title}</h2>
                  <span className="room-capacity">현재 인원: {players.length}/{maxPlayers}</span>
                </div>
              </div>

              <div className="player-grid">
                {renderSlots()}
              </div>

              <div className="waiting-room-footer">
                {isHost ? (
                  <button
                    className="btn-ready"
                    onClick={handleStartGame}
                    disabled={!allReady}
                    style={{ opacity: allReady ? 1 : 0.5 }}
                  >
                    {players.length < maxPlayers
                      ? `⏳ ${maxPlayers - players.length}명 더 필요`
                      : allReady
                        ? '🎮 게임 시작'
                        : '⏳ 전원 준비 대기 중'}
                  </button>
                ) : (
                  <button
                    className={`btn-ready ${isReady ? 'is-ready' : ''}`}
                    onClick={handleReady}
                  >
                    {isReady ? '준비 완료! (취소하려면 클릭)' : '게임 준비하기'}
                  </button>
                )}
              </div>
            </div>

            <div className="character-picker glass-panel">
              <h3 className="picker-title">캐릭터 선택</h3>

              <div className="picker-preview">
                <span className="preview-icon">{selectedCharacter.icon}</span>
                <span className="preview-name">{selectedCharacter.name}</span>
                <span className="preview-desc">{selectedCharacter.desc}</span>
              </div>

              <div className="picker-grid">
                {CHARACTERS.map((char) => (
                  <button
                    key={char.id}
                    className={`picker-item ${selectedCharacter.id === char.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCharacter(char)}
                    title={char.name}
                  >
                    <span className="picker-item-icon">{char.icon}</span>
                    <span className="picker-item-name">{char.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay fade-in">
          <div className="create-modal pop-in">
            <h2>어떤 이름으로 방을 만들까요?</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="멋진 방 제목을 입력하세요"
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreate()}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-cancel-btn" onClick={() => setShowCreateModal(false)}>취소</button>
              <button
                className="modal-confirm-btn"
                onClick={handleConfirmCreate}
                disabled={!newRoomTitle.trim()}
                style={{ opacity: !newRoomTitle.trim() ? 0.5 : 1 }}
              >
                방 만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
