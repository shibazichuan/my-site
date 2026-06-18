# my-site 项目开发报告

> **项目名称**：知讯图（zhixumentu.com）  
> **开发周期**：2026-06-13 ～ 2026-06-18（6天）  
> **总提交**：58 次  
> **网址**：https://zhixumentu.com  
> **GitHub**：https://github.com/shibazichuan/my-site  

---

## 1. 项目概述

从零搭建的个人全栈网站，包含博客系统、AI 聊天、工具箱、积分付费等功能。完全由 AI 辅助开发，从设计到部署上线 6 天完成。

---

## 2. 技术架构

```
┌─────────────────────────────────────────┐
│              用户浏览器                    │
│     React 18 SPA + TailwindCSS 深色模式   │
└────────────────┬────────────────────────┘
                 │ HTTPS (443)
┌────────────────▼────────────────────────┐
│           Nginx (反向代理)                │
│  SSL 终端 / 静态资源 / API 代理 / WebSocket│
└───┬──────────┬──────────┬───────────────┘
    │ /api/*   │ /umami/* │  / (SPA)
┌───▼──────┐ ┌▼────────┐ ┌▼──────────┐
│ FastAPI  │ │  Umami   │ │ React SPA │
│ 后端 API │ │  统计    │ │ 静态文件   │
└─┬──┬──┬─┘ └──────────┘ └────────────┘
  │  │  │
  ▼  ▼  ▼
┌──────┐ ┌──────┐ ┌──────────┐
│  PG  │ │Redis │ │ DeepSeek │
│  16  │ │  7   │ │  API     │
└──────┘ └──────┘ └──────────┘
```

### 技术栈

| 层 | 选型 | 说明 |
|---|------|------|
| 前端 | React 18 + Vite + TailwindCSS | SPA，React Router v6 |
| 状态管理 | Zustand + persist | 轻量，token 持久化 |
| HTTP | Axios + 拦截器 | 自动刷新 token |
| 后端 | FastAPI + SQLAlchemy 2.0 async | REST API + SSE 流式 |
| ORM | Alembic | 13 次数据库迁移 |
| 数据库 | PostgreSQL 16 | 主存储 |
| 缓存 | Redis 7 | Session、限流、WebSocket |
| 部署 | Docker Compose (7个容器) | Nginx + Backend + Frontend + PG + Redis + Umami + Umami-DB |
| 监控 | Umami | 自建网站统计 |
| 安全 | bcrypt + JWT + slowapi + HSTS + CSP | 密码哈希、令牌认证、速率限制、安全响应头 |

---

## 3. 开发阶段

### 阶段一：地基（6月13日）

**目标**：快速上线可访问的个人网站

| 功能 | 说明 |
|------|------|
| 项目脚手架 | Docker Compose 7 容器架构 |
| 数据库模型 | User、Post、Tag 模型 + Alembic 迁移 |
| 用户认证 | bcrypt 密码哈希 + JWT access/refresh token |
| 博客 API | 文章 CRUD + Markdown 渲染 + 分页搜索 |
| 管理后台 | 登录/写文章/编辑/删除 |
| 前端 | React SPA，Home/Blog/Login/Register/Admin |

**关键文件**：
- `backend/app/services/auth_service.py` — JWT + bcrypt 认证
- `backend/app/services/post_service.py` — 博客业务逻辑
- `frontend/src/store/authStore.ts` — Zustand 认证状态
- `frontend/src/api/client.ts` — Axios 自动刷新 token

---

### 阶段二：工具箱 + 统计（6月14日 凌晨）

**目标**：增加实用工具，让网站有粘性

| 功能 | 说明 |
|------|------|
| 短链接生成 | 自定义短码 + 302 重定向 + 点击统计 |
| 图片压缩 | 上传 → PIL 压缩 JPEG → WebP |
| JSON 格式化 | 语法高亮 + 树形折叠 |
| Base64 编解码 | 文本 ↔ Base64 互转 |
| Umami 统计 | 自建网站流量统计 |
| 站点地图 | ARQ 定时任务自动生成 sitemap.xml |

---

### 阶段三：AI + 扩展（6月14日 ～ 15日）

#### 3.1 AI 聊天
- DeepSeek API SSE 流式对话
- 多会话管理（创建/切换/删除）
- 每日额度控制（50条/用户/天）
- 前端 SSE EventSource 实时渲染

#### 3.2 服务页面
- 外包开发 / 编程教学 / DevOps / 技术咨询 四个 tab
- 右下角悬浮客服聊天按钮

#### 3.3 WebSocket 基础设施
- 在线人数实时统计
- 通知推送通道

#### 3.4 积分付费系统
- 积分充值（PayJS 微信支付）
- 积分消费/交易记录
- 充值套餐管理

