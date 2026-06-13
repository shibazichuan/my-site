# 个人网站 - 阶段一：地基 设计文档

> **日期**: 2026-06-13
> **状态**: 已确认
> **概述**: 搭建个人网站基础设施，包含首页、博客系统、用户认证、管理后台

---

## 1. 项目目标

快速上线一个可访问、有内容、能登录的个人网站。博客开始积累 SEO。

## 2. 技术栈

| 层 | 选型 | 说明 |
|---|------|------|
| 前端 | React 18 + Vite | SPA，React Router v6 路由 |
| 样式 | TailwindCSS | 原子化 CSS，快速开发 |
| 状态管理 | Zustand | 轻量，存 token 和用户信息 |
| HTTP | Axios | 请求拦截器自动带 token |
| 后端 | Python FastAPI | REST API |
| ORM | SQLAlchemy 2.0 + Alembic | 异步模型 + 迁移 |
| 任务队列 | ARQ | 基于 Redis，轻量替代 Celery |
| 数据库 | PostgreSQL 16 | 主存储 |
| 缓存 | Redis 7 | Session、缓存、ARQ 队列 |
| 文件存储 | 本地磁盘 + Nginx serve | 代码抽象接口，后期可换 S3 |
| 部署 | Docker Compose | 一键启动全部服务 |
| 反向代理 | Nginx | SSL 终端 + 静态资源 serve |

## 3. 项目目录结构

```
my-site/
├── docker-compose.yml
├── .env
├── .gitignore
├── nginx/
│   ├── nginx.conf
│   └── ssl/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/              # Axios 封装 + API 函数
│       ├── components/       # 通用 UI 组件
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── BlogList.tsx
│       │   ├── BlogDetail.tsx
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   └── admin/
│       │       ├── Dashboard.tsx
│       │       ├── PostList.tsx
│       │       └── PostEditor.tsx
│       ├── hooks/
│       ├── store/            # Zustand stores
│       └── utils/
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── api/              # 路由层
│       │   ├── auth.py
│       │   ├── posts.py
│       │   └── admin.py
│       ├── services/         # 业务逻辑
│       ├── models/           # SQLAlchemy 模型
│       ├── schemas/          # Pydantic 请求/响应
│       ├── middleware/       # JWT、CORS、限流
│       └── storage/          # 文件存储抽象
└── data/                     # 持久化数据目录
```

## 4. 数据库设计

### 4.1 users 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK, 自动生成 | 主键 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 邮箱，用于登录 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 显示名 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 哈希 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否激活 |
| is_admin | BOOLEAN | DEFAULT FALSE | 管理员标识 |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | ON UPDATE | |

索引: `idx_users_email`, `idx_users_username`

### 4.2 posts 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| author_id | UUID | FK → users.id | 作者 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| slug | VARCHAR(250) | UNIQUE, NOT NULL | URL 友好标识 |
| content | TEXT | NOT NULL | Markdown 原文 |
| html | TEXT | NOT NULL | 预渲染 HTML |
| summary | VARCHAR(500) | | 列表页摘要 |
| cover_image | VARCHAR(500) | | 封面图相对路径 |
| status | VARCHAR(20) | DEFAULT 'draft' | draft / published |
| view_count | INTEGER | DEFAULT 0 | 阅读计数 |
| published_at | TIMESTAMP | | 发布时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | ON UPDATE | |

索引: `idx_posts_slug`, `idx_posts_status_pub` (status, published_at DESC), `idx_posts_author`

### 4.3 tags / post_tags 表

| tags | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | VARCHAR(50) UNIQUE | 标签名 |
| slug | VARCHAR(50) UNIQUE | URL 标识 |

| post_tags | 类型 | 说明 |
|-----------|------|------|
| post_id | UUID FK → posts.id | 联合主键 |
| tag_id | UUID FK → tags.id | 联合主键 |

## 5. API 设计

### 5.1 认证 (公开)

```
POST /api/auth/register  { email, username, password }  → { user, access_token, refresh_token }
POST /api/auth/login     { email, password }             → { access_token, refresh_token }
GET  /api/auth/me                                       → { user }           [需认证]
POST /api/auth/refresh   { refresh_token }               → { access_token }
```

**JWT 策略**: access_token 15分钟过期，refresh_token 7天过期。前端在请求拦截器中自动用 refresh_token 刷新 access_token。

### 5.2 博客 (公开)

