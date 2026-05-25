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
const API_BASE = import.meta.env.VITE_API_URL || '';

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

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || '요청 실패');
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
