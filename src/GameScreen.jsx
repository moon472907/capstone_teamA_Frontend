import React, { useState, useEffect, useRef } from 'react';

const OTHER_PLAYERS = [
  { id: 2, name: '나래(플레이어2)', color: '#FF8C00', icon: '🕊️', gpa: 60 },
  { id: 3, name: '강대생A', color: '#005BAC', icon: '🎓', gpa: 30 },
  { id: 4, name: '강대생B', color: '#48BB78', icon: '☘️', gpa: 75 },
];

function GameScreen({ onGoBack, selectedCharacter }) {
  const [turn, setTurn] = useState(1);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [nextPlayerName, setNextPlayerName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const settingsRef = useRef(null);

  const PLAYERS = [
    { id: 1, name: selectedCharacter?.name || '나(플레이어1)', color: '#85CDEE', icon: selectedCharacter?.icon || '🐻‍❄️', gpa: 45 },
    ...OTHER_PLAYERS
  ];

  // 드롭다운 바깥 클릭 시 닫기 (UX 개선 #7)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const rollDice = () => {
    if (isRolling || showNotification) return;

    setIsRolling(true);
    
    setTimeout(() => {
      setIsRolling(false);
      handleTurnEnd();
    }, 1500);
  };

  const handleTurnEnd = () => {
    const nextIdx = (currentPlayerIdx + 1) % 4;
    setNextPlayerName(PLAYERS[nextIdx].name);
    setShowNotification(true);

    setTimeout(() => {
      setShowNotification(false);
      setCurrentPlayerIdx(nextIdx);
      if (nextIdx === 0) {
        setTurn(prev => Math.min(prev + 1, 8));
      }
    }, 2000);
  };

  return (
    <div className="game-container">
      {/* 좌측 상단 미니 타이틀 */}
      <div className="in-game-title-container">
        <h1 className="in-game-title">
          <span className="title-text">강대</span>
          <span className="title-text">마블</span>
        </h1>
      </div>

      <div className="top-info" ref={settingsRef}>
        <div style={{ position: 'relative' }}>
          <button className="settings-btn" title="설정" onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
          
          {showSettings && (
            <div className="settings-dropdown">
              <button className="settings-item" onClick={() => setIsSoundOn(!isSoundOn)}>
                {isSoundOn ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'}
              </button>
              <button className="settings-item exit-btn" onClick={() => {
                setShowExitPopup(true);
                setShowSettings(false);
              }}>
                🚪 메인 메뉴로
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="board-wrapper">
        <div className="board-area">
          <div className="board-placeholder">
            <span className="board-placeholder-title">전체 화면 강원대 맵 (Phaser)</span>
            <span className="board-placeholder-desc">UI 뒤로 맵이 넓게 깔립니다</span>
          </div>
        </div>
      </div>

      <div className="dice-container">
        <button 
          className="dice-button" 
          onClick={rollDice}
          disabled={isRolling || showNotification}
        >
          {isRolling ? '🎲' : '주사위 굴리기'}
        </button>
      </div>

      <div className="turn-badge">
        턴 {turn} / 8
      </div>

      <div className="players-dock">
        {PLAYERS.map((player, idx) => (
          <div 
            key={player.id} 
            className={`player-badge ${idx === currentPlayerIdx ? 'active' : ''}`}
          >
            <div className="badge-icon" style={{ backgroundColor: player.color }}>
              {player.icon}
            </div>
            <div className="badge-info">
              <span className="badge-name">{player.name}</span>
              <div className="badge-stats">
                <span className="badge-gpa">학점: {player.gpa}점</span>
                <span className="badge-card" title="방어 카드">🛡️</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNotification && (
        <div className="turn-overlay">
          <div className="turn-alert">
            <p style={{ margin: 0, fontSize: '1.2rem', color: '#718096' }}>다음 차례는</p>
            <h2>{nextPlayerName}!</h2>
          </div>
        </div>
      )}

      {showExitPopup && (
        <div className="exit-overlay fade-in">
          <div className="exit-popup pop-in">
            <h2>정말 나가시겠습니까?</h2>
            <p>진행 중인 게임 데이터가 모두 사라집니다.</p>
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
