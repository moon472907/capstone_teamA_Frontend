import { useState, useEffect } from 'react';
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

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentScreen('menu');
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
        />
      )}
      {currentScreen === 'lobby' && (
        <Lobby
          onJoinRoom={(gameId) => {
            setCurrentGameId(gameId);
            setCurrentScreen('game');
          }}
          onGoBack={() => setCurrentScreen('menu')}
          selectedCharacter={selectedCharacter}
          setSelectedCharacter={setSelectedCharacter}
          user={user}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen
          onGoBack={() => setCurrentScreen('menu')}
          gameId={currentGameId}
          user={user}
        />
      )}
    </>
  );
}

export default App;
