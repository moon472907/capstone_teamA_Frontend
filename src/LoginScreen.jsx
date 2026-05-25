import { useState } from 'react';
import { api } from './api';
import './LoginScreen.css';
import './MainMenu.css'; // 메인메뉴의 타이틀, 구름, 별 스타일 재사용

function LoginScreen({ onLogin, isSoundOn, onToggleSound }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 반짝이는 별 데이터 생성 (메인메뉴와 동일하게 적용하여 자연스러운 화면 연결)
  const stars = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    top: `${5 + Math.random() * 35}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${1.5 + Math.random() * 2}s`,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('닉네임을 입력해 주세요.');
        }
        await api.signup(email, password, name.trim());
      }
      const user = await api.login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || '요청 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* 배경 장식: 구름 (메인메뉴와 일관성 제공) */}
      <span className="menu-cloud" aria-hidden="true" style={{ top: '8%' }}>☁️</span>
      <span className="menu-cloud" aria-hidden="true" style={{ top: '22%' }}>☁️</span>
      <span className="menu-cloud" aria-hidden="true" style={{ top: '4%' }}>⛅</span>

      {/* 배경 장식: 반짝이는 별 */}
      {stars.map((star) => (
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

      {/* 사운드 토글 (메인메뉴와 완벽히 동일하게 동작) */}
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

      {/* 메인 로그인 카드 구역 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', zIndex: 10 }}>
        {/* 강대마블 시그니처 3D 타이틀 (살짝 작게 스케일 조절) */}
        <h1 className="game-title" style={{ transform: 'scale(0.7)', margin: '-20px 0' }}>
          <span className="title-text">강대</span>
          <span className="title-text">마블</span>
        </h1>

        <div className="login-card">
          {/* 로그인 / 회원가입 탭 */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`login-tab-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              회원가입
            </button>
          </div>

          {/* 폼 입력 영역 */}
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'signup' && (
              <div className="login-input-group">
                <label className="login-input-label">닉네임</label>
                <input
                  type="text"
                  placeholder="보드게임에 쓸 닉네임"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="login-input"
                  maxLength={10}
                />
              </div>
            )}

            <div className="login-input-group">
              <label className="login-input-label">이메일 주소</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div className="login-input-group">
              <label className="login-input-label">비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? '처리 중...' : mode === 'login' ? '강대마블 로그인' : '강대마블 회원가입'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