#### 3.5 工具箱扩展
- 正则表达式测试器
- 文本 Diff 对比
- Markdown 实时编辑器
- JWT 调试器（解码/验证）

---

### 阶段四：部署 + 优化（6月14日 ～ 15日）

| 功能 | 说明 |
|------|------|
| SEO | react-helmet-async 每页独立 meta |
| PWA | manifest.json + Service Worker |
| 错误处理 | ErrorBoundary + 404 页面 |
| 代码分割 | React.lazy 按路由拆分 |
| 阿里云部署 | ECS + SSL (Let's Encrypt) + Nginx HTTPS |
| 域名 | zhixumentu.com + DNS A 记录 |

---

### 阶段五：安全加固 + 体验优化（6月18日）

#### 安全加固
| 项目 | 措施 |
|------|------|
| 端口收敛 | 关闭 PostgreSQL(5432) 和 Redis(6379) 公网暴露 |
| 速率限制 | slowapi + Redis：登录 5次/分、注册 3次/时、聊天 30次/分 |
| 安全响应头 | HSTS + CSP + X-Frame-Options + X-Content-Type + Referrer-Policy |
| 上传限制 | 分块读取 + 10MB 上限 + 文件类型白名单 |
| Schema 约束 | 全部字符串字段 max_length + 密码 min_length=8 |

#### 体验优化
| 项目 | 措施 |
|------|------|
| 深色模式 | TailwindCSS class dark mode + Zustand 持久化 + Navbar toggle |
| 博客评论 | Giscus（GitHub Discussions 驱动） |
| 容器自动重启 | restart: unless-stopped 全部 7 个容器 |
| CI/CD | GitHub Actions → SSH → 自动部署 |
| Docker 镜像 | DaoCloud 国内镜像加速 |

---

## 4. 项目结构

```
my-site/
├── backend/                    # FastAPI 后端（35+ 文件）
│   ├── app/
│   │   ├── api/                # 7 个路由模块
│   │   │   ├── auth.py         # 认证（登录/注册/刷新）
│   │   │   ├── posts.py        # 博客（列表/详情/阅读数）
│   │   │   ├── admin.py        # 管理后台（文章 CRUD/上传）
│   │   │   ├── tools.py        # 工具箱（短链接/图片/JSON/Base64）
│   │   │   ├── chat.py         # AI 聊天（SSE 流式）
│   │   │   ├── credits.py      # 积分（充值/余额/交易）
│   │   │   ├── payment.py      # 支付回调
│   │   │   └── ws.py           # WebSocket（在线人数/通知）
│   │   ├── models/             # 8 个 SQLAlchemy 模型
│   │   ├── services/           # 9 个业务服务
│   │   ├── schemas/            # 5 个 Pydantic schema
│   │   ├── middleware/         # auth.py（JWT 依赖）
│   │   ├── storage/            # local.py（文件存储）
│   │   ├── limiter.py          # slowapi 速率限制
│   │   ├── config.py           # Pydantic Settings
│   │   ├── database.py         # SQLAlchemy + Redis 连接
│   │   └── main.py             # FastAPI 入口
│   ├── alembic/                # 数据库迁移
│   ├── pyproject.toml          # Poetry 依赖
│   └── Dockerfile
│
├── frontend/                   # React 前端（40+ 文件）
│   ├── src/
│   │   ├── pages/              # 17 个页面
│   │   │   ├── Home.tsx        # 首页（文章摘要）
│   │   │   ├── BlogList.tsx    # 博客列表（搜索/标签筛选/分页）
│   │   │   ├── BlogDetail.tsx  # 博客详情（Markdown + Giscus 评论）
│   │   │   ├── Login.tsx       # 登录
│   │   │   ├── Register.tsx    # 注册
│   │   │   ├── ServicesPage.tsx # 服务介绍（4 个 tab + 悬浮客服）
│   │   │   ├── ChatPage.tsx    # AI 对话（多会话 + SSE 流式）
│   │   │   ├── CreditsPage.tsx # 积分充值
│   │   │   ├── NotFound.tsx    # 404
│   │   │   ├── tools/          # 8 个工具页面
│   │   │   └── admin/          # 管理后台
│   │   ├── components/         # 16 个组件
│   │   │   ├── Navbar.tsx      # 导航栏（含深色模式切换）
│   │   │   ├── Footer.tsx      # 页脚（在线人数）
│   │   │   ├── GiscusComment.tsx # 博客评论
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── SEO.tsx         # 每页独立 meta
│   │   │   ├── chat/           # 聊天组件
│   │   │   └── ...
│   │   ├── api/                # 4 个 API 模块
│   │   ├── store/              # Zustand（auth + theme）
│   │   ├── hooks/              # useWebSocket
│   │   ├── types/              # TypeScript 类型
│   │   └── App.tsx             # 路由（React.lazy 代码分割）
│   ├── index.html              # 含 FOUC 深色模式防护
│   ├── tailwind.config.js      # darkMode: 'class'
│   └── Dockerfile              # 多阶段构建
│
├── nginx/                      # Nginx 配置
│   └── nginx.conf              # 开发环境（含安全响应头）
│
├── deploy/                     # 生产部署
│   ├── docker-compose.prod.yml # 生产覆盖（443 + SSL 证书）
│   ├── nginx.prod.conf         # 生产 Nginx（HTTP→HTTPS 重定向）
│   └── deploy.sh
│
├── .github/workflows/          # CI/CD
│   └── deploy.yml              # GitHub Actions → SSH 自动部署
│
├── docs/superpowers/           # 设计文档 + 实现计划（13 份）
├── docker-compose.yml          # 基础 Docker 编排（7 个服务）
├── .env.example                # 环境变量模板
├── PROJECT_STATUS.md           # 项目状态（功能清单/待办）
├── PROJECT_REPORT.md           # 本报告
└── CLAUDE.md                   # 项目指引
```

---

## 5. 数据库模型

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│   User   │    │    Post     │    │   Tag    │
├──────────┤    ├─────────────┤    ├──────────┤
│ id (UUID)│    │ id (UUID)   │    │ id (int) │
│ email    │    │ title       │    │ name     │
│ username │    │ slug        │    │ slug     │
│ password │    │ content     │    └────┬─────┘
│ is_admin │    │ html         │         │
│ is_active│    │ summary     │    ┌────▼─────┐
└─────┬────┘    │ cover_image │    │ post_tags │
      │         │ status      │    │ post_id   │
      │         │ view_count  │    │ tag_id    │
      │         │ author_id ──┼────┘─────▲─────┘
      │         │ published   │          │
      │         └──────┬──────┘          │
      │                │                 │
      ▼                ▼                 │
┌──────────┐  ┌──────────────┐           │
│ ShortLink│  │ Conversation │           │
│ user_id  │  │ user_id      │           │
│ code     │  │ title        │           │
│ url      │  └──────┬───────┘           │
│ clicks   │         │                   │
└──────────┘         ▼                   │
              ┌──────────────┐           │
              │   Message    │           │
              │ conv_id      │           │
              │ role         │           │
              │ content      │           │
              └──────────────┘           │
                                         │
┌──────────────┐  ┌──────────────┐       │
│ UserCredits  │  │PaymentOrder  │       │
│ user_id (FK) │  │ user_id (FK) │       │
│ balance      │  │ amount       │       │
└──────┬───────┘  │ status       │       │
       │          └──────────────┘       │
       ▼                                 │
┌──────────────┐                         │
│CreditTransact│                         │
│ user_id (FK) │                         │
│ type (+/-)   │                         │
│ amount       │                         │
│ balance_after│                         │
└──────────────┘                         │
                                         │
┌──────────────┐                         │
│ ImageRecord  │                         │
│ user_id (FK) │                         │
│ original_name│                         │
│ original_size│                         │
│ compressed   │                         │
└──────────────┘                         │
```

---

## 6. API 路由总览

| 方法 | 路径 | 认证 | 说明 |
|------|------|:--:|------|
| POST | `/api/auth/register` | — | 注册（限流 3次/时） |
| POST | `/api/auth/login` | — | 登录（限流 5次/分） |
| GET | `/api/auth/me` | ✅ | 获取当前用户 |
| POST | `/api/auth/refresh` | — | 刷新 token |
| GET | `/api/posts` | — | 文章列表（分页/标签/搜索） |
| GET | `/api/posts/{slug}` | — | 文章详情 |
| POST | `/api/posts/{slug}/view` | — | 文章阅读计数 |
| POST | `/api/admin/posts` | 管理员 | 创建文章 |
| PUT | `/api/admin/posts/{id}` | 管理员 | 更新文章 |
| DELETE | `/api/admin/posts/{id}` | 管理员 | 删除文章 |
| POST | `/api/admin/upload` | 管理员 | 上传文件 |
| POST | `/api/tools/shortlinks` | ✅ | 创建短链接 |
| GET | `/api/tools/shortlinks` | ✅ | 短链接列表 |
| DELETE | `/api/tools/shortlinks/{id}` | ✅ | 删除短链接 |
| POST | `/api/tools/images/upload` | ✅ | 上传压缩图片 |
| GET | `/api/tools/images` | ✅ | 图片列表 |
| POST | `/api/chat/send` | ✅ | 发送消息（SSE 流式，限流 30次/分） |
| GET | `/api/chat/conversations` | ✅ | 对话列表 |
| GET | `/api/chat/conversations/{id}` | ✅ | 对话详情 |
| DELETE | `/api/chat/conversations/{id}` | ✅ | 删除对话 |
| GET | `/api/chat/quota` | ✅ | 日剩余额度 |
| GET | `/api/credits/plans` | ✅ | 充值套餐列表 |
| GET | `/api/credits/balance` | ✅ | 积分余额 |
| POST | `/api/credits/order` | ✅ | 创建充值订单 |
| GET | `/api/credits/transactions` | ✅ | 交易记录 |
| POST | `/api/payment/notify` | — | PayJS 回调 |
| WS | `/ws` | token | WebSocket 连接 |
| GET | `/api/health` | — | 健康检查 |
| GET | `/r/{short_code}` | — | 短链接重定向 |

---

## 7. 安全措施

| 层级 | 措施 |
|------|------|
| 传输层 | HTTPS/TLS 1.3 + HSTS (max-age=1年) |
| 应用层 | CSP + X-Frame-Options DENY + X-Content-Type nosniff |
| 认证 | bcrypt 12 rounds + JWT (15分钟 access / 7天 refresh) |
| 限流 | slowapi Redis：登录 5/min、注册 3/hr、聊天 30/min、全局 200/min |
| 输入 | Pydantic max_length 约束 + 文件上传 10MB 上限 + 类型白名单 |
| 数据库 | 公网端口关闭，仅 Docker 内网访问 |
| 容器 | restart: unless-stopped 自动恢复 |

---

## 8. 部署架构

```
阿里云 ECS (华东1 杭州, 2C1.6G, 40GB, Ubuntu 22.04)
│
├── Docker Compose (7个容器)
│   ├── nginx (alpine)               ← 80/443 端口
│   ├── my-site-backend (Python 3.12) ← :8000 内部
│   ├── my-site-frontend (alpine)     ← 构建 dist，退出
│   ├── postgres (16-alpine)          ← :5432 内部
│   ├── redis (7-alpine)             ← :6379 内部
│   ├── umami (postgresql-latest)     ← :3000 内部
│   └── umami-db (postgres:16-alpine) ← :5432 内部
│
├── SSL: Let's Encrypt (certbot), 自动续期
├── 镜像加速: DaoCloud (docker.m.daocloud.io)
├── CI/CD: GitHub Actions → SSH → git pull → docker compose up -d --build
└── 备份: 手动 tar.gz
```

---

## 9. 成本

| 项目 | 状态 | 费用 |
|------|------|-----|
| 服务器 | 阿里云 ECS 免费试用（至 2026-09-14） | ¥0/月 |
| 续费 | 2C1.6G 40GB | ¥58/月 |
| 域名 | zhixumentu.com | ¥70/年 |
| DeepSeek API | 按量付费 | ~¥10/月 |
| SSL | Let's Encrypt | 免费 |
| 监控 | 暂未配置 | 免费（阿里云/UptimeRobot） |

---

## 10. 代码统计

| 指标 | 数值 |
|------|-----|
| 总提交 | 58 次 |
| 后端文件 | 35+ |
| 前端文件 | 40+ |
| 数据库表 | 12 张 |
| API 端点 | 27 个 |
| Docker 容器 | 7 个 |
| 设计文档 | 13 份 |
| pytest 测试 | 0（缺失） |

---

## 11. 已知问题 & 待办

| 优先级 | 事项 |
|:--:|------|
| 🔴 | 各种公网扫描器持续探测（已有安全头+限流防护） |
| 🟡 | 无自动化测试（前端 Vitest + 后端 pytest） |
| 🟡 | 博客内容太少（仅 1 篇文章） |
| 🟡 | 服务页文案空泛，需要实际案例 |
| 🟢 | AI 聊天返回不支持 Markdown 渲染 |
| 🟢 | 文件上传后无管理界面 |
| 🟢 | Nginx 未开启 gzip/brotli 压缩 |
| 🟢 | 9 月前需决定服务器续费方案 |

---

## 12. 经验总结

1. **Docker Compose 双配置模式** 灵活实用：基础 `docker-compose.yml` + 生产覆盖 `deploy/docker-compose.prod.yml`，开发/生产两套环境共用。

2. **国内部署三大坑**：GitHub 连不上、Docker Hub 拉不到、PyPI 慢。解决方案：DaoCloud 镜像 + 阿里云 PyPI 镜像 + 服务器直接 git pull。

3. **SSE 比 WebSocket 更适合 AI 对话**：单向流式响应不需要全双工，SSE 实现更简单（一个 `StreamingResponse` 即可），浏览器原生支持。

4. **Zustand + persist** 是 React 状态管理的最优解：比 Redux 轻 10 倍，API 直觉化，主题偏好持久化一行配置。

5. **安全加固不是一次性工作**：从日志里看到各种扫描器实时攻击（WordPress 漏洞探测、.env 读取），安全响应头和速率限制是必需品不是可选项。

6. **AI 辅助开发的速度**：6 天从零到完整全栈网站，设计→计划→实现→部署的流水线由 AI 驱动，人工只负责确认方向。
