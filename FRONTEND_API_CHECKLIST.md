# 강대마블 프론트엔드 API 연동 체크리스트

> 기준 문서: API_SPEC.md  
> Base URL (개발): `http://localhost:8080`  
> 최종 업데이트: 2026-05-19

---

## 연동 현황 범례

| 기호 | 의미 |
|------|------|
| ⬜ | 미연동 (구현 필요) |
| 🟡 | 로컬/더미 데이터로 임시 처리 중 |
| ✅ | 연동 완료 |

---

## 1. 회원 API

| 기호 | 메서드 | 엔드포인트 | 담당 컴포넌트 | 비고 |
|------|--------|-----------|---------------|------|
| ⬜ | POST | `/api/v1/members/signup` | `MainMenu.jsx` (신규) | 회원가입 화면 구현 필요 |
| ⬜ | POST | `/api/v1/members/login` | `MainMenu.jsx` | accessToken 쿠키 수신 후 `App.jsx`의 `accessToken` 상태에 저장 |
| ⬜ | DELETE | `/api/v1/members/logout` | `MainMenu.jsx` | 로그아웃 버튼 |
| ⬜ | GET | `/api/v1/members/me` | `Lobby.jsx` | 현재 로그인 유저 닉네임 표시 |

**axios 공통 설정** — `src/services/api.js`에 적용 완료
```javascript
axios.defaults.withCredentials = true;
```

---

## 2. 캐릭터 API

| 기호 | 메서드 | 엔드포인트 | 담당 컴포넌트 | 비고 |
|------|--------|-----------|---------------|------|
| 🟡 | GET | `/api/v1/characters` | `Lobby.jsx` | 현재 `src/App.jsx`에 하드코딩 → 서버 데이터로 교체 |

**현재 하드코딩 위치:** `src/App.jsx` — `CHARACTERS` 배열  
**교체 방향:** `Lobby.jsx` 마운트 시 API 호출 후 상태로 관리

---

## 3. 게임 API

### 3-1. 로비 관련

| 기호 | 메서드 | 엔드포인트 | 담당 컴포넌트 | 비고 |
|------|--------|-----------|---------------|------|
| 🟡 | GET | `/api/v1/games` | `Lobby.jsx` | 현재 더미 방 목록 → 실제 `WAITING` 상태 방 조회 |
| 🟡 | POST | `/api/v1/games` | `Lobby.jsx` | 현재 로컬 mock → 실제 방 생성, 반환된 `gameId`를 `App.jsx`로 전달 |
| 🟡 | POST | `/api/v1/games/{gameId}/join` | `Lobby.jsx` | 현재 로컬 mock → 실제 입장, 반환된 `playerId`를 `App.jsx`로 전달 |
| ⬜ | POST | `/api/v1/games/{gameId}/leave` | `Lobby.jsx` | 방 나가기 버튼 |
| ⬜ | POST | `/api/v1/games/{gameId}/ready` | `Lobby.jsx` | 준비 버튼 (토글) |
| ⬜ | POST | `/api/v1/games/{gameId}/start` | `Lobby.jsx` | 방장 전용, 4명 전원 레디 후 활성화 |

> **Lobby → App 데이터 전달 방법**
> `App.jsx`의 `handleJoinRoom({ gameId, playerId })` 를 통해 전달합니다.
> ```javascript
> // Lobby.jsx 내부 (방 입장 성공 시)
> onJoinRoom({ gameId: 응답.gameId, playerId: 응답.playerId });
> ```

### 3-2. 게임 진행 관련

| 기호 | 메서드 | 엔드포인트 | 담당 컴포넌트 | 구현 위치 | 비고 |
|------|--------|-----------|---------------|-----------|------|
| ✅ | POST | `/api/v1/games/{gameId}/roll` | `GameScreen.jsx` | `src/services/api.js` | `rollDice(gameId)` |
| ✅ | POST | `/api/v1/games/{gameId}/branch` | `GameScreen.jsx` | `src/services/api.js` | `selectBranch(gameId, tileId)` |
| ✅ | GET | `/api/v1/games/{gameId}/state` | `GameScreen.jsx` | `src/services/api.js` | WebSocket 연결 후 재접속 복원 |

