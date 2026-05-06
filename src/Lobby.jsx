import React, { useState } from 'react';
import './Lobby.css';

const INITIAL_ROOMS = [
  { id: 1, title: '승준이의 테스트 방', currentPlayers: 1, maxPlayers: 4 },
  { id: 2, title: '강원대 마블 한 판 하실 분', currentPlayers: 3, maxPlayers: 4 },
  { id: 3, title: '초보 사절', currentPlayers: 4, maxPlayers: 4 },
];

import { CHARACTERS } from './App';

function Lobby({ onJoinRoom, onGoBack, selectedCharacter, setSelectedCharacter }) {
  const [roomList, setRoomList] = useState(INITIAL_ROOMS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 'browser' (방 목록) 또는 'room' (방 내부 대기실)
  const [currentView, setCurrentView] = useState('browser');

  const handleSelectRoom = (room) => {
    if (room.currentPlayers === room.maxPlayers) return;
    setSelectedRoom(room);
    setIsReady(false);
    setCurrentView('room');
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRoomList([]);
    // 가짜 서버 요청 시뮬레이션
    setTimeout(() => {
      setRoomList([
        { id: 4, title: '강원대생 모여라', currentPlayers: 2, maxPlayers: 4 },
        { id: 5, title: '빡겜유저 환영', currentPlayers: 1, maxPlayers: 4 },
        { id: 6, title: '초보도 괜찮아요', currentPlayers: 4, maxPlayers: 4 },
        { id: 7, title: '같이 하실 분 구해요', currentPlayers: 2, maxPlayers: 4 },
        { id: 8, title: '즐겜유저만', currentPlayers: 3, maxPlayers: 4 },
      ]);
      setIsRefreshing(false);
    }, 800);
  };

  const handleLeaveRoom = () => {
    setSelectedRoom(null);
    setIsReady(false);
    setCurrentView('browser');
  };

  const openCreateModal = () => {
    setNewRoomTitle('');
    setShowCreateModal(true);
  };

  const handleConfirmCreate = () => {
    if (!newRoomTitle.trim()) return;
    setSelectedRoom({
      id: Date.now(),
      title: newRoomTitle.trim(),
      currentPlayers: 1,
      maxPlayers: 4
    });
    setIsReady(false);
    setShowCreateModal(false);
    setCurrentView('room');
  };

  const handleReady = () => {
    setIsReady(true);
    setTimeout(() => {
      onJoinRoom();
    }, 1200);
  };

  const renderSlots = () => {
    const slots = [];
    
    // 첫 번째 슬롯은 나(현재 플레이어)
    slots.push(
      <div key="slot-1" className="player-slot occupied pop-in">
        <div className="slot-master-badge">👑 방장</div>
        <div className="slot-avatar">{selectedCharacter.icon}</div>
        <div className="slot-info">
          <span className="slot-name">{selectedCharacter.name}</span>
          {isReady ? (
            <span className="slot-ready-status pop-in-bounce">READY!</span>
          ) : (
            <span className="slot-waiting-status">준비 확인 중</span>
          )}
        </div>
      </div>
    );
    
    // 나머지 3개 슬롯 채우기
    for (let i = 1; i < selectedRoom.maxPlayers; i++) {
      if (i < selectedRoom.currentPlayers) {
        slots.push(
          <div key={`slot-${i+1}`} className="player-slot occupied fade-in">
            <div className="slot-avatar" style={{ borderColor: '#48BB78' }}>🦊</div>
            <div className="slot-info">
              <span className="slot-name">플레이어 {i+1}</span>
              <span className="slot-ready-status">READY!</span>
            </div>
          </div>
        );
      } else {
        slots.push(
          <div key={`slot-${i+1}`} className="player-slot empty fade-in">
            <span className="empty-text">플레이어 대기 중...</span>
          </div>
        );
      }
    }
    return slots;
  };

  const filteredRooms = roomList.filter(room => 
    room.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="lobby-container">

      {/* 우측 상단 메인 메뉴/나가기 버튼 */}
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
        {/* 방 찾기 화면 (Server Browser) */}
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
                <button className="text-icon-btn" onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? '불러오는 중...' : '🔄 새로고침'}
                </button>
                <button className="btn-create-room glow-effect" onClick={openCreateModal}>
                  ➕ 새로운 방 만들기
                </button>
              </div>
            </div>
            
            <div className="room-list-grid">
              {roomList.length === 0 && isRefreshing ? (
                <div className="loading-state" style={{ gridColumn: '1 / -1' }}>
                  <span className="loading-spinner">⏳</span>
                  서버에서 목록을 불러오는 중...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="empty-search-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-primary)', textShadow: '0.5px 0.5px 0 var(--text-primary)', fontSize: '20px' }}>
                  검색 결과가 없습니다.
                </div>
              ) : filteredRooms.map(room => {
                const isFull = room.currentPlayers === room.maxPlayers;
                
                return (
                  <div 
                    key={room.id} 
                    className={`room-card ${isFull ? 'full' : ''}`}
                  >
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

        {/* 방 내부 화면 (Waiting Room) */}
        {currentView === 'room' && selectedRoom && (
          <div className="waiting-room-layout pop-in">
            {/* 좌측: 플레이어 대기 패널 */}
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
                <button 
                  className={`btn-ready ${isReady ? 'is-ready' : ''}`}
                  onClick={handleReady}
                >
                  {isReady ? '준비 완료!' : '게임 준비하기'}
                </button>
              </div>
            </div>

            {/* 우측: 캐릭터 선택 패널 */}
            <div className="character-picker glass-panel">
              <h3 className="picker-title">캐릭터 선택</h3>
              
              <div className="picker-preview">
                <span className="preview-icon">{selectedCharacter.icon}</span>
                <span className="preview-name">{selectedCharacter.name}</span>
                <span className="preview-desc">{selectedCharacter.desc}</span>
              </div>

              <div className="picker-grid">
                {CHARACTERS.map(char => (
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

      {/* 방 만들기 모달 */}
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
              >방 만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
