const TOKEN_KEY = 'accessToken';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// 개발(Vite 프록시): 빈 문자열 → 상대경로 사용
// 운영(Vercel): VITE_API_URL = https://api.everyknu.cloud
const API_BASE = (import.meta.env.VITE_API_URL || '').trim();

async function request(method, path, body) {
  const token = getToken();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 1. 응답 바디를 안전하게 텍스트로 먼저 받아옴
  const text = await res.text();
  let json = {};
  
  try {
    if (text) {
      json = JSON.parse(text);
    }
  } catch (err) {
    // 백엔드 오류 등으로 HTML(502 Bad Gateway 등)이나 빈 응답이 돌아온 경우 예외 처리
    if (!res.ok) {
      throw new Error(`서버 요청 실패 (HTTP 상태 코드: ${res.status})`);
    }
    throw new Error('서버 응답 형식이 올바르지 않습니다.');
  }

  if (!res.ok) {
    throw new Error(json.message || `요청 실패 (HTTP 상태 코드: ${res.status})`);
  }
  
  return json.content;
}

export const api = {
  // 회원
  signup: (email, password, name) =>
    request('POST', '/api/v1/members/signup', { email, password, name }),

  login: async (email, password) => {
    const data = await request('POST', '/api/v1/members/login', { email, password });
    setToken(data.accessToken);
    return data.item;
  },

  logout: () => {
    setToken(null);
    return request('DELETE', '/api/v1/members/logout');
  },

  me: () => request('GET', '/api/v1/members/me'),

  // 게임
  listGames: () => request('GET', '/api/v1/games'),

  getGame: (gameId) => request('GET', `/api/v1/games/${gameId}`),

  createGame: (payload) => request('POST', '/api/v1/games', payload),

  joinGame: (gameId, payload) =>
    request('POST', `/api/v1/games/${gameId}/join`, payload),

  leaveGame: (gameId) => request('POST', `/api/v1/games/${gameId}/leave`),

  ready: (gameId) => request('POST', `/api/v1/games/${gameId}/ready`),

  startGame: (gameId) => request('POST', `/api/v1/games/${gameId}/start`),

  getGameState: (gameId) => request('GET', `/api/v1/games/${gameId}/state`),

  rollDice: (gameId) => request('POST', `/api/v1/games/${gameId}/roll`),

  selectBranch: (gameId, selectedNodeId) =>
    request('POST', `/api/v1/games/${gameId}/branch`, { selectedNodeId }),

  // 보드
  listWorlds: () => request('GET', '/api/v1/worlds'),
  getWorld: (worldId) => request('GET', `/api/v1/worlds/${worldId}`),
};
