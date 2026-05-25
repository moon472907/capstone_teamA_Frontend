import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from '../api';

const BASE_URL = (import.meta.env.VITE_API_URL || '').trim();

/**
 * 게임 WebSocket 연결 생성
 *
 * @param {object} config
 * @param {number}   config.gameId        - 구독할 게임 ID
 * @param {string}   config.accessToken   - JWT 토큰
 * @param {function} config.onEvent       - (type, payload) => void
 * @param {function} [config.onConnected] - 연결 완료 콜백
 * @param {function} [config.onError]     - 에러 콜백
 * @returns {Client} - client.deactivate() 로 연결 해제
 */
export function createGameSocket({ gameId, accessToken, onEvent, onConnected, onError }) {
  const token = accessToken || getToken();
  const client = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),

    connectHeaders: {
      Authorization: `Bearer ${token}`
    },

    onConnect: () => {
      client.subscribe(`/topic/game/${gameId}`, (msg) => {
        try {
          const { type, payload } = JSON.parse(msg.body);
          onEvent(type, payload);
        } catch (e) {
          console.error('[WS] 메시지 파싱 오류:', e);
        }
      });

      if (onConnected) onConnected();
    },

    onStompError: (frame) => {
      console.error('[WS] STOMP 에러:', frame.headers['message']);
      if (onError) onError(frame);
    },

    onDisconnect: () => {
      console.log('[WS] 연결 종료');
    },

    // 연결 끊겼을 때 5초 후 재연결
    reconnectDelay: 5000
  });

  client.activate();
  return client;
}

// ── WebSocket 이벤트 타입 상수 ─────────────────────────────────
export const WS_EVENTS = {
  PLAYER_JOINED:    'PLAYER_JOINED',
  PLAYER_LEFT:      'PLAYER_LEFT',
  PLAYER_READY:     'PLAYER_READY',
  GAME_STARTED:     'GAME_STARTED',
  TURN_CHANGED:     'TURN_CHANGED',
  DICE_ROLLED:          'DICE_ROLLED',
  PLAYER_MOVED:         'PLAYER_MOVED',
  BRANCH_REQUIRED:      'BRANCH_REQUIRED',
  TILE_TRIGGERED:       'TILE_TRIGGERED',
  CARD_DRAWN:           'CARD_DRAWN',
  CARD_TARGET_REQUIRED: 'CARD_TARGET_REQUIRED',
  DEFENSE_PROMPT:       'DEFENSE_PROMPT',
  BUS_RIDE_REQUIRED:    'BUS_RIDE_REQUIRED',
  TURN_SKIPPED:         'TURN_SKIPPED',
  GAME_ENDED:           'GAME_ENDED'
};
