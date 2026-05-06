import { useState } from 'react';
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
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);

  return (
    <>
      {currentScreen === 'menu' && (
        <MainMenu onStartGame={() => setCurrentScreen('lobby')} />
      )}
      {currentScreen === 'lobby' && (
        <Lobby 
          onJoinRoom={() => setCurrentScreen('game')} 
          onGoBack={() => setCurrentScreen('menu')} 
          selectedCharacter={selectedCharacter}
          setSelectedCharacter={setSelectedCharacter}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen 
          onGoBack={() => setCurrentScreen('menu')} 
          selectedCharacter={selectedCharacter}
        />
      )}
    </>
  );
}

export default App;