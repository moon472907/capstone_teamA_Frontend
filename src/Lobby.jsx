import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { CHARACTERS } from './App';
import { api } from './api';

function Lobby({ onJoinRoom, onGoBack, selectedCharacter, setSelectedCharacter, user }) {
  const [roomList, setRoomList] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('browser');

  const isHost = selectedRoom && user && selectedRoom.hostMemberId === user.id;

  useEffect(() => {
    fetchRooms();
  }, []);

  // 방 안에서 현재 인원 실시간 갱신
  useEffect(() => {
    if (currentView !== 'room' || !currentGameId) return;

    const id = setInterval(async () => {
      try {
        const rooms = await api.listGames();
        const updated = rooms.find((r) => r.gameId === currentGameId);
        if (updated) {
          setSelectedRoom((prev) => ({ ...prev, currentPlayers: updated.currentPlayers }));
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(id);
  }, [currentView, currentGameId]);

  // 비호스트 플레이어: 레디 후 게임 시작 감지 폴링
  useEffect(() => {
    if (!isReady || isHost || !currentGameId) return;

    const id = setInterval(async () => {
      try {
        const snapshot = await api.getGameState(currentGameId);
        if (snapshot && snapshot.state !== 'WAITING') {
          onJoinRoom(currentGameId);
        }
      } catch {
        // 게임 미시작 상태 - 무시
      }
    }, 2000);

    return () => clearInterval(id);
  }, [isReady, isHost, currentGameId]);

  const fetchRooms = async () => {
    setIsRefreshing(true);
    try {
      const rooms = await api.listGames();
      setRoomList(rooms);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectRoom = async (room) => {
    if (room.currentPlayers === room.maxPlayers) return;
    const autoCharacter = CHARACTERS[room.currentPlayers] ?? CHARACTERS[0];
    try {
      await api.joinGame(room.gameId, {
        nickname: user.name,
        characterKey: autoCharacter.id,
      });
      setSelectedCharacter(autoCharacter);
      setCurrentGameId(room.gameId);
      setSelectedRoom(room);
      setIsReady(false);
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
    setCurrentGameId(null);
    setSelectedRoom(null);
    setIsReady(false);
    setCurrentView('browser');
    fetchRooms();
  };

  const openCreateModal = () => {
    setNewRoomTitle('');
    setShowCreateModal(true);
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
      setSelectedRoom({
        gameId,
        title: newRoomTitle.trim(),
        currentPlayers: 1,
        maxPlayers: 4,
        hostMemberId: user.id,
      });
      setIsReady(false);
      setShowCreateModal(false);
      setCurrentView('room');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReady = async () => {
    try {
      await api.ready(currentGameId);
      setIsReady(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartGame = async () => {
    try {
      await api.startGame(currentGameId);
      onJoinRoom(currentGameId);
    } catch (err) {
      alert(err.message);
    }
  };

  const renderSlots = () => {
    const slots = [];
    slots.push(
      <div key="slot-1" className="player-slot occupied pop-in">
        {isHost && <div className="slot-master-badge">👑 방장</div>}
        <div className="slot-avatar">{selectedCharacter.icon}</div>
        <div className="slot-info">
          <span className="slot-name">{user?.name || '나'}</span>
          {isReady ? (
            <span className="slot-ready-status pop-in-bounce">READY!</span>
          ) : (
            <span className="slot-waiting-status">준비 확인 중</span>
          )}
        </div>
      </div>
    );

    const totalSlots = selectedRoom?.maxPlayers || 4;
    const otherPlayers = (selectedRoom?.currentPlayers || 1) - 1;

    for (let i = 1; i < totalSlots; i++) {
      if (i <= otherPlayers) {
        slots.push(
          <div key={`slot-${i + 1}`} className="player-slot occupied fade-in">
            <div className="slot-avatar" style={{ borderColor: '#48BB78' }}>🦊</div>
            <div className="slot-info">
              <span className="slot-name">플레이어 {i + 1}</span>
              <span className="slot-ready-status">READY!</span>
            </div>
          </div>
        );
      } else {
        slots.push(
          <div key={`slot-${i + 1}`} className="player-slot empty fade-in">
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
                const isFull = room.currentPlayers === room.maxPlayers;
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

        {currentView === 'room' && selectedRoom && (
          <div className="waiting-room-layout pop-in">
            <div className="waiting-room glass-panel">
              <div className="waiting-room-header">
                <div className="waiting-room-title-info">
                  <h2>{selectedRoom.title}</h2>
                  <span className="room-capacity">현재 인원: {selectedRoom.currentPlayers}/{selectedRoom.maxPlayers}</span>
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
                    disabled={selectedRoom.currentPlayers < selectedRoom.maxPlayers}
                    style={{ opacity: selectedRoom.currentPlayers < selectedRoom.maxPlayers ? 0.5 : 1 }}
                  >
                    {selectedRoom.currentPlayers < selectedRoom.maxPlayers
                      ? `⏳ ${selectedRoom.maxPlayers - selectedRoom.currentPlayers}명 더 필요`
                      : '🎮 게임 시작'}
                  </button>
                ) : (
                  <button
                    className={`btn-ready ${isReady ? 'is-ready' : ''}`}
                    onClick={handleReady}
                    disabled={isReady}
                  >
                    {isReady ? '준비 완료!' : '게임 준비하기'}
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
