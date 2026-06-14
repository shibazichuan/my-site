# 个人网站 - 阶段三·第一部分：AI 聊天 设计文档

> **日期**: 2026-06-14
> **状态**: 已确认
> **概述**: 接入 DeepSeek API，实现 ChatGPT 风格的多会话 AI 聊天，公开引流

---

## 1. 范围

| 模块 | 内容 |
|------|------|
| 🤖 AI 聊天 | DeepSeek API 对话、SSE 流式输出、代码高亮、Markdown 渲染 |
| 💬 会话管理 | 多会话侧边栏、新建/切换/删除对话 |
| 🔐 认证 | 需登录使用（复用已有 JWT） |
| 📊 限流 | 每用户日配额 50 次（Redis 计数，config 可调） |

### 不做

- 多模型切换（仅用 deepseek-chat）
- 对话导出为文件
- 消息分享链接
- 匿名访问

---

## 2. 架构

```
浏览器 ──HTTP──▶ Nginx ──proxy──▶ FastAPI ──SSE──▶ DeepSeek API
                                       │
                                 PostgreSQL (消息落库)
                                       │
                                 Redis (日配额计数)
```

- **方案 A**: 后端代理 DeepSeek，API Key 不暴露前端
- SSE（Server-Sent Events）流式输出，Fetch API + ReadableStream 消费
- 消息在 SSE 流结束后一次性写入数据库

---

## 3. 数据库新增表

### 3.1 conversations

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | 所属用户 |
| title | VARCHAR(100) | 首条用户消息前 30 字 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | 最后消息时间 |

索引: `(user_id, updated_at DESC)`

### 3.2 messages

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| conversation_id | UUID FK → conversations | 所属对话 |
| role | VARCHAR(20) | `user` / `assistant` |
| content | TEXT | 消息正文 |
| created_at | TIMESTAMP | |

索引: `(conversation_id, created_at)`

---

## 4. API

### 4.1 聊天（全部需认证）

```
POST /api/chat/send               # 发送消息 → SSE 流
GET  /api/chat/conversations      # 对话列表 ?page=1&page_size=20
GET  /api/chat/conversations/{id} # 对话详情（含消息列表）
DELETE /api/chat/conversations/{id} → 204
GET  /api/chat/quota              # 今日剩余配额
```

### 4.2 SSE 流格式

**请求:**
```json
POST /api/chat/send
{
  "conversation_id": "uuid|null",
  "message": "用户输入..."
}
```

**响应 (SSE):**
```
data: {"type":"token","content":"你"}
data: {"type":"token","content":"好"}
data: {"type":"done","conversation_id":"xxx","title":"React 性能优化..."}
data: {"type":"error","detail":"超出日配额"}
```

- 首次对话 `conversation_id: null`，后端自动创建
- 流结束后一次性写 `messages` 表（user + assistant 各一条）
- 限流检查在流开始前，超出返回 429

### 4.3 限流

- Redis key: `chat_quota:{user_id}:{date}`，TTL 到次日
- 默认日配额 50（`settings.daily_chat_quota`）
- 超出后返回 `{"type":"error","detail":"日配额已用完"}`

---

## 5. 前端

### 5.1 路由

| 路由 | 组件 | 权限 |
|------|------|------|
| `/chat` | ChatPage | AuthGuard |

### 5.2 文件清单

```
frontend/src/
├── api/chat.ts                 # SSE 消费 (Fetch + ReadableStream) + REST
├── pages/ChatPage.tsx          # 聊天页面容器
├── components/chat/
│   ├── ChatSidebar.tsx         # 侧边栏：新建/切换/删除对话 + 配额
│   ├── ChatMain.tsx            # 主区域：消息列表 + 输入框
│   ├── ChatMessage.tsx         # 消息气泡（Markdown + 代码高亮）
│   └── ChatInput.tsx           # 输入框 (Enter 发送, Shift+Enter 换行)
```

### 5.3 修改文件

| 文件 | 改动 |
|------|------|
| `App.tsx` | 新增 `/chat` 路由 |
| `Navbar.tsx` | 新增 "🤖 AI 聊天" 入口 |
| `types/index.ts` | 新增 Chat 类型 |
| `index.html` | 无需改动 |

### 5.4 组件树

```
ChatPage
├── ChatSidebar
│   ├── 新建对话按钮
│   ├── 对话列表（updated_at 倒序）
│   └── 今日配额显示
└── ChatMain
    ├── 标题栏（自动标题 + 删除按钮）
    ├── 消息列表（ChatMessage × N，自动滚底）
    └── ChatInput（输入框 + 发送 + 流式光标动画）
```

### 5.5 SSE 消费

```typescript
// 用 Fetch API + ReadableStream（非 EventSource，需 POST + Auth header）
const response = await fetch('/api/chat/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ conversation_id, message }),
});
const reader = response.body!.getReader();
// 逐行解析 SSE → yield token → UI 逐字追加
```

### 5.6 移动端

- ≤768px: 侧边栏变为抽屉（汉堡菜单 ☰ 唤起），聊天区全屏
- 输入框固定在底部

---

## 6. 后端文件清单

```
backend/app/
├── models/chat.py               # Conversation + Message 模型
├── schemas/chat.py              # 请求/响应 schema
├── services/chat_service.py     # 对话管理 + DeepSeek SSE 代理
├── api/chat.py                  # 路由
├── middleware/                   # 复用已有 auth.py
```

### 修改

| 文件 | 改动 |
|------|------|
| `main.py` | 注册 chat router |
| `config.py` | 新增 `deepseek_api_key`、`deepseek_api_base`、`daily_chat_quota` |
| `models/__init__.py` | import chat 模型 |

---

## 7. 配置新增

```env
# .env
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DAILY_CHAT_QUOTA=50
```

---

## 8. 非功能需求

- **安全**: API Key 仅存后端，前端不可见
- **性能**: 消息落库在 SSE 流结束后批量写入，不阻塞流
- **容错**: DeepSeek API 超时 30s，异常时 SSE 返回 error 并关连接
- **复用**: Markdown 渲染和代码高亮复用已有 `markdown_service.py` + Pygments CSS
