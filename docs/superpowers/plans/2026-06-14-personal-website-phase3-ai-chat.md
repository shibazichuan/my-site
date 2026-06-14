# 个人网站 AI 聊天 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入 DeepSeek API，实现 ChatGPT 风格的多会话 AI 聊天（SSE 流式输出 + 代码高亮 + Markdown 渲染）

**Architecture:** FastAPI 后端代理 DeepSeek API，通过 SSE 流式返回 token；消息在流结束后一次写入 PostgreSQL；Redis 做日配额计数；前端 Fetch API + ReadableStream 消费 SSE 流

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, httpx (async HTTP), Redis, React 18, Vite, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-06-14-personal-website-phase3-ai-chat-design.md`

---

## File Structure

```
New files:
backend/
├── app/models/chat.py               # Conversation + Message 模型
├── app/schemas/chat.py              # 请求/响应 schema
├── app/services/chat_service.py     # DeepSeek SSE 代理 + 对话管理 + 配额
├── app/api/chat.py                  # 路由
├── alembic/versions/003_chat.py     # Migration

frontend/src/
├── api/chat.ts                      # SSE + REST API
├── pages/ChatPage.tsx               # 聊天页面容器
├── components/chat/
│   ├── ChatSidebar.tsx              # 侧边栏
│   ├── ChatMain.tsx                 # 主区域
│   ├── ChatMessage.tsx              # 消息气泡
│   └── ChatInput.tsx                # 输入框

Modified files:
backend/app/config.py                # +DeepSeek 配置
backend/app/models/__init__.py       # import chat models
backend/app/main.py                  # 注册 chat router
.env.example                         # +DeepSeek 变量
frontend/src/types/index.ts          # +Chat 类型
frontend/src/App.tsx                 # + /chat 路由
frontend/src/components/Navbar.tsx   # + 导航入口
```

---

### Task 1: Backend Config + Dependencies

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add DeepSeek config to backend/app/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://mysite:changeme@localhost:5432/mysite"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    upload_dir: str = "./data/uploads"
    cors_origins: str = "http://localhost"
    deepseek_api_key: str = ""
    deepseek_api_base: str = "https://api.deepseek.com/v1"
    daily_chat_quota: int = 50

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
```

- [ ] **Step 2: Update .env.example**

```
POSTGRES_USER=mysite
POSTGRES_PASSWORD=change-me-in-production
POSTGRES_DB=mysite
SECRET_KEY=change-me-to-a-random-string
CORS_ORIGINS=http://localhost

UMAMI_DB_PASSWORD=umami-secret
UMAMI_APP_SECRET=change-me-to-random

DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DAILY_CHAT_QUOTA=50
```

- [ ] **Step 3: Add httpx dependency to pyproject.toml**

```toml
[project]
name = "my-site-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy[asyncio]>=2.0.35",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic[email]>=2.10.0",
    "pydantic-settings>=2.7.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.18",
    "redis>=5.2.0",
    "markdown>=3.7",
    "pygments>=2.18.0",
    "httpx>=0.28.0",
]
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/config.py backend/.env.example backend/pyproject.toml
git commit -m "feat: add DeepSeek config and httpx dependency"
```

---

### Task 2: Chat Models + Migration

**Files:**
- Create: `backend/app/models/chat.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/003_chat.py`

- [ ] **Step 1: Create backend/app/models/chat.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False, default="新对话")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages: Mapped[list["Message"]] = relationship("Message", back_populates="conversation", order_by="Message.created_at")
    user: Mapped["User"] = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
```

- [ ] **Step 2: Update backend/app/models/__init__.py**

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models so they register with Base.metadata
from app.models.user import User  # noqa: E402, F401
from app.models.post import Post  # noqa: E402, F401
from app.models.tag import Tag, post_tags  # noqa: E402, F401
from app.models.shortlink import ShortLink  # noqa: E402, F401
from app.models.image_record import ImageRecord  # noqa: E402, F401
from app.models.chat import Conversation, Message  # noqa: E402, F401
```

