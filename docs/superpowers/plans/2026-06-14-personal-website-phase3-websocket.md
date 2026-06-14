# WebSocket 基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 WebSocket 基础设施（连接管理 + 在线人数 + 通知广播通道）

**Architecture:** FastAPI WebSocket + JWT query-auth + Redis Set 在线集合 + Redis Pub/Sub 广播 + Nginx upgrade 代理

**Tech Stack:** FastAPI (websockets), Redis, React 18, Vite, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-06-14-personal-website-phase3-websocket-design.md`

---

## File Structure

```
New files:
backend/app/
├── api/ws.py                  # WebSocket 路由 + 连接管理
├── services/ws_service.py     # Redis 在线集合 + 广播函数

frontend/src/
├── hooks/useWebSocket.ts      # WebSocket 连接 + 自动重连

Modified files:
backend/app/main.py             # 注册 WS 路由
nginx/nginx.conf                # 新增 /ws location
frontend/src/components/Footer.tsx  # 显示在线人数
```

---

### Task 1: WebSocket Service (Redis online set + broadcast)

**Files:**
- Create: `backend/app/services/ws_service.py`

- [ ] **Step 1: Create ws_service.py**

```python
import json
from datetime import datetime, timezone
from redis.asyncio import Redis

ONLINE_SET = "online_users"
NOTIFICATION_CHANNEL = "notifications"


async def add_online_user(redis: Redis, user_id: str) -> None:
    await redis.sadd(ONLINE_SET, user_id)


async def remove_online_user(redis: Redis, user_id: str) -> None:
    await redis.srem(ONLINE_SET, user_id)


async def get_online_count(redis: Redis) -> int:
    return await redis.scard(ONLINE_SET)


async def broadcast_notification(redis: Redis, title: str, body: str) -> None:
    message = json.dumps({
        "type": "notification",
        "title": title,
        "body": body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await redis.publish(NOTIFICATION_CHANNEL, message)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/ws_service.py
git commit -m "feat: add WebSocket service (Redis online set + broadcast)"
```

---

### Task 2: WebSocket API Route (JWT auth + connection lifecycle)

**Files:**
- Create: `backend/app/api/ws.py`

- [ ] **Step 1: Create ws.py**

```python
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.database import get_redis
from app.services.auth_service import decode_token
from app.services.ws_service import (
    add_online_user, remove_online_user, get_online_count,
    NOTIFICATION_CHANNEL,
)

router = APIRouter()
# Track active connections: user_id -> websocket
_connections: dict[str, WebSocket] = {}


async def _broadcast_online_count(redis, ws: WebSocket):
    count = await get_online_count(redis)
    try:
        await ws.send_json({"type": "online_count", "count": count})
    except Exception:
        pass


async def _broadcast_to_all(redis, message: str):
    for ws in list(_connections.values()):
        try:
            await ws.send_text(message)
        except Exception:
            pass


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str):
    # Auth
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await ws.close(code=4001, reason="Invalid token type")
            return
        user_id = payload.get("sub")
        if not user_id:
            await ws.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await ws.close(code=4001, reason="Authentication failed")
        return

    await ws.accept()
    redis = await get_redis()

    # Register user
    await add_online_user(redis, user_id)
    _connections[user_id] = ws
    await _broadcast_online_count(redis, ws)

    # Subscribe to notifications
    pubsub = redis.pubsub()
    await pubsub.subscribe(NOTIFICATION_CHANNEL)

    async def listen_pubsub():
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                try:
                    await ws.send_json(data)
                except Exception:
                    break

    pubsub_task = asyncio.create_task(listen_pubsub())

    try:
        while True:
            data = await asyncio.wait_for(ws.receive_text(), timeout=60.0)
            if data == '{"type":"ping"}':
                await ws.send_json({"type": "pong"})
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        pubsub_task.cancel()
        try:
            await pubsub_task
        except asyncio.CancelledError:
            pass
        await pubsub.unsubscribe(NOTIFICATION_CHANNEL)
        _connections.pop(user_id, None)
        await remove_online_user(redis, user_id)
        # Broadcast updated count to remaining connections
        count = await get_online_count(redis)
        msg = json.dumps({"type": "online_count", "count": count})
        await _broadcast_to_all(redis, msg)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/ws.py
git commit -m "feat: add WebSocket endpoint with JWT auth and connection lifecycle"
```

---

### Task 3: Register WebSocket Route in main.py

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add ws import and register router**

```python
from app.api import auth, posts, admin, tools, chat, ws

# ... existing code ...

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(ws.router)  # WebSocket routes (no prefix, /ws directly)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register WebSocket route in main.py"
```

---

### Task 4: Nginx WebSocket Proxy

**Files:**
- Modify: `nginx/nginx.conf`

- [ ] **Step 1: Add /ws location before the /api/ location**

```nginx
server {
    listen 80;
    server_name localhost;

    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        root /app/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /static/ {
        alias /usr/share/nginx/html/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx/nginx.conf
git commit -m "feat: add WebSocket proxy to Nginx config"
```

---

### Task 5: Frontend useWebSocket Hook + OnlineCount Display

**Files:**
- Create: `frontend/src/hooks/useWebSocket.ts`
- Modify: `frontend/src/components/Footer.tsx`

- [ ] **Step 1: Create useWebSocket.ts**

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

export interface Notification {
  type: 'notification';
  title: string;
  body: string;
  created_at: string;
}

interface WSState {
  onlineCount: number;
  notifications: Notification[];
  isConnected: boolean;
}

export function useWebSocket(): WSState {
  const [onlineCount, setOnlineCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnect = 10;

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'online_count') {
          setOnlineCount(data.count);
        } else if (data.type === 'notification') {
          setNotifications((prev) => [data, ...prev].slice(0, 20));
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (reconnectAttempts.current < maxReconnect) {
        reconnectAttempts.current++;
        setTimeout(connect, 5000);
      }
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return { onlineCount, notifications, isConnected };
}
```

- [ ] **Step 2: Update Footer.tsx to show online count**

```tsx
import { useWebSocket } from '../hooks/useWebSocket';

export default function Footer() {
  const { onlineCount } = useWebSocket();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} YourName &middot; Powered by FastAPI + React
        {onlineCount > 0 && (
          <span className="ml-3">
            &middot; 🟢 {onlineCount} 人在线
          </span>
        )}
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useWebSocket.ts frontend/src/components/Footer.tsx
git commit -m "feat: add useWebSocket hook and online count display"
```

---

### Task 6: Build & Verify

- [ ] **Step 1: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Build and restart**

```bash
docker compose up -d --build backend frontend nginx
```

- [ ] **Step 3: Verify HTTP health**

```bash
curl -s http://localhost/api/health
```

- [ ] **Step 4: Open browser → http://localhost**

Verify:
- Footer shows online count
- Open 2 browser tabs → both show updated count

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "chore: finalize WebSocket infrastructure verification"
```
