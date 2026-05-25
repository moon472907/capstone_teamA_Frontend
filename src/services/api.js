import axios from 'axios';
import { getToken } from '../api';

// 공백이 끼어도 안전하도록 trim. 미설정 시 상대경로('') → dev는 Vite 프록시, 배포는 Vercel rewrite 사용
const BASE_URL = (import.meta.env.VITE_API_URL || '').trim();

// 모든 요청에 쿠키 포함 (accessToken 쿠키 자동 전송)
axios.defaults.withCredentials = true;

// 로그인 시 저장한 accessToken을 Authorization 헤더로 첨부 (백엔드는 Bearer 우선 인식)
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── tileId ↔ Phaser nodeId 변환 ──────────────────────────────
// 서버: tileId (정수) ↔ Phaser: "node14" 형태 문자열
export const toNodeId  = (tileId)  => `node${tileId}`;
export const toTileId  = (nodeId)  => parseInt(nodeId.replace('node', ''), 10);

// ── 게임 API ─────────────────────────────────────────────────

/**
 * 주사위 굴리기
 * POST /api/v1/games/{gameId}/roll
 * @returns {{ diceValue, toTileId, nextState, branchOptions, coinsChange, tileEventDescription, gameEnded }}
 */
export async function rollDice(gameId) {
  const res = await axios.post(`${BASE_URL}/api/v1/games/${gameId}/roll`);
  return res.data.content;
}

/**
 * 분기점 선택
 * POST /api/v1/games/{gameId}/branch
 * @param {number} selectedTileId - 선택한 분기 tileId
 * @returns {{ toTileId, nextState, branchOptions, coinsChange, tileEventDescription, gameEnded }}
 */
export async function selectBranch(gameId, selectedTileId) {
  const res = await axios.post(`${BASE_URL}/api/v1/games/${gameId}/branch`, {
    selectedNodeId: selectedTileId
  });
  return res.data.content;
}

/**
 * 공격 카드 대상 지정 (현재 플레이어)
 * POST /api/v1/games/{gameId}/card/target
 * @param {number} targetPlayerId
 */
export async function selectCardTarget(gameId, targetPlayerId) {
  const res = await axios.post(`${BASE_URL}/api/v1/games/${gameId}/card/target`, {
    targetPlayerId
  });
  return res.data.content;
}

/**
 * 방어 카드 사용 여부 선택 (피격 대상)
 * POST /api/v1/games/{gameId}/card/defense
 * @param {boolean} useDefense
 */
export async function resolveDefense(gameId, useDefense) {
  const res = await axios.post(`${BASE_URL}/api/v1/games/${gameId}/card/defense`, {
    useDefense
  });
  return res.data.content;
}

/**
 * 두리버스 도착 정류장 선택 (현재 플레이어)
 * POST /api/v1/games/{gameId}/bus
 * @param {number} destinationTileId - 도착 정류장 nodeNumber (1~53)
 */
export async function selectBusDestination(gameId, destinationTileId) {
  const res = await axios.post(`${BASE_URL}/api/v1/games/${gameId}/bus`, {
    destinationTileId
  });
  return res.data.content;
}

/**
 * 게임 상태 조회 (재접속용)
 * GET /api/v1/games/{gameId}/state
 */
export async function getGameState(gameId) {
  const res = await axios.get(`${BASE_URL}/api/v1/games/${gameId}/state`);
  return res.data.content;
}
