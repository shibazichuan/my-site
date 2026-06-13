# 个人网站阶段二 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增工具箱（短链接、图片压缩、JSON格式化、Base64）、Umami 统计、ARQ 站点地图

**Architecture:** JSON/Base64 纯前端实现；短链接和图片压缩新增后端 API + 数据库表；Umami Docker 自建 + Nginx 反向代理；ARQ 定时任务挂载到现有 backend

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, Pillow, ARQ, React 18, Vite, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-06-14-personal-website-phase2-design.md`

---

## File Structure

```
New files:
frontend/src/
├── api/tools.ts                    # 短链接 + 图片 API
├── components/ToolLayout.tsx       # 工具页统一布局
├── components/CopyButton.tsx       # 一键复制组件
├── components/JsonTreeView.tsx     # JSON 树形视图
├── pages/tools/
│   ├── ToolsIndex.tsx              # 工具箱首页
│   ├── ShortLink.tsx               # 短链接页
│   ├── ImageCompress.tsx           # 图片压缩页
│   ├── JsonFormatter.tsx           # JSON 格式化页
│   └── Base64Tool.tsx              # Base64 编解码页

backend/app/
├── models/shortlink.py             # ShortLink 模型
├── models/image_record.py          # ImageRecord 模型
├── schemas/tools.py                # 工具请求/响应 schema
├── services/shortlink_service.py   # 短链接业务逻辑
├── services/image_service.py       # 图片压缩业务逻辑
├── api/tools.py                    # 工具 API 路由
├── tasks/__init__.py               # ARQ task 初始化
├── tasks/sitemap.py                # 站点地图生成任务

backend/alembic/versions/
└── 002_tools.py                    # 新增表 migration

Modified files:
frontend/src/
├── App.tsx                         # 新增 /tools/* 路由
├── types/index.ts                  # 新增 Tool 相关类型
├── components/Navbar.tsx           # 新增"工具箱"入口
├── components/AdminGuard.tsx       # 改为 AuthGuard，支持 requireAdmin prop
├── index.html                      # 新增 Umami script tag

backend/app/
├── main.py                         # 注册 tools router, /r/ redirect
├── storage/local.py                # 新增 save_image 方法

docker-compose.yml                  # 新增 umami + umami-db 服务
nginx/nginx.conf                    # 新增 /umami/ + /sitemap.xml
.env.example                        # 新增 UMAMI 相关变量
.env                                # 同上
```

---

### Task 1: New Models + Alembic Migration

**Files:**
- Create: `backend/app/models/shortlink.py`
- Create: `backend/app/models/image_record.py`
- Create: `backend/alembic/versions/002_tools.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create ShortLink model**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base


class ShortLink(Base):
    __tablename__ = "shortlinks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    short_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    click_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User")

```

- [ ] **Step 2: Create ImageRecord model**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base


class ImageRecord(Base):
    __tablename__ = "image_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_size: Mapped[int] = mapped_column(Integer, nullable=False)
    compressed_size: Mapped[int] = mapped_column(Integer, nullable=False)
    compressed_path: Mapped[str] = mapped_column(String(500), nullable=False)
    quality: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User")
```

