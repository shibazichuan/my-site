# 个人网站 - 阶段三·第三部分：WebSocket 基础设施 设计文档

> **日期**: 2026-06-14
> **状态**: 已确认
> **概述**: 搭建 WebSocket 基础设施（连接管理 + 在线人数 + 通知推送通道），为后续评论/互动通知做准备

---

## 1. 范围

| 模块 | 内容 |
|------|------|
| 🔌 WebSocket 端点 | JWT 认证、连接/断开管理 |
| 👥 在线人数 | Redis Set 维护在线用户，实时广播人数变化 |
| 🔔 通知通道 | Redis Pub/Sub 广播接口，供其他模块推送通知 |
| 🌐 Nginx | 新增 `/ws` 反向代理（WebSocket upgrade） |

### 不做

- 具体通知业务（评论、点赞等）— 仅搭通道
- 消息持久化
- 协作白板

---

## 2. 架构

```
浏览器 ──WebSocket──▶ Nginx ──upgrade──▶ FastAPI /ws
                                            │
                                      Redis Set (在线用户)
                                            │
                                      Redis Pub/Sub (通知广播)
```

- WebSocket 认证走 JWT (`?token=xxx` query param)
- 在线用户集合用 Redis Set: `online_users`
- 广播用 Redis Pub/Sub channel: `notifications`

---

## 3. 消息协议

所有消息 JSON 格式：

```json
// Server → Client
{"type": "online_count", "count": 5}
{"type": "notification", "title": "...", "body": "...", "created_at": "..."}

// Client → Server (心跳)
{"type": "ping"}   → 服务端回复 {"type": "pong"}
```

---

## 4. API

### 4.1 WebSocket 端点

```
ws://localhost/ws?token=<jwt_access_token>
```

**连接流程:**
1. 验证 token → 失败则关闭连接 (1008)
2. 将 user_id 加入 Redis Set `online_users`
3. 订阅 Redis Pub/Sub channel `notifications`
4. 广播最新 `online_count` 给所有连接
5. 循环：接收客户端 ping → 回复 pong；接收 Pub/Sub 消息 → 转发给客户端
6. 断开时：移除 user_id，广播 `online_count`

### 4.2 广播函数（供其他模块调用）

```python
# services/ws_service.py
async def broadcast_notification(redis: Redis, title: str, body: str):
    message = json.dumps({"type": "notification", "title": title, "body": body, "created_at": now.isoformat()})
    await redis.publish("notifications", message)
```

---

## 5. 前端

### 5.1 WebSocket Provider

```
frontend/src/
├── hooks/useWebSocket.ts        # WebSocket 连接 + 自动重连 hook
├── components/OnlineCount.tsx    # 在线人数显示
```

### 5.2 修改

| 文件 | 改动 |
|------|------|
| `Footer.tsx` 或 `Layout.tsx` | 显示在线人数 |

### 5.3 useWebSocket Hook

```typescript
// 连接 ws://localhost/ws?token=xxx
// 自动重连（间隔 5s）
// 提供: { onlineCount, notifications, isConnected }
// 通过 React Context 或 Zustand store 共享状态
```

---

## 6. 后端文件

```
backend/app/
├── api/ws.py              # WebSocket 路由 + 连接管理
├── services/ws_service.py # 在线集合管理 + 广播函数
├── main.py                # 注册 WS 路由
```

---

## 7. Nginx 配置

```nginx
location /ws {
    proxy_pass http://backend:8000/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

- 需修改 `nginx/nginx.conf` 和 `docker-compose.yml`（backend 端口映射非必需）

---

## 8. 非功能需求

- **认证**: JWT 通过 query param 传递，中间件验证
- **心跳**: 客户端每 30s 发 ping，服务端 60s 无消息断连
- **重连**: 前端自动重连，间隔 5s，最多 10 次
- **性能**: Redis Set 操作 O(1)，广播用 Pub/Sub 不阻塞 WS 连接