```
GET /api/posts           ?page=1&page_size=12&tag=xxx&search=xxx  → { items[], total, page, page_size }
GET  /api/posts/{slug}                                              → { post (含 author, tags) }
POST /api/posts/{slug}/view                                        → 204  (递增阅读计数，Redis 防刷)
GET  /api/tags                                                      → [ { name, slug, post_count } ]
```

**分页格式**:
```json
{
  "items": [{ "id": "...", "title": "...", "slug": "...", "summary": "...", "cover_image": "...", "tags": [...], "author": {...}, "published_at": "...", "view_count": 328 }],
  "total": 42,
  "page": 1,
  "page_size": 12
}
```

### 5.3 管理后台 (需认证 + 管理员权限)

```
POST   /api/admin/posts       { title, content, tags[], summary?, cover_image?, status }  → { post }
PUT    /api/admin/posts/{id}  { title?, content?, ... }                                     → { post }
DELETE /api/admin/posts/{id}                                                                → 204
POST   /api/admin/upload      multipart/form-data (file)                                    → { url }
```

## 6. 前端页面清单

| 路由 | 组件 | 说明 |
|------|------|------|
| `/` | Home.tsx | 个人门户：导航、Hero、最新文章 |
| `/blog` | BlogList.tsx | 文章列表：卡片网格、搜索、标签筛选、分页 |
| `/blog/:slug` | BlogDetail.tsx | 文章详情：渲染 HTML、上下篇导航 |
| `/login` | Login.tsx | 登录表单 |
| `/register` | Register.tsx | 注册表单 |
| `/admin` | Dashboard.tsx | 后台首页，重定向到文章列表 |
| `/admin/posts` | PostList.tsx | 文章管理列表 |
| `/admin/posts/new` | PostEditor.tsx | 新建文章 |
| `/admin/posts/:id/edit` | PostEditor.tsx | 编辑文章 |

### 6.1 AdminGuard 鉴权流程

1. 检查 localStorage 中 access_token 是否存在 → 无则跳转 `/login`
2. 调用 `GET /api/auth/me` 验证 token → 失败则清除 token，跳转 `/login`
3. 检查 `user.is_admin` → 非管理员跳转 403 页面
4. 通过 → 渲染 `<Outlet />`

### 6.2 状态管理 (Zustand)

```typescript
// authStore
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email, password) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}
```

## 7. Docker Compose 服务拓扑

```yaml
services:
  nginx:       # 端口 80/443 → 前端静态文件 + /api/* 反向代理到 backend
  frontend:    # 构建阶段在 Dockerfile 中完成，nginx 直接 serve dist/
  backend:     # FastAPI 运行在 8000，不对外暴露
  postgres:    # 端口 5432，数据挂载到 ./data/postgres/
  redis:       # 端口 6379，数据挂载到 ./data/redis/
```

Nginx 规则:
- `/` → frontend 静态文件
- `/api/*` → proxy_pass backend:8000
- `/static/*` → 本地文件存储目录

## 8. 补充说明

### 8.1 邮件验证（阶段一不做）
注册时直接激活账号（`is_active = TRUE`），不发送验证邮件。等阶段三接入邮件服务后再加。

### 8.2 阅读计数
文章详情页首次加载时，前端调用 `POST /api/posts/{slug}/view` 递增计数。同一 IP 24小时内不重复计数（用 Redis 记录）。

### 8.3 文件上传
```
POST /api/admin/upload   multipart/form-data (file)  → { url }
```
文件存本地 `./data/uploads/`，Nginx 通过 `/static/*` 直接 serve。前端编辑器通过此接口上传封面图和文章内图片。

### 8.4 Markdown 渲染
- 后端：Python `markdown` 库 + `pygments`（代码高亮）+ 自定义扩展（自动为外部链接加 `target="_blank"`）
- 写文章时后端自动渲染存 `html` 字段
- 前端详情页用 `dangerouslySetInnerHTML` 直接渲染（配合 CSS 样式表）

## 9. 非功能需求

- **安全**: bcrypt 哈希密码、JWT 双 token、CORS 白名单、请求限流
- **性能**: 博客 HTML 预渲染（写时计算，读时直接返回）、静态资源 Nginx 直接 serve
- **SEO**: 文章详情页支持 `<meta>` 标签（title、description、og tags）、语义化 HTML
- **备份**: PostgreSQL 数据挂载到宿主机，定期 pg_dump

## 9. 阶段二预览（不在此阶段实现）

- 工具箱：图片压缩、JSON 格式化、短链接、Base64 编解码
- 工具页 SEO 优化、Umami 统计
- ARQ 定时任务：清理过期 token、生成站点地图
