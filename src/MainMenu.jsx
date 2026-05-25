import React from 'react';
import './MainMenu.css';

function MainMenu({ onStartGame, isSoundOn, onToggleSound }) {

  // 반짝이는 별 데이터 생성
  const stars = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    top: `${5 + Math.random() * 35}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${1.5 + Math.random() * 2}s`,
  }));

  return (
    <div className="main-menu-container">
      {/* 배경 (하늘+풀밭 그라데이션) */}
      <div className="bg-placeholder"></div>

      {/* 배경 장식: 구름 */}
      <span className="menu-cloud" aria-hidden="true">☁️</span>
      <span className="menu-cloud" aria-hidden="true">☁️</span>
      <span className="menu-cloud" aria-hidden="true">⛅</span>

      {/* 배경 장식: 반짝이는 별 */}
      {stars.map(star => (
        <div
          key={star.id}
          className="menu-star"
          aria-hidden="true"
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}

      {/* 사운드 토글 */}
      <div
        className="settings-btn-top-right"
        title={isSoundOn ? '소리 끄기' : '소리 켜기'}
        onClick={onToggleSound}
        role="button"
        tabIndex={0}
        id="sound-toggle"
      >
        {isSoundOn ? '🔊' : '🔇'}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="menu-content">
        <h1 className="game-title" id="game-title">
          <span className="title-text">강대</span>
          <span className="title-text">마블</span>
        </h1>

        <div className="button-group">
          <button className="btn-main" onClick={onStartGame} id="start-game-btn">
            게임 시작
          </button>

          <div className="sub-buttons">
            <button className="glass-btn" id="how-to-play-btn">📖 게임 방법</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
