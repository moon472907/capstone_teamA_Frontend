import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import BoardScene from './scenes/BoardScene.js';

export default function PhaserGame({ onGameReady }) {
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!gameRef.current) {
      const config = {
        type: Phaser.AUTO,
        width: 900,
        height: 760,
        backgroundColor: '#85CDEE',
        parent: containerRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [PreloadScene, MenuScene, BoardScene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // BoardScene.create()에서 emit하는 준비 완료 이벤트 → game 인스턴스를 React로 전달
      game.events.once('boardReady', () => {
        onGameReady?.(game);
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} id="phaser-game-container" />;
}
