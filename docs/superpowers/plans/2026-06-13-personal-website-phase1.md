# 个人网站阶段一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建个人网站基础 — 首页、博客系统、用户认证、管理后台，Docker Compose 一键部署

**Architecture:** React 18 SPA (Vite + TailwindCSS) 前端通过 Nginx 反向代理调用 FastAPI REST 后端，PostgreSQL 做主存储，Redis 做缓存和 IP 去重，JWT 双 token 鉴权。

**Tech Stack:** React 18, Vite, TailwindCSS, Zustand, Axios, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 16, Redis 7, Docker Compose, Nginx

**Spec:** `docs/superpowers/specs/2026-06-13-personal-website-phase1-design.md`

---

## File Structure

```
my-site/
├── docker-compose.yml, .env, .env.example, .gitignore
├── nginx/nginx.conf
├── frontend/
│   ├── Dockerfile, package.json, tsconfig.json, vite.config.ts, index.html
│   ├── tailwind.config.js, postcss.config.js
│   └── src/
│       ├── main.tsx, App.tsx, index.css
│       ├── api/client.ts, api/auth.ts, api/posts.ts
│       ├── components/Layout.tsx, Navbar.tsx, Footer.tsx
│       ├── components/PostCard.tsx, TagBadge.tsx, Pagination.tsx
│       ├── components/AdminGuard.tsx, MarkdownEditor.tsx
│       ├── pages/Home.tsx, BlogList.tsx, BlogDetail.tsx, Login.tsx, Register.tsx
│       ├── pages/admin/AdminLayout.tsx, PostList.tsx, PostEditor.tsx
│       ├── store/authStore.ts, types/index.ts
├── backend/
│   ├── Dockerfile, pyproject.toml, alembic.ini
│   ├── alembic/env.py, alembic/versions/001_init.py
│   └── app/
│       ├── __init__.py, main.py, config.py, database.py
│       ├── models/__init__.py, user.py, post.py, tag.py
│       ├── schemas/__init__.py, auth.py, post.py
│       ├── api/__init__.py, auth.py, posts.py, admin.py
│       ├── services/__init__.py, auth_service.py, post_service.py, markdown_service.py
│       ├── middleware/__init__.py, auth.py
│       └── storage/__init__.py, local.py
```

---

### Task 1: Project Scaffolding

**Files:** Create `.env.example`, `.env`, `.gitignore`, `docker-compose.yml`, `data/uploads/.gitkeep`

- [ ] **Step 1: Create .env.example**

```
POSTGRES_USER=mysite
POSTGRES_PASSWORD=change-me-in-production
POSTGRES_DB=mysite
SECRET_KEY=change-me-to-a-random-string
CORS_ORIGINS=http://localhost
```

- [ ] **Step 2: Copy to .env**

```bash
cp .env.example .env
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
__pycache__/
*.pyc
.venv/
data/postgres/
data/uploads/*
!data/uploads/.gitkeep
.superpowers/
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - ./data/redis:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      UPLOAD_DIR: /app/data/uploads
      CORS_ORIGINS: ${CORS_ORIGINS}
    volumes:
      - ./data/uploads:/app/data/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build: ./frontend
    volumes:
      - frontend_dist:/app/dist

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./data/uploads:/usr/share/nginx/html/static:ro
    volumes_from:
      - frontend:ro
    depends_on:
      - backend
      - frontend

volumes:
  frontend_dist:
```

- [ ] **Step 5: Create data/uploads/.gitkeep**

```bash
mkdir -p data/uploads && touch data/uploads/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold project with Docker Compose and config"
```

---

### Task 2: Backend Foundation

**Files:** Create `backend/pyproject.toml`, `backend/Dockerfile`, `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/database.py`

- [ ] **Step 1: Create backend/pyproject.toml**

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
]
```

- [ ] **Step 2: Create backend/Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir poetry
COPY pyproject.toml .
RUN poetry config virtualenvs.create false && poetry install --no-root
COPY . .
RUN mkdir -p /app/data/uploads
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

- [ ] **Step 3: Create backend/app/__init__.py** (empty file)

- [ ] **Step 4: Create backend/app/config.py**

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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
```

- [ ] **Step 5: Create backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from redis.asyncio import Redis
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
_redis: Redis | None = None


async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 6: Create backend/app/main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add FastAPI entry point, config, and database setup"
```

---

### Task 3: SQLAlchemy Models + Alembic Migration

**Files:** Create `backend/app/models/__init__.py`, `backend/app/models/user.py`, `backend/app/models/post.py`, `backend/app/models/tag.py`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/001_init.py`

- [ ] **Step 1: Create backend/app/models/__init__.py**

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 2: Create backend/app/models/user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    posts: Mapped[list["Post"]] = relationship("Post", back_populates="author")

