import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import BoardScene from './scenes/BoardScene.js';
// MiniGameScene if needed

export default function PhaserGame({ selectedCharacter, onGameReady, onRequireBranchChoice, onMoveDone }) {
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!gameRef.current) {
      const config = {
        type: Phaser.AUTO,
        width: 900,
        height: 760,
        backgroundColor: "#85CDEE",
        parent: containerRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [PreloadScene, MenuScene, BoardScene]
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // 게임 레디 상태와 브릿지 이벤트 등록
      game.events.on('ready', () => {
        // BoardScene 인스턴스를 가져오기 위해 약간의 지연(Preload, Menu 씬 대기)이 필요할 수 있지만
        // 여기서는 이벤트 버스로서 game.events를 사용합니다.
        if (onGameReady) {
          onGameReady(game);
        }

        // Phaser에서 발생하는 커스텀 이벤트들 수신
        game.events.on('requireBranchChoice', (opts, fromId) => {
          if (onRequireBranchChoice) onRequireBranchChoice(opts, fromId);
        });

        game.events.on('moveDone', (data) => {
          if (onMoveDone) onMoveDone(data);
        });
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // onGameReady 등은 의존성 배열에서 제외하여 리렌더링 시 재생성 방지

  return <div ref={containerRef} id="phaser-game-container" />;
}
