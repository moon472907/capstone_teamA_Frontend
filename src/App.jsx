import { useState, useRef, useEffect } from 'react';
import './index.css';
import MainMenu from './MainMenu';
import Lobby from './Lobby';
import GameScreen from './GameScreen';
import LoginScreen from './LoginScreen';
import { api } from './api';

export const CHARACTERS = [
  { id: 'gomduri', name: '곰두리', icon: '🐻‍❄️', desc: '강원대 대표 마스코트' },
  { id: 'narae', name: '나래', icon: '🕊️', desc: '하늘을 나는 비둘기' },
  { id: 'daramji', name: '다람쥐', icon: '🐿️', desc: '캠퍼스 다람쥐' },
  { id: 'bunny', name: '토끼', icon: '🐰', desc: '춘천 옥토끼' },
  { id: 'fox', name: '여우', icon: '🦊', desc: '영리한 산여우' },
  { id: 'cat', name: '고양이', icon: '🐱', desc: '캠퍼스 길고양이' },
];

function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);
  const [user, setUser] = useState(null);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // BGM 통합 관리
  const [isSoundOn, setIsSoundOn] = useState(true);
  const audioRef = useRef(null);

  // 로그인 상태 확인
  useEffect(() => {
    api.me()
      .then((userData) => {
        setUser(userData);
        setCurrentScreen('menu');
      })
      .catch(() => {
        setCurrentScreen('login');
      });
  }, []);

  // BGM 재생/중지
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/audio/Pou music ost - Food Drop.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    if (isSoundOn) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isSoundOn]);

  // 화면 전환 시 BGM 재개 시도 (브라우저 autoplay 정책 대응)
  useEffect(() => {
    if (isSoundOn && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentScreen('menu');
  };

  const handleJoinRoom = ({ gameId: gId, playerId: pId } = {}) => {
    if (gId) setCurrentGameId(gId);
    if (pId) setPlayerId(pId);
    setCurrentScreen('game');
  };

  if (currentScreen === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontSize: '1.2rem',
      }}>
        로딩 중...
      </div>
    );
  }

  return (
    <>
      {currentScreen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}
      {currentScreen === 'menu' && (
        <MainMenu
          onStartGame={() => setCurrentScreen('lobby')}
          onLogout={async () => {
            await api.logout().catch(() => {});
            setUser(null);
            setCurrentScreen('login');
          }}
          user={user}
          isSoundOn={isSoundOn}
          onToggleSound={() => setIsSoundOn(v => !v)}
        />
      )}
      {currentScreen === 'lobby' && (
        <Lobby
          onJoinRoom={handleJoinRoom}
          onGoBack={() => setCurrentScreen('menu')}
          selectedCharacter={selectedCharacter}
          setSelectedCharacter={setSelectedCharacter}
          user={user}
          onTokenReceived={setAccessToken}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen
          onGoBack={() => setCurrentScreen('menu')}
          selectedCharacter={selectedCharacter}
          gameId={currentGameId}
          playerId={playerId}
          user={user}
          accessToken={accessToken}
          isSoundOn={isSoundOn}
          onToggleSound={() => setIsSoundOn(v => !v)}
        />
      )}
    </>
  );
}

export default App;