from app.models.post import Post  # noqa: E402
```

- [ ] **Step 3: Create backend/app/models/tag.py**

```python
import uuid
from sqlalchemy import String, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", UUID(as_uuid=True), ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    posts: Mapped[list["Post"]] = relationship("Post", secondary="post_tags", back_populates="tags")

from app.models.post import Post  # noqa: E402
```

- [ ] **Step 4: Create backend/app/models/post.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(250), unique=True, nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    html: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author: Mapped["User"] = relationship("User", back_populates="posts")
    tags: Mapped[list["Tag"]] = relationship("Tag", secondary="post_tags", back_populates="posts")

from app.models.user import User  # noqa: E402
from app.models.tag import Tag  # noqa: E402
```

- [ ] **Step 5: Create backend/alembic.ini**

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://mysite:changeme@localhost:5432/mysite

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 6: Create backend/alembic/env.py**

```python
import asyncio
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base
from app.config import settings

target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(lambda c: context.configure(connection=c, target_metadata=target_metadata))
        await conn.run_sync(lambda _: context.run_migrations())
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 7: Create backend/alembic/versions/001_init.py**

```python
"""initial

Revision ID: 001
Revises:
Create Date: 2026-06-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_username", "users", ["username"])

    op.create_table("tags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("slug", sa.String(50), unique=True, nullable=False),
    )

    op.create_table("posts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("author_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(250), unique=True, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("summary", sa.String(500), nullable=True),
        sa.Column("cover_image", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'")),
        sa.Column("view_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_posts_slug", "posts", ["slug"])
    op.create_index("idx_posts_status_pub", "posts", ["status", "published_at"])
    op.create_index("idx_posts_author", "posts", ["author_id"])

    op.create_table("post_tags",
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("posts.id"), primary_key=True),
        sa.Column("tag_id", UUID(as_uuid=True), sa.ForeignKey("tags.id"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("post_tags")
    op.drop_table("posts")
    op.drop_table("tags")
    op.drop_table("users")
```

- [ ] **Step 8: Commit**

```bash
git add backend/alembic/ backend/alembic.ini backend/app/models/
git commit -m "feat: add SQLAlchemy models and init Alembic migration"
```

---

### Task 4: Auth Service + Schemas + Middleware

**Files:** Create `backend/app/schemas/__init__.py`, `backend/app/schemas/auth.py`, `backend/app/services/__init__.py`, `backend/app/services/auth_service.py`, `backend/app/middleware/__init__.py`, `backend/app/middleware/auth.py`

- [ ] **Step 1: Create backend/app/schemas/__init__.py** (empty)

- [ ] **Step 2: Create backend/app/schemas/auth.py**

```python
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    is_admin: bool
    is_active: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str
```

- [ ] **Step 3: Create backend/app/services/__init__.py** (empty)

- [ ] **Step 4: Create backend/app/services/auth_service.py**

```python
from datetime import datetime, timedelta, timezone
import uuid
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import settings
from app.models.user import User
from app.schemas.auth import UserRegister, UserResponse

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(user_id: str) -> str:
    return create_token(
        {"sub": user_id, "type": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    return create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def register_user(db: AsyncSession, data: UserRegister) -> User:
    existing = await db.execute(select(User).where((User.email == data.email) | (User.username == data.username)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or username already taken")
    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID")
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )
```

- [ ] **Step 5: Create backend/app/middleware/__init__.py** (empty)

- [ ] **Step 6: Create backend/app/middleware/auth.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import decode_token, get_user_by_id
from app.models.user import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return await get_user_by_id(db, user_id)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/ backend/app/services/ backend/app/middleware/
git commit -m "feat: add auth service, schemas, and JWT middleware"
```

---

### Task 5: Auth API Routes

**Files:** Create `backend/app/api/__init__.py`, `backend/app/api/auth.py`; Modify `backend/app/main.py`

- [ ] **Step 1: Create backend/app/api/__init__.py** (empty)

- [ ] **Step 2: Create backend/app/api/auth.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, RefreshRequest
from app.services.auth_service import (
    register_user, authenticate_user, create_access_token,
    create_refresh_token, decode_token, get_user_by_id, user_to_response,
)
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, data)
    uid = str(user.id)
    return TokenResponse(
        access_token=create_access_token(uid),
        refresh_token=create_refresh_token(uid),
        user=user_to_response(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    uid = str(user.id)
    return TokenResponse(
        access_token=create_access_token(uid),
        refresh_token=create_refresh_token(uid),
        user=user_to_response(user),
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user_to_response(user)


@router.post("/refresh")
async def refresh(data: RefreshRequest):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    return {"access_token": create_access_token(user_id), "token_type": "bearer"}
```

Need to add the HTTPException import:

At the top of the file:
```python
from fastapi import APIRouter, Depends, HTTPException
```

- [ ] **Step 3: Modify backend/app/main.py — register auth router**

Replace the file content:
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_redis
from app.api import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/ backend/app/main.py
git commit -m "feat: add auth API routes (register, login, me, refresh)"
```

---

### Task 6: Post Service + Markdown Service + Schemas

**Files:** Create `backend/app/schemas/post.py`, `backend/app/services/post_service.py`, `backend/app/services/markdown_service.py`

- [ ] **Step 1: Create backend/app/schemas/post.py**

```python
from datetime import datetime
from pydantic import BaseModel


class TagResponse(BaseModel):
    name: str
    slug: str
    post_count: int = 0

    model_config = {"from_attributes": True}


class PostListItem(BaseModel):
    id: str
    title: str
    slug: str
    summary: str | None = None
    cover_image: str | None = None
    tags: list[TagResponse] = []
    author_name: str
    published_at: datetime | None = None
    view_count: int = 0

    model_config = {"from_attributes": True}


class PostDetail(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    html: str
    summary: str | None = None
    cover_image: str | None = None
    tags: list[TagResponse] = []
    author_name: str
    status: str
    published_at: datetime | None = None
    view_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPosts(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int


class PostCreate(BaseModel):
    title: str
    content: str
    tags: list[str] = []
    summary: str | None = None
    cover_image: str | None = None
    status: str = "draft"


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    summary: str | None = None
    cover_image: str | None = None
    status: str | None = None
```

- [ ] **Step 2: Create backend/app/services/markdown_service.py**

```python
import re
from markdown import Markdown
from pygments.formatters import HtmlFormatter


class TargetBlankExtension:
    """Add target='_blank' to external links."""
    pass


def render_markdown(content: str) -> str:
    md = Markdown(extensions=["fenced_code", "codehilite", "tables", "toc"])
    html = md.convert(content)

    # Add target="_blank" to external links
    html = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', html)

    return html


def get_codehilite_css() -> str:
    return HtmlFormatter().get_style_defs(".codehilite")
```

- [ ] **Step 3: Create backend/app/services/post_service.py**

```python
import uuid
import re
from datetime import datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.post import Post
from app.models.tag import Tag, post_tags
from app.services.markdown_service import render_markdown
from app.schemas.post import PostCreate, PostUpdate


def slugify(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug[:250]


async def get_or_create_tags(db: AsyncSession, tag_names: list[str]) -> list[Tag]:
    tags = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        result = await db.execute(select(Tag).where(Tag.name == name))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=name, slug=slugify(name))
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


async def create_post(db: AsyncSession, data: PostCreate, author_id: uuid.UUID) -> Post:
    slug = slugify(data.title)
    # Check slug uniqueness
    existing = await db.execute(select(Post).where(Post.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    html = render_markdown(data.content)
    tags = await get_or_create_tags(db, data.tags)

    post = Post(
        author_id=author_id,
        title=data.title,
        slug=slug,
        content=data.content,
        html=html,
        summary=data.summary,
        cover_image=data.cover_image,
        status=data.status,
        published_at=datetime.now(timezone.utc) if data.status == "published" else None,
    )
    post.tags = tags
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def update_post(db: AsyncSession, post_id: uuid.UUID, data: PostUpdate) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id).options(selectinload(Post.tags)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if data.title is not None:
        post.title = data.title
        post.slug = slugify(data.title)
    if data.content is not None:
        post.content = data.content
        post.html = render_markdown(data.content)
    if data.summary is not None:
        post.summary = data.summary
    if data.cover_image is not None:
        post.cover_image = data.cover_image
    if data.status is not None:
        post.status = data.status
        if data.status == "published" and post.published_at is None:
            post.published_at = datetime.now(timezone.utc)
    if data.tags is not None:
        post.tags = await get_or_create_tags(db, data.tags)

    await db.commit()
    await db.refresh(post)
    return post


async def delete_post(db: AsyncSession, post_id: uuid.UUID) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.delete(post)
    await db.commit()


async def get_posts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 12,
    tag: str | None = None,
    search: str | None = None,
) -> tuple[list[Post], int]:
    query = select(Post).options(selectinload(Post.tags), selectinload(Post.author))
    count_query = select(func.count(Post.id))

    conditions = [Post.status == "published"]
    if tag:
        conditions.append(Post.tags.any(Tag.slug == tag))
    if search:
        conditions.append(Post.title.ilike(f"%{search}%") | Post.content.ilike(f"%{search}%"))

    where = and_(*conditions)
    query = query.where(where).order_by(Post.published_at.desc())
    count_query = count_query.where(where)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    posts = list(result.scalars().all())

    return posts, total


async def get_post_by_slug(db: AsyncSession, slug: str) -> Post:
    result = await db.execute(
        select(Post)
        .where(Post.slug == slug, Post.status == "published")
        .options(selectinload(Post.tags), selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def get_post_by_id(db: AsyncSession, post_id: uuid.UUID) -> Post:
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.tags), selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def increment_view_count(redis_client, slug: str, client_ip: str) -> None:
    key = f"view:{slug}:{client_ip}"
    already = await redis_client.get(key)
    if not already:
        async with async_session() as session:
            result = await session.execute(select(Post).where(Post.slug == slug))
            post = result.scalar_one_or_none()
            if post:
                post.view_count += 1
                await session.commit()
        await redis_client.setex(key, 86400, "1")  # 24h


def post_to_list_item(post: Post) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "slug": post.slug,
        "summary": post.summary,
        "cover_image": post.cover_image,
        "tags": [{"name": t.name, "slug": t.slug, "post_count": 0} for t in post.tags],
        "author_name": post.author.username,
        "published_at": post.published_at,
        "view_count": post.view_count,
    }


def post_to_detail(post: Post) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "html": post.html,
        "summary": post.summary,
        "cover_image": post.cover_image,
        "tags": [{"name": t.name, "slug": t.slug, "post_count": 0} for t in post.tags],
        "author_name": post.author.username,
        "status": post.status,
        "published_at": post.published_at,
        "view_count": post.view_count,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
    }
```

Note: The `increment_view_count` function needs `async_session` imported. Add at top:
```python
from app.database import async_session
```

- [ ] **Step 4: Update backend/app/services/__init__.py** (keep empty)

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/post.py backend/app/services/post_service.py backend/app/services/markdown_service.py
git commit -m "feat: add post service, markdown rendering, and schemas"
```

---

### Task 7: Blog & Admin API Routes + File Storage

**Files:** Create `backend/app/api/posts.py`, `backend/app/api/admin.py`, `backend/app/storage/__init__.py`, `backend/app/storage/local.py`
Modify `backend/app/main.py`

- [ ] **Step 1: Create backend/app/storage/__init__.py**

```python
from app.storage.local import LocalStorage

__all__ = ["LocalStorage"]
```

- [ ] **Step 2: Create backend/app/storage/local.py**

```python
import uuid
import os
from fastapi import UploadFile, HTTPException, status
from app.config import settings


class LocalStorage:
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or settings.upload_dir
        os.makedirs(self.base_dir, exist_ok=True)

    async def save(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or "")[1] or ".bin"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.base_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        return f"/static/{filename}"
```

- [ ] **Step 3: Create backend/app/api/posts.py**

```python
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_redis
from app.services.post_service import (
    get_posts, get_post_by_slug, increment_view_count,
    post_to_list_item, post_to_detail,
)
from app.schemas.post import PaginatedPosts, PostDetail

router = APIRouter()


@router.get("", response_model=PaginatedPosts)
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    tag: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    posts, total = await get_posts(db, page=page, page_size=page_size, tag=tag, search=search)
    return PaginatedPosts(
        items=[post_to_list_item(p) for p in posts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{slug}", response_model=PostDetail)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    post = await get_post_by_slug(db, slug)
    return post_to_detail(post)


@router.post("/{slug}/view", status_code=204)
async def view_post(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    redis_client = await get_redis()
    client_ip = request.client.host if request.client else "unknown"
    await increment_view_count(redis_client, slug, client_ip)
```

- [ ] **Step 4: Create backend/app/api/admin.py**

```python
import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.post import PostCreate, PostUpdate, PostDetail
from app.services.post_service import create_post, update_post, delete_post, get_post_by_id, post_to_detail
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.storage.local import LocalStorage

router = APIRouter(dependencies=[Depends(require_admin)])


@router.post("/posts", response_model=PostDetail, status_code=201)
async def create(data: PostCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await create_post(db, data, user.id)
    return post_to_detail(post)


@router.put("/posts/{post_id}", response_model=PostDetail)
async def update(post_id: uuid.UUID, data: PostUpdate, db: AsyncSession = Depends(get_db)):
    post = await update_post(db, post_id, data)
    return post_to_detail(post)


@router.delete("/posts/{post_id}", status_code=204)
async def delete(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await delete_post(db, post_id)


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    storage = LocalStorage()
    url = await storage.save(file)
    return {"url": url}
```

- [ ] **Step 5: Modify backend/app/main.py — register posts and admin routers**

Add imports and router registration. The final file:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_redis
from app.api import auth, posts, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/ backend/app/storage/ backend/app/main.py
git commit -m "feat: add blog and admin API routes, file storage"
```

---

That completes the backend. Now for the frontend...

Actually this file is getting extremely long. Let me continue writing the frontend tasks and nginx config, then do the self-review.


---

### Task 8: Frontend Foundation (Vite + React + Tailwind)

**Files:** Create `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/index.html`, `frontend/Dockerfile`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/types/index.ts`

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "my-site-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "axios": "^1.7.9",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:8000' } },
  build: { outDir: 'dist' },
})
```

- [ ] **Step 4: Create frontend/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 5: Create frontend/postcss.config.js**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 6: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Site</title>
  </head>
  <body class="bg-gray-50 text-gray-900 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create frontend/Dockerfile**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM alpine:latest
COPY --from=build /app/dist /app/dist
VOLUME /app/dist
CMD ["true"]
```

- [ ] **Step 8: Create frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Create frontend/src/types/index.ts**

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
```

- [ ] **Step 10: Create frontend/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 11: Create frontend/src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminGuard from './components/AdminGuard'
import AdminLayout from './pages/admin/AdminLayout'
import PostList from './pages/admin/PostList'
import PostEditor from './pages/admin/PostEditor'

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
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<PostList />} />
          <Route path="/admin/posts" element={<PostList />} />
          <Route path="/admin/posts/new" element={<PostEditor />} />
          <Route path="/admin/posts/:id/edit" element={<PostEditor />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 12: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, TailwindCSS, and routing"
```

---

### Task 9: Frontend API Layer

**Files:** Create `frontend/src/api/client.ts`, `frontend/src/api/auth.ts`, `frontend/src/api/posts.ts`

- [ ] **Step 1: Create frontend/src/api/client.ts**

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => { originalRequest.headers.Authorization = `Bearer ${token}`; resolve(client(originalRequest)); },
            reject,
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) { isRefreshing = false; localStorage.clear(); window.location.href = '/login'; return Promise.reject(error); }
      try {
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        localStorage.setItem('access_token', data.access_token);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  },
);

export default client;
```

- [ ] **Step 2: Create frontend/src/api/auth.ts**

```typescript
import client from './client';
import type { TokenResponse, User } from '../types';

export async function register(email: string, username: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/register', { email, username, password });
  return data;
}
export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/login', { email, password });
  return data;
}
export async function fetchMe(): Promise<User> {
  const { data } = await client.get<User>('/auth/me');
  return data;
}
```

- [ ] **Step 3: Create frontend/src/api/posts.ts**

```typescript
import client from './client';
import type { PostDetail, PaginatedPosts } from '../types';

export interface PostsQuery {
  page?: number; page_size?: number; tag?: string; search?: string;
}
export async function fetchPosts(query: PostsQuery = {}): Promise<PaginatedPosts> {
  const { data } = await client.get<PaginatedPosts>('/posts', { params: query });
  return data;
}
export async function fetchPost(slug: string): Promise<PostDetail> {
  const { data } = await client.get<PostDetail>(`/posts/${slug}`);
  return data;
}
export async function recordView(slug: string): Promise<void> {
  await client.post(`/posts/${slug}/view`);
}

export interface PostCreateData {
  title: string; content: string; tags?: string[]; summary?: string; cover_image?: string; status?: string;
}
export async function createPost(data: PostCreateData): Promise<PostDetail> {
  const { data: post } = await client.post<PostDetail>('/admin/posts', data);
  return post;
}
export async function updatePost(id: string, data: Partial<PostCreateData>): Promise<PostDetail> {
  const { data: post } = await client.put<PostDetail>(`/admin/posts/${id}`, data);
  return post;
}
export async function deletePost(id: string): Promise<void> {
  await client.delete(`/admin/posts/${id}`);
}
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData(); form.append('file', file);
  const { data } = await client.post<{ url: string }>('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: add frontend API layer with Axios interceptors"
```

---

### Task 10: Zustand Auth Store

**Files:** Create `frontend/src/store/authStore.ts`

- [ ] **Step 1: Create frontend/src/store/authStore.ts**

```typescript
import { create } from 'zustand';
import type { User } from '../types';
import * as authApi from '../api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isAdmin: false,

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    set({ user: res.user, isAuthenticated: true, isAdmin: res.user.is_admin });
  },

  register: async (email, username, password) => {
    const res = await authApi.register(email, username, password);
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    set({ user: res.user, isAuthenticated: true, isAdmin: res.user.is_admin });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },

  fetchUser: async () => {
    try {
      const user = await authApi.fetchMe();
      set({ user, isAuthenticated: true, isAdmin: user.is_admin });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isAdmin: false });
    }
  },

  initialize: () => {
    const token = localStorage.getItem('access_token');
    if (token) set({ isAuthenticated: true });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/
git commit -m "feat: add Zustand auth store"
```

---

### Task 11: Common Components

**Files:** Create `frontend/src/components/Layout.tsx`, `Navbar.tsx`, `Footer.tsx`, `PostCard.tsx`, `TagBadge.tsx`, `Pagination.tsx`

- [ ] **Step 1: Create frontend/src/components/Navbar.tsx**

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

- [ ] **Step 2: Create frontend/src/components/Footer.tsx**

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} YourName &middot; Powered by FastAPI + React
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create frontend/src/components/Layout.tsx**

```tsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => { initialize(); }, [initialize]);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/src/components/TagBadge.tsx**

```tsx
import { Link } from 'react-router-dom';
export default function TagBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <Link to={`/blog?tag=${slug}`} className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs hover:bg-blue-100 transition-colors">
      {name}
    </Link>
  );
}
```

- [ ] **Step 5: Create frontend/src/components/PostCard.tsx**

```tsx
import { Link } from 'react-router-dom';
import type { PostListItem } from '../types';
import TagBadge from './TagBadge';

export default function PostCard({ post }: { post: PostListItem }) {
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : '';
  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {post.cover_image && (
        <Link to={`/blog/${post.slug}`}>
          <img src={post.cover_image} alt={post.title} className="w-full h-40 object-cover" />
        </Link>
      )}
      <div className="p-4">
        <Link to={`/blog/${post.slug}`}>
          <h3 className="font-semibold text-gray-900 hover:text-blue-600 mb-1 line-clamp-2">{post.title}</h3>
        </Link>
        {post.summary && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{post.summary}</p>}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {post.tags.map((t) => <TagBadge key={t.slug} name={t.name} slug={t.slug} />)}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{post.author_name}</span>
          <span>{date} &middot; {post.view_count} 阅读</span>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 6: Create frontend/src/components/Pagination.tsx**

```tsx
interface Props { page: number; total: number; pageSize: number; onPageChange: (p: number) => void; }

export default function Pagination({ page, total, pageSize, onPageChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">&laquo;</button>
      {pages.map((p) => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 text-sm rounded border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">&raquo;</button>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add common components (Layout, Navbar, PostCard, Pagination)"
```

---

### Task 12: Auth Pages (Login + Register)

**Files:** Create `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`

- [ ] **Step 1: Create frontend/src/pages/Login.tsx**

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err: unknown) { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Login failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold text-center mb-8">登录</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="your@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '登录中...' : '登录'}
        </button>
        <p className="text-center text-sm text-gray-500">还没有账号？<Link to="/register" className="text-blue-600 hover:underline">注册</Link></p>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/pages/Register.tsx**

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('两次密码不一致'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    setLoading(true);
    try { await register(email, username, password); navigate('/'); }
    catch (err: unknown) { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold text-center mb-8">注册</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '注册中...' : '注册'}
        </button>
        <p className="text-center text-sm text-gray-500">已有账号？<Link to="/login" className="text-blue-600 hover:underline">登录</Link></p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx
git commit -m "feat: add Login and Register pages"
```

---

### Task 13: Blog Pages (Home, BlogList, BlogDetail)

**Files:** Create `frontend/src/pages/Home.tsx`, `frontend/src/pages/BlogList.tsx`, `frontend/src/pages/BlogDetail.tsx`

- [ ] **Step 1: Create frontend/src/pages/Home.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import PostCard from '../components/PostCard';
import type { PostListItem } from '../types';

export default function Home() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  useEffect(() => { fetchPosts({ page_size: 3 }).then((res) => setPosts(res.items)).catch(() => {}); }, []);

  return (
    <div>
      <section className="text-center py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">👨‍💻</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">你好，我是 <span className="text-blue-600">YourName</span></h1>
        <p className="text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">全栈开发者，热爱开源。这里记录我的技术实验、分享实用工具，偶尔也写写博客。</p>
        <div className="flex gap-3 justify-center">
          <Link to="/blog" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">📝 读博客</Link>
          <a href="https://github.com" target="_blank" rel="noopener" className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">💻 GitHub</a>
        </div>
      </section>
      {posts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">📝 最新文章</h2>
            <Link to="/blog" className="text-sm text-blue-600 hover:underline">查看全部 &rarr;</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/pages/BlogList.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import type { PostListItem } from '../types';

const ALL_TAGS = [
  { name: '前端', slug: 'frontend' }, { name: '后端', slug: 'backend' },
  { name: '工具', slug: 'tools' }, { name: 'AI', slug: 'ai' },
];

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const page = Number(searchParams.get('page')) || 1;
  const tag = searchParams.get('tag') || '';

  useEffect(() => {
    setLoading(true);
    fetchPosts({ page, page_size: 12, tag: tag || undefined, search: search || undefined })
      .then((res) => { setPosts(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, tag, search]);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📝 博客</h1>
      <div className="flex gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParams('search', search)}
          placeholder="搜索文章..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => updateParams('search', search)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">搜索</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => updateParams('tag', '')}
          className={`px-3 py-1 rounded-full text-sm ${!tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
        {ALL_TAGS.map((t) => (
          <button key={t.slug} onClick={() => updateParams('tag', t.slug)}
            className={`px-3 py-1 rounded-full text-sm ${tag === t.slug ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.name}</button>
        ))}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div>
      : posts.length === 0 ? <div className="text-center py-12 text-gray-400">暂无文章</div>
      : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          <Pagination page={page} total={total} pageSize={12} onPageChange={(p) => updateParams('page', String(p))} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/src/pages/BlogDetail.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPost, recordView } from '../api/posts';
import TagBadge from '../components/TagBadge';
import type { PostDetail } from '../types';

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return; setLoading(true);
    fetchPost(slug).then((p) => { setPost(p); recordView(slug); }).catch(() => setPost(null)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!post) return <div className="text-center py-20 text-gray-400">文章不存在</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/blog" className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; 返回博客</Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
      <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
        <span>{post.author_name}</span>
        <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : ''}</span>
        <span>{post.view_count} 阅读</span>
      </div>
      {post.tags.length > 0 && (
        <div className="flex gap-2 mb-6">{post.tags.map((t) => <TagBadge key={t.slug} name={t.name} slug={t.slug} />)}</div>
      )}
      <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Home.tsx frontend/src/pages/BlogList.tsx frontend/src/pages/BlogDetail.tsx
git commit -m "feat: add Home, BlogList, and BlogDetail pages"
```

---

### Task 14: Admin Pages

**Files:** Create `frontend/src/components/AdminGuard.tsx`, `frontend/src/pages/admin/AdminLayout.tsx`, `frontend/src/pages/admin/PostList.tsx`, `frontend/src/pages/admin/PostEditor.tsx`

- [ ] **Step 1: Create frontend/src/components/AdminGuard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AdminGuard() {
  const { isAuthenticated, isAdmin, fetchUser } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated) fetchUser().finally(() => setChecking(false));
    else setChecking(false);
  }, []);

  if (checking) return <div className="text-center py-20 text-gray-400">验证中...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="text-center py-20 text-gray-500">403 - 无权限访问</div>;
  return <Outlet />;
}
```

- [ ] **Step 2: Create frontend/src/pages/admin/AdminLayout.tsx**

```tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const links = [{ to: '/admin/posts', label: '📝 文章管理' }];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-52 bg-gray-900 text-gray-300 p-4 shrink-0">
        <div className="font-bold text-white mb-6 text-sm">🛠️ 管理后台</div>
        <nav className="space-y-1 text-sm">
          {links.map((link) => (
            <Link key={link.to} to={link.to}
              className={`block px-3 py-2 rounded ${location.pathname.startsWith(link.to) ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs text-gray-500">{user?.username}</div>
      </aside>
      <main className="flex-1 p-6 bg-gray-50"><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/src/pages/admin/PostList.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts, deletePost } from '../../api/posts';
import type { PostListItem } from '../../types';

export default function PostList() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const res = await fetchPosts({ page_size: 100 }); setPosts(res.items); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`确定删除 "${title}"？`)) return;
    try { await deletePost(id); setPosts((prev) => prev.filter((p) => p.id !== id)); }
    catch { alert('删除失败'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">📝 文章管理</h1>
        <Link to="/admin/posts/new" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">+ 写文章</Link>
      </div>
      {loading ? <div className="text-gray-400">加载中...</div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">标题</th>
                <th className="px-4 py-3 font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 font-medium text-gray-600">阅读</th>
                <th className="px-4 py-3 font-medium text-gray-600">日期</th>
                <th className="px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{post.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${post.published_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.published_at ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{post.view_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-3">
                    <Link to={`/admin/posts/${post.id}/edit`} className="text-blue-600 hover:underline">编辑</Link>
                    <button onClick={() => handleDelete(post.id, post.title)} className="text-red-500 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无文章</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/src/pages/admin/PostEditor.tsx**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPost, updatePost, fetchPost, uploadFile, type PostCreateData } from '../../api/posts';
import type { PostDetail } from '../../types';

export default function PostEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (id) fetchPost(id).then((p: PostDetail) => {
      setTitle(p.title); setContent(p.content); setTags(p.tags.map((t) => t.name).join(', '));
      setSummary(p.summary || ''); setStatus(p.status);
    }).catch(() => alert('文章不存在')).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title || !content) { alert('标题和内容不能为空'); return; }
    setSaving(true);
    const data: PostCreateData = {
      title, content, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      summary: summary || undefined, status,
    };
    try {
      if (isEdit && id) await updatePost(id, data);
      else await createPost(data);
      navigate('/admin/posts');
    } catch (err: unknown) { alert('保存失败: ' + ((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Unknown')); }
    finally { setSaving(false); }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadFile(file); setContent((prev) => prev + `\n![${file.name}](${url})\n`); }
    catch { alert('上传失败'); }
  }

  if (loading) return <div className="text-gray-400">加载中...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? '编辑文章' : '写文章'}</h1>
      <form onSubmit={handleSave} className="space-y-4 max-w-4xl">
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="文章标题" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={18}
              placeholder="Markdown 内容..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
          </div>
          <div className="w-56 space-y-3 shrink-0">
            <div>
              <label className="block text-xs text-gray-500 mb-1">标签（逗号分隔）</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="前端, 工具"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">摘要</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="一句话描述..."
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">草稿</option>
                <option value="published">发布</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">上传图片</label>
              <input type="file" accept="image/*" onChange={handleImageUpload}
                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '保存中...' : isEdit ? '更新' : '发布'}
              </button>
              <button type="button" onClick={() => navigate('/admin/posts')}
                className="flex-1 border border-gray-300 text-gray-700 py-1.5 rounded text-xs hover:bg-gray-50">取消</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AdminGuard.tsx frontend/src/pages/admin/
git commit -m "feat: add admin pages (AdminGuard, AdminLayout, PostList, PostEditor)"
```

---

### Task 15: Nginx + Seed Script + Docker Finalization

**Files:** Create `nginx/nginx.conf`, `backend/app/seed.py`. Modify `docker-compose.yml` (fix nginx volume).

- [ ] **Step 1: Create nginx/nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;

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

- [ ] **Step 2: Create backend/app/seed.py**

```python
"""Create initial admin user. Run: python -m app.seed"""
import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models.user import User
from app.services.auth_service import hash_password


async def seed():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        if result.scalar_one_or_none():
            print("Admin already exists")
            return
        admin = User(
            email="admin@example.com",
            username="admin",
            password_hash=hash_password("admin123"),
            is_admin=True,
        )
        db.add(admin)
        await db.commit()
        print("Admin created: admin@example.com / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 3: Update docker-compose.yml nginx service**

Ensure the nginx service has proper volume mounts. The key change is mounting `frontend_dist` into nginx:

```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./data/uploads:/usr/share/nginx/html/static:ro
      - frontend_dist:/app/dist:ro
    depends_on:
      - backend
      - frontend
```

- [ ] **Step 4: Commit**

```bash
git add nginx/nginx.conf backend/app/seed.py docker-compose.yml
git commit -m "feat: add Nginx config, seed admin script, finalize Docker"
```

---

### Task 16: Build & Run Verification

- [ ] **Step 1: Build and start all services**

```bash
docker compose up -d --build
```

Wait ~60 seconds for all services. Check: `docker compose ps` — all services Up.

- [ ] **Step 2: Verify backend health**

```bash
curl http://localhost/api/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 3: Verify user registration**

```bash
curl -s -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"test123"}'
```
Expected: JSON with `access_token`, `refresh_token`, `user`.

- [ ] **Step 4: Seed admin and verify login**

```bash
docker compose exec backend python -m app.seed
# Get admin token
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```
Expected: `is_admin: true` in user object.

- [ ] **Step 5: Create a published post via API**

```bash
TOKEN=$(curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -s -X POST http://localhost/api/admin/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Hello World","content":"# Hello\n\nThis is a **test** post.","tags":["blog"],"summary":"My first post","status":"published"}'
```

- [ ] **Step 6: Verify blog list and detail**

```bash
curl -s http://localhost/api/posts | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {d[\"total\"]}, First: {d[\"items\"][0][\"title\"]}')"
curl -s http://localhost/api/posts/hello-world | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Title: {d[\"title\"]}, HTML: {d[\"html\"][:50]}...')"
```

- [ ] **Step 7: Verify frontend serves HTML**

```bash
curl -s http://localhost/ | grep '<div id="root">'
```
Expected: Match found.

- [ ] **Step 8: Open browser**

Open `http://localhost` and verify:
- ✅ Homepage loads with hero
- ✅ `/blog` shows "Hello World" post
- ✅ `/blog/hello-world` renders article
- ✅ `/login` shows form
- ✅ `/admin` redirects to login, then after login shows admin panel
