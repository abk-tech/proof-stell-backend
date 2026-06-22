# Real-Time WebSocket Gateway

> Auth model and security controls: [ARCHITECTURE.md](../../ARCHITECTURE.md) · [SECURITY_CHECKLIST.md](../../SECURITY_CHECKLIST.md)

**Namespace:** `/realtime`  
**Transport:** Socket.IO (ws / wss)  
**Auth:** Pass a valid JWT as `auth.token` in the Socket.IO handshake options. The gateway validates the token on every connection using `JwtWsGuard`.

---

## Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `leaderboard:update` | `{ leaderboardId: string, scores: LeaderboardEntry[] }` | Emitted after a score submission invalidates the cached ranking. |
| `game:state-change` | `{ gameId: string, state: 'started' \| 'paused' \| 'ended' }` | Emitted when game state changes. |
| `notification:alert` | `{ message: string, type: string }` | In-app notification broadcast to the connected user's room. |

---

## Client → Server Messages

| Message | Payload | Description |
|---|---|---|
| `leaderboard:subscribe` | `{ leaderboardId: string }` | Join a leaderboard room to receive `leaderboard:update` events. |
| `game:subscribe` | `{ gameId: string }` | Join a game room to receive `game:state-change` events. |

---

## Sample Client

```js
import { io } from "socket.io-client";

const socket = io("wss://api.proof-stell.example/realtime", {
  auth: { token: "YOUR_JWT_ACCESS_TOKEN" },
});

socket.emit("leaderboard:subscribe", { leaderboardId: "global" });
socket.on("leaderboard:update", (data) => console.log(data));

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message); // e.g. "Unauthorized"
});
```

---

## Emitting Events from Services

Inject `RealtimeGateway` and call the typed emit helpers:

```ts
constructor(private readonly gateway: RealtimeGateway) {}

this.gateway.emitLeaderboardUpdate(leaderboardId, scores);
this.gateway.emitGameStateChange(gameId, "ended");
```

Do **not** construct event name strings inline — use the constants defined in the gateway to keep names in sync with this document.
