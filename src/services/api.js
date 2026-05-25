import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// 모든 요청에 쿠키 포함 (accessToken 쿠키 자동 전송)
axios.defaults.withCredentials = true;

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
  return res.data.data;
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
  return res.data.data;
}

/**
 * 게임 상태 조회 (재접속용)
 * GET /api/v1/games/{gameId}/state
 */
export async function getGameState(gameId) {
  const res = await axios.get(`${BASE_URL}/api/v1/games/${gameId}/state`);
  return res.data.data;
}