---

## 4. WebSocket

### 연결 설정 — ✅ 구현 완료 (`src/services/websocket.js`)

```javascript
import { createGameSocket } from './services/websocket';

// GameScreen.jsx useEffect 내부
const client = createGameSocket({
  gameId,
  accessToken,
  onEvent: (type, payload) => { /* 이벤트 분기 처리 */ },
  onConnected: () => { /* 재접속 시 GET /state 호출 */ }
});
return () => client.deactivate();
```

### 이벤트별 처리 현황

| 기호 | 이벤트 | 처리 위치 | 동작 |
|------|--------|-----------|------|
| ⬜ | `PLAYER_JOINED` | `Lobby.jsx` | 대기실 플레이어 슬롯 실시간 업데이트 |
| ⬜ | `PLAYER_LEFT` | `Lobby.jsx` | 슬롯 제거, 방장 위임 표시 |
| ⬜ | `PLAYER_READY` | `Lobby.jsx` | 레디 현황 표시, 4명 완료 시 시작 버튼 활성화 |
| ⬜ | `GAME_STARTED` | `App.jsx` | 로비 → 게임 화면 전환 트리거 |
| ✅ | `TURN_CHANGED` | `GameScreen.jsx` | 턴 플레이어 동기화, 턴 알림 표시 |
| ✅ | `DICE_ROLLED` | `GameScreen.jsx` → `BoardScene.showDiceAnimation()` | 타 플레이어 주사위 연출 |
| ✅ | `PLAYER_MOVED` | `GameScreen.jsx` → `BoardScene.movePlayerToNode()` | 타 플레이어 말 이동 |
| ✅ | `BRANCH_REQUIRED` | `GameScreen.jsx` | 분기 선택 UI 표시 |
| ✅ | `TILE_TRIGGERED` | `GameScreen.jsx` | 코인 변경 + 이벤트 설명 알림 (3초 자동 소멸) |
| ✅ | `GAME_ENDED` | `GameScreen.jsx` | 순위 결과 오버레이 표시 |

---

## 5. tileId ↔ 노드 이름 변환 — ✅ 구현 완료

> `src/services/api.js`에 유틸 함수 포함

```javascript
import { toNodeId, toTileId } from './services/api';

toNodeId(14)       // → "node14"
toTileId("node14") // → 14
```

**⚠️ 서버 팀 확인 필요:** `tileId`(정수)가 Tiled JSON 노드 번호(`node14` → 14)와 1:1 매핑인지 검증.

---

## 6. 신규 생성 파일 목록

| 파일 | 역할 |
|------|------|
| `src/services/api.js` | axios 기반 REST API 함수 모음 |
| `src/services/websocket.js` | STOMP/SockJS WebSocket 연결 매니저 |

---

## 7. 구현 우선순위

### Phase 1 — 로비 연동 ⬜ 미완
1. 로그인 / 회원가입 (`MainMenu.jsx`)
2. 캐릭터 목록 API 연동 (`Lobby.jsx`)
3. 방 목록 / 방 생성 / 방 입장 (`Lobby.jsx`)
4. WebSocket 로비 이벤트 처리 (`PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_READY`)
5. 레디 / 게임 시작 + `GAME_STARTED` 이벤트로 화면 전환

### Phase 2 — 게임 플레이 연동 ✅ 완료
6. 주사위 굴리기 API (`POST /roll`)
7. 분기점 선택 API (`POST /branch`)
8. WebSocket 게임 이벤트 처리 (`TURN_CHANGED`, `PLAYER_MOVED`, `TILE_TRIGGERED` 등)
9. 게임 종료 결과 화면 (`GAME_ENDED`)
10. 재접속 복원 (`GET /state`)

### Phase 3 — 안정화 ⬜ 미완
11. 타임아웃 UI (턴 30초, 분기 20초 카운트다운)
12. 에러 코드별 사용자 안내 메시지 (GAME-400, GAME-403 등)