- [ ] **Step 3: Update models/__init__.py to import new models**

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
```

- [ ] **Step 4: Create Alembic migration 002_tools.py**

```python
"""add shortlinks and image_records

Revision ID: 002
Revises: 001
Create Date: 2026-06-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("shortlinks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("short_code", sa.String(20), unique=True, nullable=False),
        sa.Column("original_url", sa.Text(), nullable=False),
        sa.Column("click_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_shortlinks_code", "shortlinks", ["short_code"])
    op.create_index("idx_shortlinks_user", "shortlinks", ["user_id"])

    op.create_table("image_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("original_size", sa.Integer(), nullable=False),
        sa.Column("compressed_size", sa.Integer(), nullable=False),
        sa.Column("compressed_path", sa.String(500), nullable=False),
        sa.Column("quality", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_image_records_user", "image_records", ["user_id"])


def downgrade() -> None:
    op.drop_table("image_records")
    op.drop_table("shortlinks")
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/alembic/versions/002_tools.py
git commit -m "feat: add ShortLink and ImageRecord models with migration"
```

---

### Task 2: Backend — Image Storage Extension

**Files:**
- Modify: `backend/app/storage/local.py`
- Modify: `backend/pyproject.toml` (add Pillow)

- [ ] **Step 1: Add Pillow to pyproject.toml**

Edit `backend/pyproject.toml`, add to dependencies:
```toml
    "Pillow>=10.0.0",
```

- [ ] **Step 2: Extend LocalStorage with image save method**

Edit `backend/app/storage/local.py`, replace content:

```python
import uuid
import os
from io import BytesIO
from fastapi import UploadFile, HTTPException, status
from PIL import Image
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

    async def save_compressed_image(
        self, file: UploadFile, quality: int = 80
    ) -> dict:
        """Compress and save an image, return metadata dict."""
        ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported image format. Use JPG, PNG, or WebP.",
            )
        content = await file.read()
        original_size = len(content)

        img = Image.open(BytesIO(content))
        filename = f"{uuid.uuid4().hex}.jpg"
        compressed_dir = os.path.join(self.base_dir, "compressed")
        os.makedirs(compressed_dir, exist_ok=True)
        filepath = os.path.join(compressed_dir, filename)

        # Convert to RGB if RGBA (PNG) before saving as JPEG
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(filepath, "JPEG", quality=quality, optimize=True)

        compressed_size = os.path.getsize(filepath)
        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compressed_path": f"/static/compressed/{filename}",
            "quality": quality,
        }
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/storage/local.py backend/pyproject.toml
git commit -m "feat: add image compression storage method"
```

---

### Task 3: Backend — Schemas for Tools

**Files:**
- Create: `backend/app/schemas/tools.py`

- [ ] **Step 1: Create schemas/tools.py**

```python
from datetime import datetime
from pydantic import BaseModel, HttpUrl


# ---- ShortLink ----
class ShortLinkCreate(BaseModel):
    original_url: str


class ShortLinkResponse(BaseModel):
    id: str
    short_code: str
    short_url: str
    original_url: str
    click_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedShortLinks(BaseModel):
    items: list[ShortLinkResponse]
    total: int
    page: int
    page_size: int


# ---- Image ----
class ImageRecordResponse(BaseModel):
    id: str
    original_name: str
    original_size: int
    compressed_size: int
    url: str
    quality: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedImages(BaseModel):
    items: list[ImageRecordResponse]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/tools.py
git commit -m "feat: add tools schemas (ShortLink, ImageRecord)"
```

---

### Task 4: Backend — ShortLink + Image Services

**Files:**
- Create: `backend/app/services/shortlink_service.py`
- Create: `backend/app/services/image_service.py`

- [ ] **Step 1: Create shortlink_service.py**

```python
import secrets
import string
import uuid
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.shortlink import ShortLink

_CODE_CHARS = string.ascii_letters + string.digits


def _generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(_CODE_CHARS) for _ in range(length))


async def create_shortlink(db: AsyncSession, user_id: uuid.UUID, original_url: str) -> ShortLink:
    code = _generate_code()
    # Ensure uniqueness
    for _ in range(5):
        existing = await db.execute(select(ShortLink).where(ShortLink.short_code == code))
        if not existing.scalar_one_or_none():
            break
        code = _generate_code()

    link = ShortLink(
        user_id=user_id,
        short_code=code,
        original_url=original_url,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


async def get_user_shortlinks(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> tuple[list[ShortLink], int]:
    query = select(ShortLink).where(ShortLink.user_id == user_id).order_by(ShortLink.created_at.desc())
    count_query = select(func.count(ShortLink.id)).where(ShortLink.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total


async def delete_shortlink(db: AsyncSession, link_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(ShortLink).where(and_(ShortLink.id == link_id, ShortLink.user_id == user_id))
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found")
    await db.delete(link)
    await db.commit()


async def get_shortlink_by_code(db: AsyncSession, code: str) -> ShortLink:
    result = await db.execute(select(ShortLink).where(ShortLink.short_code == code))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found")
    link.click_count += 1
    await db.commit()
    return link


def shortlink_to_response(link: ShortLink, base_url: str = "http://localhost") -> dict:
    return {
        "id": str(link.id),
        "short_code": link.short_code,
        "short_url": f"{base_url}/r/{link.short_code}",
        "original_url": link.original_url,
        "click_count": link.click_count,
        "created_at": link.created_at,
    }
```

- [ ] **Step 2: Create image_service.py**

```python
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.models.image_record import ImageRecord
from app.storage.local import LocalStorage


async def compress_and_save(
    db: AsyncSession, user_id: uuid.UUID, file: UploadFile, quality: int = 80
) -> ImageRecord:
    storage = LocalStorage()
    meta = await storage.save_compressed_image(file, quality)

    record = ImageRecord(
        user_id=user_id,
        original_name=file.filename or "unknown",
        original_size=meta["original_size"],
        compressed_size=meta["compressed_size"],
        compressed_path=meta["compressed_path"],
        quality=meta["quality"],
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_user_images(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> tuple[list[ImageRecord], int]:
    query = select(ImageRecord).where(ImageRecord.user_id == user_id).order_by(ImageRecord.created_at.desc())
    count_query = select(func.count(ImageRecord.id)).where(ImageRecord.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total


def image_record_to_response(record: ImageRecord) -> dict:
    return {
        "id": str(record.id),
        "original_name": record.original_name,
        "original_size": record.original_size,
        "compressed_size": record.compressed_size,
        "url": record.compressed_path,
        "quality": record.quality,
        "created_at": record.created_at,
    }
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/shortlink_service.py backend/app/services/image_service.py
git commit -m "feat: add shortlink and image compression services"
```

---

### Task 5: Backend — Tools API Routes

**Files:**
- Create: `backend/app/api/tools.py`

- [ ] **Step 1: Create api/tools.py**

```python
import uuid
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.tools import (
    ShortLinkCreate, ShortLinkResponse, PaginatedShortLinks,
    ImageRecordResponse, PaginatedImages,
)
from app.services.shortlink_service import (
    create_shortlink, get_user_shortlinks, delete_shortlink, shortlink_to_response,
)
from app.services.image_service import compress_and_save, get_user_images, image_record_to_response

router = APIRouter(dependencies=[Depends(get_current_user)])


# ---- Short Links ----
@router.post("/shortlinks", response_model=ShortLinkResponse, status_code=201)
async def create_link(data: ShortLinkCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    link = await create_shortlink(db, user.id, data.original_url)
    return shortlink_to_response(link)


@router.get("/shortlinks", response_model=PaginatedShortLinks)
async def list_links(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_shortlinks(db, user.id, page=page, page_size=page_size)
    return PaginatedShortLinks(
        items=[shortlink_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/shortlinks/{link_id}", status_code=204)
async def delete_link(link_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await delete_shortlink(db, link_id, user.id)


# ---- Images ----
@router.post("/images/upload", response_model=ImageRecordResponse, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    quality: int = Form(80),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await compress_and_save(db, user.id, file, quality)
    return image_record_to_response(record)


@router.get("/images", response_model=PaginatedImages)
async def list_images(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_images(db, user.id, page=page, page_size=page_size)
    return PaginatedImages(
        items=[image_record_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/tools.py
git commit -m "feat: add tools API routes (shortlink + image)"
```

---

### Task 6: Backend — Shortlink Redirect + Main.py Update

**Files:**
- Modify: `backend/app/main.py` (register tools router, add /r/ redirect)

- [ ] **Step 1: Update main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_redis, async_session
from app.api import auth, posts, admin, tools
from app.services.shortlink_service import get_shortlink_by_code


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
app.include_router(tools.router, prefix="/api/tools", tags=["tools"])


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

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register tools router and shortlink redirect endpoint"
```

---

### Task 7: Backend — ARQ Sitemap Task

**Files:**
- Create: `backend/app/tasks/__init__.py`
- Create: `backend/app/tasks/sitemap.py`
- Modify: `backend/pyproject.toml` (add arq)

- [ ] **Step 1: Add arq to pyproject.toml**

Edit `backend/pyproject.toml`, add to dependencies:
```toml
    "arq>=0.26.0",
```

- [ ] **Step 2: Create tasks/__init__.py** (empty file)

- [ ] **Step 3: Create tasks/sitemap.py**

```python
import os
from datetime import datetime
from sqlalchemy import select
from app.database import async_session
from app.models.post import Post
from app.config import settings


async def generate_sitemap(ctx: dict) -> None:
    """Generate sitemap.xml for all published posts."""
    async with async_session() as db:
        result = await db.execute(
            select(Post.slug, Post.updated_at)
            .where(Post.status == "published")
            .order_by(Post.published_at.desc())
        )
        posts = result.all()

    site_url = getattr(settings, "site_url", "http://localhost")
    base_url = site_url.rstrip("/")
    urls = []
    urls.append(f"  <url><loc>{base_url}</loc><changefreq>daily</changefreq></url>")
    urls.append(f"  <url><loc>{base_url}/blog</loc><changefreq>daily</changefreq></url>")
    for slug, updated in posts:
        lastmod = updated.strftime("%Y-%m-%d") if updated else ""
        urls.append(
            f"  <url><loc>{base_url}/blog/{slug}</loc>"
            f"<lastmod>{lastmod}</lastmod><changefreq>weekly</changefreq></url>"
        )

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>"

    output_dir = os.path.join(settings.upload_dir, "compressed")
    os.makedirs(output_dir, exist_ok=True)
    # Write directly to uploads dir so nginx can serve it
    filepath = os.path.join(settings.upload_dir, "sitemap.xml")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(xml)

    print(f"[{datetime.now()}] Sitemap generated: {len(posts) + 2} URLs")
```

Note: ARQ worker config (schedule entries) is defined in Task 18 when we update Docker Compose. The task file just defines the callable.

- [ ] **Step 4: Commit**

```bash
git add backend/app/tasks/ backend/pyproject.toml
git commit -m "feat: add ARQ sitemap generation task"
```

---

### Task 8: Frontend — Types + API Client for Tools

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/tools.ts`

- [ ] **Step 1: Add tool types to types/index.ts**

Append to `frontend/src/types/index.ts`:

```typescript
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
```

- [ ] **Step 2: Create api/tools.ts**

```typescript
import client from './client';
import type { ShortLinkItem, PaginatedShortLinks, ImageRecordItem, PaginatedImages } from '../types';

// ShortLinks
export async function createShortLink(original_url: string): Promise<ShortLinkItem> {
  const { data } = await client.post<ShortLinkItem>('/tools/shortlinks', { original_url });
  return data;
}
export async function fetchShortLinks(page = 1, page_size = 20): Promise<PaginatedShortLinks> {
  const { data } = await client.get<PaginatedShortLinks>('/tools/shortlinks', { params: { page, page_size } });
  return data;
}
export async function deleteShortLink(id: string): Promise<void> {
  await client.delete(`/tools/shortlinks/${id}`);
}

// Images
export async function uploadImage(file: File, quality = 80): Promise<ImageRecordItem> {
  const form = new FormData(); form.append('file', file); form.append('quality', String(quality));
  const { data } = await client.post<ImageRecordItem>('/tools/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
export async function fetchImages(page = 1, page_size = 20): Promise<PaginatedImages> {
  const { data } = await client.get<PaginatedImages>('/tools/images', { params: { page, page_size } });
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/tools.ts
git commit -m "feat: add frontend types and API client for tools"
```

---

### Task 9: Frontend — Common Tool Components

**Files:**
- Create: `frontend/src/components/ToolLayout.tsx`
- Create: `frontend/src/components/CopyButton.tsx`
- Modify: `frontend/src/components/AdminGuard.tsx` → add `requireAdmin` prop, rename export to `AuthGuard`

- [ ] **Step 1: Create ToolLayout.tsx**

```tsx
import type { ReactNode } from 'react';

interface Props { title: string; description: string; children: ReactNode; }

export default function ToolLayout({ title, description, children }: Props) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
      <p className="text-sm text-gray-500 mb-6">{description}</p>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create CopyButton.tsx**

```tsx
import { useState } from 'react';

interface Props { text: string; label?: string; }

export default function CopyButton({ text, label = '复制' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={handleCopy}
      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
        copied ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}>
      {copied ? '✓ 已复制' : label}
    </button>
  );
}
```

- [ ] **Step 3: Update AdminGuard to AuthGuard with requireAdmin prop**

Replace `frontend/src/components/AdminGuard.tsx` content:

```tsx
import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props { requireAdmin?: boolean; }

export default function AuthGuard({ requireAdmin = false }: Props) {
  const { isAuthenticated, isAdmin, fetchUser } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated) fetchUser().finally(() => setChecking(false));
    else setChecking(false);
  }, []);

  if (checking) return <div className="text-center py-20 text-gray-400">验证中...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <div className="text-center py-20 text-gray-500">403 - 无权限访问</div>;
  return <Outlet />;
}
```

- [ ] **Step 4: Update App.tsx to use AuthGuard for admin routes**

Edit `frontend/src/App.tsx`:
- Change import from `import AdminGuard from './components/AdminGuard'` to `import AuthGuard from './components/AdminGuard'`
- Change `<Route element={<AdminGuard />}>` to `<Route element={<AuthGuard requireAdmin />}>`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ToolLayout.tsx frontend/src/components/CopyButton.tsx frontend/src/components/AdminGuard.tsx frontend/src/App.tsx
git commit -m "feat: add ToolLayout, CopyButton, and refactor AuthGuard"
```

---

### Task 10: Frontend — ToolsIndex Page

**Files:**
- Create: `frontend/src/pages/tools/ToolsIndex.tsx`

- [ ] **Step 1: Create ToolsIndex.tsx**

```tsx
import { Link } from 'react-router-dom';

const TOOLS = [
  { to: '/tools/shortlink', icon: '🔗', title: '短链接', desc: '生成短链接，查看点击统计' },
  { to: '/tools/image', icon: '🖼️', title: '图片压缩', desc: '上传图片，在线压缩优化体积' },
  { to: '/tools/json', icon: '📋', title: 'JSON 格式化', desc: '格式化/压缩 JSON，树形视图，JSONPath 搜索' },
  { to: '/tools/base64', icon: '🔐', title: 'Base64 编解码', desc: '文本和文件 Base64 编码/解码' },
];

export default function ToolsIndex() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">🛠️ 工具箱</h1>
      <p className="text-sm text-gray-500 mb-8">实用工具，提升效率</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <Link key={tool.to} to={tool.to}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="text-3xl mb-3">{tool.icon}</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1">{tool.title}</h3>
            <p className="text-sm text-gray-500">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/tools/ToolsIndex.tsx
git commit -m "feat: add ToolsIndex page"
```

---

### Task 11: Frontend — ShortLink Page

**Files:**
- Create: `frontend/src/pages/tools/ShortLink.tsx`

- [ ] **Step 1: Create ShortLink.tsx**

```tsx
import { useState, useEffect, type FormEvent } from 'react';
import { createShortLink, fetchShortLinks, deleteShortLink } from '../../api/tools';
import ToolLayout from '../../components/ToolLayout';
import CopyButton from '../../components/CopyButton';
import Pagination from '../../components/Pagination';
import type { ShortLinkItem } from '../../types';

export default function ShortLink() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [links, setLinks] = useState<ShortLinkItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadLinks() {
    try { const res = await fetchShortLinks(page); setLinks(res.items); setTotal(res.total); }
    catch { /* ignore */ }
  }
  useEffect(() => { loadLinks(); }, [page]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!url) { setError('请输入链接'); return; }
    setLoading(true);
    try { await createShortLink(url); setUrl(''); setPage(1); await loadLinks(); }
    catch { setError('生成失败，请重试'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除？')) return;
    try { await deleteShortLink(id); await loadLinks(); } catch { /* ignore */ }
  }

  return (
    <ToolLayout title="🔗 短链接" description="把长链接变短，方便分享">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
          placeholder="粘贴长链接..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '生成中...' : '生成'}
        </button>
      </form>
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>}

      {links.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">短链接</th>
                  <th className="px-4 py-3 font-medium text-gray-600">原始链接</th>
                  <th className="px-4 py-3 font-medium text-gray-600">点击</th>
                  <th className="px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={link.short_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline text-xs">{link.short_url}</a>
                      <CopyButton text={link.short_url} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{link.original_url}</td>
                    <td className="px-4 py-3 text-gray-500">{link.click_count}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(link.id)} className="text-red-500 hover:underline text-xs">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={20} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">还没有短链接</div>
      )}
    </ToolLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/tools/ShortLink.tsx
git commit -m "feat: add ShortLink page"
```

---

### Task 12: Frontend — ImageCompress Page

**Files:**
- Create: `frontend/src/pages/tools/ImageCompress.tsx`

- [ ] **Step 1: Create ImageCompress.tsx**

```tsx
import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { uploadImage, fetchImages } from '../../api/tools';
import ToolLayout from '../../components/ToolLayout';
import Pagination from '../../components/Pagination';
import type { ImageRecordItem } from '../../types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageRecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadImages() {
    try { const res = await fetchImages(page); setImages(res.items); setTotal(res.total); }
    catch { /* ignore */ }
  }
  useEffect(() => { loadImages(); }, [page]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!file) { setError('请选择图片'); return; }
    setLoading(true);
    try { await uploadImage(file, quality); setFile(null); setPage(1); await loadImages(); }
    catch { setError('压缩失败，请重试'); }
    finally { setLoading(false); }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  return (
    <ToolLayout title="🖼️ 图片压缩" description="上传图片，在线压缩减小体积">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择图片</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange}
            className="w-full text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">压缩质量: {quality}%</label>
          <input type="range" min="10" max="100" value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-blue-600" />
        </div>
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '压缩中...' : '上传压缩'}
        </button>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
      </form>

      {images.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">文件名</th>
                  <th className="px-4 py-3 font-medium text-gray-600">原始大小</th>
                  <th className="px-4 py-3 font-medium text-gray-600">压缩后</th>
                  <th className="px-4 py-3 font-medium text-gray-600">比率</th>
                  <th className="px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {images.map((img) => (
                  <tr key={img.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 text-xs">{img.original_name}</td>
                    <td className="px-4 py-3 text-gray-500">{formatSize(img.original_size)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatSize(img.compressed_size)}</td>
                    <td className="px-4 py-3">
                      <span className="text-green-600 text-xs font-medium">
                        ↓ {((1 - img.compressed_size / img.original_size) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={img.url} target="_blank" rel="noopener" download
                        className="text-blue-600 hover:underline text-xs">下载</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={20} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">还没有压缩记录</div>
      )}
    </ToolLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/tools/ImageCompress.tsx
git commit -m "feat: add ImageCompress page"
```

---

### Task 13: Frontend — JsonFormatter Page

**Files:**
- Create: `frontend/src/pages/tools/JsonFormatter.tsx`
- Create: `frontend/src/components/JsonTreeView.tsx`

- [ ] **Step 1: Create JsonTreeView.tsx**

```tsx
import { useState } from 'react';

function renderValue(val: unknown): string {
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return `"${val}"`;
  return JSON.stringify(val);
}

interface TreeNodeProps { name: string; value: unknown; depth: number; }

function TreeNode({ name, value, depth }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 3);
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    return (
      <div className="ml-4" style={{ paddingLeft: depth * 16 }}>
        <span className="text-blue-700">{name}</span>
        <span className="text-gray-400">: </span>
        <span className={typeof value === 'string' ? 'text-green-600' : 'text-orange-600'}>
          {renderValue(value)}
        </span>
      </div>
    );
  }

  const entries = isObject ? Object.entries(value as Record<string, unknown>) : (value as unknown[]).map((v, i) => [String(i), v]);
  const bracket = isObject ? ['{', '}'] : ['[', ']'];

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="cursor-pointer hover:text-blue-600" onClick={() => setOpen(!open)}>
        <span className="text-gray-400 mr-1">{open ? '▼' : '▶'}</span>
        <span className="text-blue-700">{name}</span>
        <span className="text-gray-400"> {bracket[0]}</span>
        {!open && <span className="text-gray-400"> ... {bracket[1]}</span>}
      </div>
      {open && (
        <>
          {entries.map(([k, v]) => (
            <TreeNode key={k} name={k} value={v} depth={depth + 1} />
          ))}
          <div style={{ paddingLeft: depth * 16 }}>
            <span className="text-gray-400">{bracket[1]}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function JsonTreeView({ data }: { data: unknown }) {
  if (data === null) return <div className="text-gray-400 text-sm p-4">null</div>;
  const isArray = Array.isArray(data);
  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>);
  const bracket = isArray ? ['[', ']'] : ['{', '}'];
  return (
    <div className="font-mono text-xs leading-relaxed p-4 overflow-auto">
      <div className="text-gray-400">{bracket[0]}</div>
      {entries.map(([k, v]) => (
        <TreeNode key={k} name={k} value={v} depth={0} />
      ))}
      <div className="text-gray-400">{bracket[1]}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create JsonFormatter.tsx**

```tsx
import { useState } from 'react';
import ToolLayout from '../../components/ToolLayout';
import CopyButton from '../../components/CopyButton';
import JsonTreeView from '../../components/JsonTreeView';

type ViewMode = 'text' | 'tree';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [jsonPath, setJsonPath] = useState('');
  const [pathResult, setPathResult] = useState('');

  function format() {
    setError(''); setPathResult('');
    try {
      const obj = JSON.parse(input);
      setParsed(obj);
      setOutput(JSON.stringify(obj, null, indentSize));
    } catch (e: unknown) {
      setError((e as Error).message);
      setParsed(null);
      setOutput('');
    }
  }

  function compress() {
    setError(''); setPathResult('');
    try {
      const obj = JSON.parse(input);
      setParsed(obj);
      setOutput(JSON.stringify(obj));
    } catch (e: unknown) {
      setError((e as Error).message);
      setParsed(null);
      setOutput('');
    }
  }

  function searchPath() {
    if (!parsed || !jsonPath) return;
    try {
      const parts = jsonPath.split('.').map(p => p.trim()).filter(Boolean);
      let result: unknown = parsed;
      for (const part of parts) {
        if (result && typeof result === 'object') {
          result = Array.isArray(result)
            ? (result as unknown[])[parseInt(part)]
            : (result as Record<string, unknown>)[part];
        } else { throw new Error('Path not found'); }
      }
      setPathResult(JSON.stringify(result, null, 2));
    } catch (e: unknown) {
      setPathResult(`Error: ${(e as Error).message}`);
    }
  }

  return (
    <ToolLayout title="📋 JSON 格式化" description="格式化、压缩 JSON，支持树形视图和 JSONPath 搜索">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">输入</label>
            <div className="flex gap-1">
              <button onClick={format} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">格式化</button>
              <button onClick={compress} className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700">压缩</button>
            </div>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder='{"key":"value"}' rows={16}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">输出</label>
            <div className="flex items-center gap-2">
              <select value={indentSize} onChange={(e) => { setIndentSize(Number(e.target.value)); if (output) format(); }}
                className="border border-gray-300 rounded px-2 py-1 text-xs outline-none">
                <option value={2}>2空格</option><option value={4}>4空格</option>
              </select>
              <button onClick={() => setViewMode(v => v === 'text' ? 'tree' : 'text')}
                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                {viewMode === 'text' ? '树形' : '文本'}
              </button>
              {output && <CopyButton text={output} />}
            </div>
          </div>
          {error ? (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded border border-red-200 font-mono">{error}</div>
          ) : viewMode === 'tree' && parsed ? (
            <div className="border border-gray-300 rounded-lg bg-white overflow-auto" style={{ maxHeight: '320px' }}>
              <JsonTreeView data={parsed} />
            </div>
          ) : (
            <textarea readOnly value={output} rows={16}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none resize-y" />
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input value={jsonPath} onChange={(e) => setJsonPath(e.target.value)}
          placeholder="JSONPath, 如: user.address.city" onKeyDown={(e) => e.key === 'Enter' && searchPath()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={searchPath}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-blue-700">搜索</button>
      </div>
      {pathResult && (
        <textarea readOnly value={pathResult} rows={4}
          className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none resize-y" />
      )}
    </ToolLayout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/tools/JsonFormatter.tsx frontend/src/components/JsonTreeView.tsx
git commit -m "feat: add JsonFormatter and JsonTreeView components"
```

---

### Task 14: Frontend — Base64Tool Page

**Files:**
- Create: `frontend/src/pages/tools/Base64Tool.tsx`

- [ ] **Step 1: Create Base64Tool.tsx**

```tsx
import { useState, type ChangeEvent } from 'react';
import ToolLayout from '../../components/ToolLayout';
import CopyButton from '../../components/CopyButton';

type TabKey = 'encode' | 'decode';
type Mode = 'text' | 'file';

const HISTORY_KEY = 'base64_history';

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(item: string) {
  const history = loadHistory().filter(h => h !== item);
  history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export default function Base64Tool() {
  const [tab, setTab] = useState<TabKey>('encode');
  const [mode, setMode] = useState<Mode>('text');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>(loadHistory());

  function handleEncode() {
    setError('');
    try {
      const result = btoa(input);
      setOutput(result);
      saveHistory(`编码: ${input.slice(0, 50)}...`);
      setHistory(loadHistory());
    } catch (e: unknown) { setError((e as Error).message); }
  }

  function handleDecode() {
    setError('');
    try {
      const result = atob(input);
      setOutput(result);
      saveHistory(`解码: ${input.slice(0, 50)}...`);
      setHistory(loadHistory());
    } catch (e: unknown) { setError('解码失败，请检查输入是否为有效 Base64'); }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (tab === 'encode') setInput(base64);
      else {
        try { setOutput(atob(base64)); } catch { setError('文件解码失败'); }
      }
    };
    reader.onerror = () => setError('文件读取失败');
    if (tab === 'encode') reader.readAsDataURL(file);
    else reader.readAsDataURL(file);
  }

  const isEncode = tab === 'encode';

  return (
    <ToolLayout title="🔐 Base64 编解码" description="对文本或文件进行 Base64 编码和解码">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['encode', 'decode'] as TabKey[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setInput(''); setOutput(''); setError(''); }}
              className={`px-4 py-1.5 text-sm rounded-lg ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'encode' ? '编码' : '解码'}
            </button>
          ))}
          <div className="flex ml-auto gap-1">
            {(['text', 'file'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs rounded ${mode === m ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {m === 'text' ? '📝 文本' : '📁 文件'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'file' && (
          <div>
            <input type="file" onChange={handleFile}
              className="w-full text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isEncode ? '原文' : 'Base64 密文'}</label>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10}
              placeholder={isEncode ? '输入要编码的文本...' : '粘贴 Base64 字符串...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{isEncode ? 'Base64 结果' : '解码结果'}</label>
              {output && <CopyButton text={output} />}
            </div>
            <textarea readOnly value={output} rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none resize-y" />
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded">{error}</div>}

        <button onClick={isEncode ? handleEncode : handleDecode}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          {isEncode ? '编码 →' : '← 解码'}
        </button>

        {history.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">历史记录 ({history.length})</summary>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {history.map((item, i) => (
                <div key={i} className="text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded truncate">{item}</div>
              ))}
            </div>
          </details>
        )}
      </div>
    </ToolLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/tools/Base64Tool.tsx
git commit -m "feat: add Base64Tool page"
```

---

### Task 15: Frontend — Routing + Navbar Update

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

- [ ] **Step 1: Update App.tsx with tools routes**

Replace `frontend/src/App.tsx` content:

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
    </Routes>
  )
}
```

- [ ] **Step 2: Update Navbar with tools link**

Edit `frontend/src/components/Navbar.tsx`, add the tools link after the blog link. Change:
```tsx
          <Link to="/blog" className="text-sm text-gray-600 hover:text-gray-900">博客</Link>
```
to:
```tsx
          <Link to="/blog" className="text-sm text-gray-600 hover:text-gray-900">博客</Link>
          {isAuthenticated && <Link to="/tools" className="text-sm text-gray-600 hover:text-gray-900">工具箱</Link>}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: add tools routes and navbar link"
```

---

### Task 16: Docker — Umami Services

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `frontend/index.html` (Umami script)

- [ ] **Step 1: Add umami services to docker-compose.yml**

Add after the `redis` service section:

```yaml
  umami-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${UMAMI_DB_PASSWORD:-umami-secret}
      POSTGRES_DB: umami
    volumes:
      - ./data/umami-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 5s
      timeout: 5s
      retries: 5

  umami:
    image: docker.umami.dev/umami-software/umami:postgresql-latest
    environment:
      DATABASE_URL: postgresql://umami:${UMAMI_DB_PASSWORD:-umami-secret}@umami-db:5432/umami
      APP_SECRET: ${UMAMI_APP_SECRET:-change-me}
    depends_on:
      umami-db:
        condition: service_healthy
```

- [ ] **Step 2: Update nginx depends_on**

Add `umami` to nginx `depends_on`:
```yaml
    depends_on:
      - backend
      - frontend
      - umami
```

- [ ] **Step 3: Add env vars to .env and .env.example**

Append to `.env` and `.env.example`:
```
UMAMI_DB_PASSWORD=umami-secret
UMAMI_APP_SECRET=change-me-to-random
```

- [ ] **Step 4: Add Umami script to index.html**

In `frontend/index.html`, add inside `<head>`:
```html
    <script defer src="/umami/script.js" data-website-id="00000000-0000-0000-0000-000000000000"></script>
```

Note: `data-website-id` should be replaced with the actual website ID after creating it in Umami admin panel at `/umami/` (default login: admin / umami).

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env .env.example frontend/index.html
git commit -m "feat: add Umami analytics service to Docker Compose"
```

---

### Task 17: Nginx — /umami/ and /sitemap.xml

**Files:**
- Modify: `nginx/nginx.conf`

- [ ] **Step 1: Add location blocks to nginx.conf**

After the `/static/` location block, add:

```nginx
    location /r/ {
        proxy_pass http://backend:8000/r/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 10s;
    }

    location /umami/ {
        proxy_pass http://umami:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location = /sitemap.xml {
        alias /usr/share/nginx/html/static/sitemap.xml;
    }
```

- [ ] **Step 2: Commit**

```bash
git add nginx/nginx.conf
git commit -m "feat: add nginx routing for umami and sitemap"
```

---

### Task 18: Build & Verify

- [ ] **Step 1: Rebuild and start all services**

```bash
docker compose down
docker compose up -d --build
```

Wait ~120 seconds for all services to start.

- [ ] **Step 2: Run DB migration**

```bash
docker exec my-site-backend-1 alembic upgrade head
```

Expected: migration runs without error.

- [ ] **Step 3: Verify tools API**

```bash
# Login as test user
TOKEN=$(curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create short link
curl -s -X POST http://localhost/api/tools/shortlinks -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"original_url":"https://example.com"}'

# List short links
curl -s http://localhost/api/tools/shortlinks -H "Authorization: Bearer $TOKEN"
```

Expected: Short link created and listed successfully.

- [ ] **Step 4: Verify frontend pages**

Open browser, log in as test@test.com / test123, navigate to:
- `/tools` — see 4 tool cards
- `/tools/shortlink` — create and list short links
- `/tools/json` — format, compress, tree view
- `/tools/base64` — encode/decode text

- [ ] **Step 5: Verify Umami**

Open `http://localhost/umami/`, login with admin/umami, create a website, update `data-website-id` in `index.html`.

- [ ] **Step 6: Verify sitemap**

```bash
curl -s http://localhost/sitemap.xml
```

Expected: XML sitemap with homepage + blog + posts.

- [ ] **Step 7: Commit final changes**

```bash
git add -A && git commit -m "chore: finalize Phase 2 build and verification"
```
