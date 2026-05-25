import { useState, useRef, useEffect } from 'react';
import './index.css';
import MainMenu from './MainMenu';
import Lobby from './Lobby';
import GameScreen from './GameScreen';

export const CHARACTERS = [
  { id: 'gomduri', name: '곰두리', icon: '🐻‍❄️', desc: '강원대 대표 마스코트' },
  { id: 'narae', name: '나래', icon: '🕊️', desc: '하늘을 나는 비둘기' },
  { id: 'daramji', name: '다람쥐', icon: '🐿️', desc: '캠퍼스 다람쥐' },
  { id: 'bunny', name: '토끼', icon: '🐰', desc: '춘천 옥토끼' },
  { id: 'fox', name: '여우', icon: '🦊', desc: '영리한 산여우' },
  { id: 'cat', name: '고양이', icon: '🐱', desc: '캠퍼스 길고양이' },
];

function App() {
  // 화면 라우팅 상태: 'menu', 'lobby', 'game'
  const [currentScreen,    setCurrentScreen]    = useState('menu');
  const [selectedCharacter,setSelectedCharacter] = useState(CHARACTERS[0]);

  // 서버 연동 정보 (로비에서 방 생성/입장 후 저장)
  const [gameId,      setGameId]      = useState(null);  // 게임 방 ID
  const [playerId,    setPlayerId]    = useState(null);  // 현재 플레이어 ID
  const [accessToken, setAccessToken] = useState(null);  // JWT 토큰 (로그인 후 설정)

  // BGM 통합 관리
  const [isSoundOn, setIsSoundOn] = useState(true);
  const audioRef = useRef(null);

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

  // 게임 시작: 로비 → 게임 화면 (gameId, playerId 전달)
  const handleJoinRoom = ({ gameId: gId, playerId: pId } = {}) => {
    if (gId) setGameId(gId);
    if (pId) setPlayerId(pId);
    setCurrentScreen('game');
  };

  return (
    <>
      {currentScreen === 'menu' && (
        <MainMenu
          onStartGame={() => setCurrentScreen('lobby')}
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
          onTokenReceived={setAccessToken}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen
          onGoBack={() => setCurrentScreen('menu')}
          selectedCharacter={selectedCharacter}
          gameId={gameId}
          playerId={playerId}
          accessToken={accessToken}
          isSoundOn={isSoundOn}
          onToggleSound={() => setIsSoundOn(v => !v)}
        />
      )}
    </>
  );
}

export default App;