- [ ] **Step 3: Create backend/alembic/versions/003_chat.py**

```python
"""chat

Revision ID: 003
Revises: 002
Create Date: 2026-06-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(100), nullable=False, server_default=sa.text("'新对话'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_conversations_user", "conversations", ["user_id", "updated_at"])

    op.create_table("messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_messages_conversation", "messages", ["conversation_id", "created_at"])


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_table("conversations")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/chat.py backend/app/models/__init__.py backend/alembic/versions/003_chat.py
git commit -m "feat: add Conversation and Message models with migration"
```

---

### Task 3: Chat Schemas

**Files:**
- Create: `backend/app/schemas/chat.py`

- [ ] **Step 1: Create backend/app/schemas/chat.py**

```python
from datetime import datetime
from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    conversation_id: str | None = None
    message: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: str
    title: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedConversations(BaseModel):
    items: list[ConversationListItem]
    total: int
    page: int
    page_size: int


class QuotaResponse(BaseModel):
    used: int
    limit: int
    remaining: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/chat.py
git commit -m "feat: add chat schemas"
```

---

### Task 4: Chat Service (DeepSeek Proxy + CRUD + Quota)

**Files:**
- Create: `backend/app/services/chat_service.py`

- [ ] **Step 1: Create backend/app/services/chat_service.py**

```python
import json
import uuid
from datetime import date
from typing import AsyncGenerator

import httpx
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from redis.asyncio import Redis

from app.config import settings
from app.models.chat import Conversation, Message
from app.database import async_session


async def _get_quota_key(user_id: uuid.UUID) -> str:
    return f"chat_quota:{user_id}:{date.today().isoformat()}"


async def check_quota(redis: Redis, user_id: uuid.UUID) -> bool:
    key = await _get_quota_key(user_id)
    used = int(await redis.get(key) or 0)
    return used < settings.daily_chat_quota


async def get_quota(redis: Redis, user_id: uuid.UUID) -> dict:
    key = await _get_quota_key(user_id)
    used = int(await redis.get(key) or 0)
    return {"used": used, "limit": settings.daily_chat_quota, "remaining": max(0, settings.daily_chat_quota - used)}


async def _incr_quota(redis: Redis, user_id: uuid.UUID) -> None:
    key = await _get_quota_key(user_id)
    await redis.incr(key)
    await redis.expire(key, 86400)


async def stream_deepseek(
    redis: Redis,
    user_id: uuid.UUID,
    conversation_id: str | None,
    message: str,
) -> AsyncGenerator[str, None]:
    # Quota check
    if not await check_quota(redis, user_id):
        yield f'data: {{"type":"error","detail":"日配额已用完，明天再来吧"}}\n\n'
        return

    # Build messages array — fetch history if continuing conversation
    chat_messages = [{"role": "system", "content": "你是一个有帮助的AI助手。"}]

    async with async_session() as db:
        try:
            if conversation_id:
                conv = await db.execute(
                    select(Conversation)
                    .where(and_(Conversation.id == uuid.UUID(conversation_id), Conversation.user_id == user_id))
                )
                conv = conv.scalar_one_or_none()
                if not conv:
                    yield f'data: {{"type":"error","detail":"对话不存在"}}\n\n'
                    return
                msgs = await db.execute(
                    select(Message)
                    .where(Message.conversation_id == uuid.UUID(conversation_id))
                    .order_by(Message.created_at)
                )
                for m in msgs.scalars().all():
                    chat_messages.append({"role": m.role, "content": m.content})

            chat_messages.append({"role": "user", "content": message})

            # Call DeepSeek API (non-stream first to get full response, then simulate stream for simplicity)
            # Use streaming for real token-by-token output
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.deepseek_api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.deepseek_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": chat_messages,
                        "stream": True,
                    },
                ) as response:
                    if response.status_code != 200:
                        text = await response.aread()
                        yield f'data: {{"type":"error","detail":"AI 服务暂时不可用"}}\n\n'
                        return

                    full_content = ""
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_content += content
                                    escaped = json.dumps({"type": "token", "content": content})
                                    yield f"data: {escaped}\n\n"
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

            # Persist messages
            if not conversation_id:
                title = message[:30].replace("\n", " ")
                conv = Conversation(user_id=user_id, title=title)
                db.add(conv)
                await db.flush()
                conversation_id = str(conv.id)
            else:
                conv = await db.get(Conversation, uuid.UUID(conversation_id))
                # updated_at auto-updates via model onupdate

            user_msg = Message(conversation_id=uuid.UUID(conversation_id), role="user", content=message)
            assistant_msg = Message(conversation_id=uuid.UUID(conversation_id), role="assistant", content=full_content)
            db.add_all([user_msg, assistant_msg])

            # Increment quota on success
            await _incr_quota(redis, user_id)

            await db.commit()

            conv_title = conv.title if conv else "新对话"
            yield f'data: {{"type":"done","conversation_id":"{conversation_id}","title":{json.dumps(conv_title)}}}\n\n'

        except httpx.ReadTimeout:
            await db.rollback()
            yield f'data: {{"type":"error","detail":"AI 响应超时，请重试"}}\n\n'
        except Exception:
            await db.rollback()
            yield f'data: {{"type":"error","detail":"服务器内部错误"}}\n\n'


async def get_user_conversations(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> tuple[list[Conversation], int]:
    query = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    count_query = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total


async def get_conversation_detail(db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .where(and_(Conversation.id == conversation_id, Conversation.user_id == user_id))
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


async def delete_conversation(db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Conversation).where(and_(Conversation.id == conversation_id, Conversation.user_id == user_id))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()


def conversation_to_list_item(conv: Conversation) -> dict:
    return {
        "id": str(conv.id),
        "title": conv.title,
        "updated_at": conv.updated_at,
    }


def conversation_to_detail(conv: Conversation) -> dict:
    return {
        "id": str(conv.id),
        "title": conv.title,
        "messages": [
            {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at}
            for m in conv.messages
        ],
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/chat_service.py
git commit -m "feat: add chat service with DeepSeek SSE proxy, CRUD, and quota"
```

