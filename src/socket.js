import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from './api';

/**
 * 게임 토픽(/topic/game/{gameId})에 연결하는 STOMP 클라이언트를 생성한다.
 *
 * handlers:
 *   onMessage(body) - 서버 GameMessage 수신 ({ type, gameId, payload, timestamp })
 *   onConnect()     - 연결 + 구독 완료
 *   onError(err)    - STOMP/WebSocket 에러
 *
 * 반환된 client는 사용 종료 시 client.deactivate() 호출.
 */
export function createGameSocket(gameId, handlers = {}) {
  const token = getToken();

  const client = new Client({
    webSocketFactory: () => new SockJS('/ws'),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe(`/topic/game/${gameId}`, (message) => {
        try {
          handlers.onMessage?.(JSON.parse(message.body));
        } catch (e) {
          console.error('STOMP 메시지 파싱 실패', e, message.body);
        }
      });
      handlers.onConnect?.();
    },
    onStompError: (frame) => {
      console.error('STOMP 에러', frame.headers?.message, frame.body);
      handlers.onError?.(frame);
    },
    onWebSocketError: (e) => {
      console.error('WebSocket 에러', e);
      handlers.onError?.(e);
    },
  });

  client.activate();
  return client;
}