---

### Task 5: Chat API Routes

**Files:**
- Create: `backend/app/api/chat.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/api/chat.py**

```python
import uuid
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_redis
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    SendMessageRequest,
    PaginatedConversations,
    ConversationDetail,
    QuotaResponse,
)
from app.services.chat_service import (
    stream_deepseek,
    get_user_conversations,
    get_conversation_detail,
    delete_conversation,
    get_quota,
    conversation_to_list_item,
    conversation_to_detail,
)

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/send")
async def send_message(
    data: SendMessageRequest,
    user: User = Depends(get_current_user),
):
    redis = await get_redis()
    return StreamingResponse(
        stream_deepseek(
            redis=redis,
            user_id=user.id,
            conversation_id=data.conversation_id,
            message=data.message,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=PaginatedConversations)
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_conversations(db, user.id, page=page, page_size=page_size)
    return PaginatedConversations(
        items=[conversation_to_list_item(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
async def get_conversation(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await get_conversation_detail(db, conv_id, user.id)
    return conversation_to_detail(conv)


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation_route(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_conversation(db, conv_id, user.id)


@router.get("/quota", response_model=QuotaResponse)
async def quota(
    user: User = Depends(get_current_user),
):
    redis = await get_redis()
    return await get_quota(redis, user.id)
```

- [ ] **Step 2: Modify backend/app/main.py — register chat router**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.config import settings
from app.database import get_redis, async_session
from app.api import auth, posts, admin, tools, chat
from app.services.shortlink_service import get_shortlink_by_code
from app.tasks.sitemap import generate_sitemap


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
    # Generate initial sitemap on startup
    try:
        await generate_sitemap({})
    except Exception:
        pass
    yield


app = FastAPI(title="My Site", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(tools.router, prefix="/api/tools", tags=["tools"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/r/{short_code}")
async def redirect_shortlink(short_code: str):
    async with async_session() as db:
        try:
            link = await get_shortlink_by_code(db, short_code)
            return RedirectResponse(url=link.original_url, status_code=302)
        finally:
            await db.close()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/chat.py backend/app/main.py
git commit -m "feat: add chat API routes with SSE streaming, CRUD, and quota"
```

---

### Task 6: Frontend Types + API Layer

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/chat.ts`

- [ ] **Step 1: Update frontend/src/types/index.ts — add Chat types**

```typescript
export interface User {
  id: string; email: string; username: string; is_admin: boolean; is_active: boolean;
}
export interface Tag {
  name: string; slug: string; post_count: number;
}
export interface PostListItem {
  id: string; title: string; slug: string; summary: string | null;
  cover_image: string | null; tags: Tag[]; author_name: string;
  published_at: string | null; view_count: number;
}
export interface PostDetail extends PostListItem {
  content: string; html: string; status: string; created_at: string; updated_at: string;
}
export interface PaginatedPosts {
  items: PostListItem[]; total: number; page: number; page_size: number;
}
export interface TokenResponse {
  access_token: string; refresh_token: string; token_type: string; user: User;
}

// ---- Tools ----
export interface ShortLinkItem {
  id: string; short_code: string; short_url: string;
  original_url: string; click_count: number; created_at: string;
}
export interface PaginatedShortLinks {
  items: ShortLinkItem[]; total: number; page: number; page_size: number;
}
export interface ImageRecordItem {
  id: string; original_name: string; original_size: number;
  compressed_size: number; url: string; quality: number; created_at: string;
}
export interface PaginatedImages {
  items: ImageRecordItem[]; total: number; page: number; page_size: number;
}

// ---- Chat ----
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; created_at: string;
}
export interface ConversationListItem {
  id: string; title: string; updated_at: string;
}
export interface ConversationDetail {
  id: string; title: string; messages: ChatMessage[];
  created_at: string; updated_at: string;
}
export interface PaginatedConversations {
  items: ConversationListItem[]; total: number; page: number; page_size: number;
}
export interface QuotaInfo {
  used: number; limit: number; remaining: number;
}
```

- [ ] **Step 2: Create frontend/src/api/chat.ts**

```typescript
import client from './client';
import type { ConversationDetail, PaginatedConversations, QuotaInfo } from '../types';

export async function fetchConversations(page = 1, pageSize = 20): Promise<PaginatedConversations> {
  const { data } = await client.get<PaginatedConversations>('/chat/conversations', {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const { data } = await client.get<ConversationDetail>(`/chat/conversations/${id}`);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await client.delete(`/chat/conversations/${id}`);
}

export async function fetchQuota(): Promise<QuotaInfo> {
  const { data } = await client.get<QuotaInfo>('/chat/quota');
  return data;
}

export interface SSECallbacks {
  onToken: (content: string) => void;
  onDone: (conversationId: string, title: string) => void;
  onError: (detail: string) => void;
}

export async function sendMessage(
  message: string,
  conversationId: string | null,
  callbacks: SSECallbacks,
): Promise<void> {
  const token = localStorage.getItem('access_token');
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

  if (!response.ok) {
    callbacks.onError(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'token') {
            callbacks.onToken(event.content);
          } else if (event.type === 'done') {
            callbacks.onDone(event.conversation_id, event.title);
          } else if (event.type === 'error') {
            callbacks.onError(event.detail);
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/chat.ts
git commit -m "feat: add chat types and API layer with SSE streaming"
```

---

### Task 7: Chat UI Components

**Files:**
- Create: `frontend/src/components/chat/ChatSidebar.tsx`
- Create: `frontend/src/components/chat/ChatMessage.tsx`
- Create: `frontend/src/components/chat/ChatInput.tsx`
- Create: `frontend/src/components/chat/ChatMain.tsx`

- [ ] **Step 1: Create frontend/src/components/chat/ChatSidebar.tsx**

```tsx
import { useEffect, useState } from 'react';
import type { ConversationListItem, QuotaInfo } from '../../types';
import { fetchConversations, deleteConversation, fetchQuota } from '../../api/chat';

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRefresh: number; // increment to trigger reload
}

export default function ChatSidebar({ activeId, onSelect, onNew, onRefresh }: Props) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    fetchConversations(1, 50).then((res) => setConversations(res.items)).catch(() => {});
    fetchQuota().then(setQuota).catch(() => {});
  }, [onRefresh]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('确定删除这个对话？')) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) onNew();
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full shrink-0">
      <div className="p-3 border-b border-gray-700">
        <button
          onClick={onNew}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wide">历史对话</div>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group flex items-center justify-between px-3 py-2 mx-1.5 mb-0.5 rounded-lg cursor-pointer text-sm transition-colors ${activeId === conv.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <span className="truncate flex-1">{conv.title}</span>
            <button
              onClick={(e) => handleDelete(conv.id, e)}
              className="ml-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-600 text-center">暂无对话</div>
        )}
      </div>
      {quota && (
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
          今日剩余: <span className="text-green-400 font-medium">{quota.remaining}/{quota.limit}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/components/chat/ChatMessage.tsx**

```tsx
import type { ChatMessage as ChatMessageType } from '../../types';

export default function ChatMessage({ msg }: { msg: ChatMessageType }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-pink-600" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          U
        </div>
      )}
    </div>
  );
}

function formatContent(content: string): string {
  // Simple Markdown-like formatting: code blocks and inline code
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks with ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs"><code>${escaped}</code></pre>`;
  });

  // Inline code with `
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs">$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}
```

- [ ] **Step 3: Create frontend/src/components/chat/ChatInput.tsx**

```tsx
import { useState, type KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-3 items-end max-w-3xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          rows={1}
          disabled={disabled}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {disabled ? '···' : '发送'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/src/components/chat/ChatMain.tsx**

```tsx
import { useEffect, useState, useRef } from 'react';
import { fetchConversation } from '../../api/chat';
import type { ChatMessage as ChatMessageType } from '../../types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface Props {
  conversationId: string | null;
  onRefresh: () => void;
}

export default function ChatMain({ conversationId, onRefresh }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setStreamText('');
      return;
    }
    setLoading(true);
    fetchConversation(conversationId)
      .then((conv) => setMessages(conv.messages))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  async function handleSend(message: string) {
    // Add user message immediately
    const userMsg: ChatMessageType = {
      id: 'local-' + Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamText('');

    const { sendMessage } = await import('../../api/chat');
    await sendMessage(message, conversationId, {
      onToken: (content) => setStreamText((prev) => prev + content),
      onDone: (convId, _title) => {
        setStreamText('');
        setStreaming(false);
        // If new conversation created, navigate to it
        if (!conversationId) {
          onRefresh();
        } else {
          // Reload messages
          fetchConversation(convId).then((conv) => setMessages(conv.messages)).catch(() => {});
        }
      },
      onError: (detail) => {
        setStreamText('');
        setStreaming(false);
        alert(detail);
      },
    });
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          选择对话或点击 "+" 创建新对话
        </div>
        <ChatInput onSend={handleSend} disabled={false} />
      </div>
    );
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}
          {streaming && streamText && (
            <ChatMessage
              msg={{
                id: 'streaming',
                role: 'assistant',
                content: streamText,
                created_at: new Date().toISOString(),
              }}
            />
          )}
          {streaming && !streamText && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold">AI</div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse rounded-sm" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/
git commit -m "feat: add chat UI components (Sidebar, Main, Message, Input)"
```

---

### Task 8: ChatPage + App/Navbar Integration

**Files:**
- Create: `frontend/src/pages/ChatPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

- [ ] **Step 1: Create frontend/src/pages/ChatPage.tsx**

```tsx
import { useState, useCallback } from 'react';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatMain from '../components/chat/ChatMain';

export default function ChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelect = useCallback((id: string) => setActiveId(id), []);
  const handleNew = useCallback(() => setActiveId(null), []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Mobile toggle */}
      <div className="md:hidden absolute top-0 left-0 z-40">
        {/* Sidebar drawer trigger — simplified for plan, full impl in code */}
      </div>

      {/* Sidebar — hidden on mobile unless toggled */}
      <div className="hidden md:flex">
        <ChatSidebar
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          onRefresh={refreshKey}
        />
      </div>

      {/* Main chat area */}
      <ChatMain
        conversationId={activeId}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Modify frontend/src/App.tsx — add /chat route**

```tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthGuard from './components/AdminGuard'
import AdminLayout from './pages/admin/AdminLayout'
import PostList from './pages/admin/PostList'
import PostEditor from './pages/admin/PostEditor'
import ToolsIndex from './pages/tools/ToolsIndex'
import ShortLink from './pages/tools/ShortLink'
import ImageCompress from './pages/tools/ImageCompress'
import JsonFormatter from './pages/tools/JsonFormatter'
import Base64Tool from './pages/tools/Base64Tool'
import ChatPage from './pages/ChatPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<AuthGuard requireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<PostList />} />
          <Route path="/admin/posts" element={<PostList />} />
          <Route path="/admin/posts/new" element={<PostEditor />} />
          <Route path="/admin/posts/:id/edit" element={<PostEditor />} />
        </Route>
      </Route>
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/tools" element={<ToolsIndex />} />
          <Route path="/tools/shortlink" element={<ShortLink />} />
          <Route path="/tools/image" element={<ImageCompress />} />
          <Route path="/tools/json" element={<JsonFormatter />} />
          <Route path="/tools/base64" element={<Base64Tool />} />
        </Route>
      </Route>
      <Route element={<AuthGuard />}>
        <Route path="/chat" element={<ChatPage />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 3: Modify frontend/src/components/Navbar.tsx — add chat entry**

```tsx
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-lg text-gray-900 hover:text-blue-600">YourName</Link>
          <Link to="/blog" className="text-sm text-gray-600 hover:text-gray-900">博客</Link>
          {isAuthenticated && <Link to="/tools" className="text-sm text-gray-600 hover:text-gray-900">工具箱</Link>}
          {isAuthenticated && <Link to="/chat" className="text-sm text-gray-600 hover:text-gray-900">🤖 AI 聊天</Link>}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <>
              {isAdmin && <Link to="/admin" className="text-gray-600 hover:text-gray-900">后台</Link>}
              <span className="text-gray-500">{user?.username}</span>
              <button onClick={logout} className="text-gray-500 hover:text-red-600">退出</button>
            </>
          ) : (
            <Link to="/login" className="text-blue-600 hover:text-blue-800">登录</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ChatPage.tsx frontend/src/App.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: add ChatPage and wire into App routing and Navbar"
```

---

### Task 9: Build & Run Verification

- [ ] **Step 1: Run Alembic migration**

```bash
docker compose exec backend alembic upgrade head
```
Expected: "Running upgrade 002 -> 003, chat"

- [ ] **Step 2: Rebuild and restart services**

```bash
docker compose up -d --build
```
Expected: All services Up (docker compose ps)

- [ ] **Step 3: Verify chat API requires auth**

```bash
curl -s http://localhost/api/chat/quota
```
Expected: `{"detail":"Not authenticated"}` (401)

- [ ] **Step 4: Login and get token**

```bash
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

- [ ] **Step 5: Check quota**

```bash
TOKEN="<access_token>"
curl -s http://localhost/api/chat/quota -H "Authorization: Bearer $TOKEN"
```
Expected: `{"used":0,"limit":50,"remaining":50}`

- [ ] **Step 6: Verify UI**

Open `http://localhost/chat` — should see:
- 侧边栏 + 配额显示
- 输入框可用
- 发送消息后 SSE 流式输出

- [ ] **Step 7: Commit (if any config changes)**

```bash
git add . && git commit -m "chore: finalize AI chat verification"
```
