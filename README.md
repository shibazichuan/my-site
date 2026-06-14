# my-site — 个人网站

全栈开发者个人网站，包含博客、工具箱、AI 聊天、服务页面。

## 功能

| 模块 | 说明 |
|------|------|
| 📝 博客 | Markdown 写作、标签分类、SEO 优化 |
| 🔧 工具箱 | 短链接、图片压缩、JSON/Base64/正则/Diff/Markdown/JWT |
| 🤖 AI 聊天 | DeepSeek API、SSE 流式输出、多会话管理 |
| 🛒 服务页面 | 技术咨询 / 外包开发 / 教学 / DevOps |
| 💰 积分系统 | PayJS 支付网关集成 |
| 💬 WebSocket | 在线人数、通知推送通道 |
| 📈 Umami | 自建隐私友好统计 |

## 技术栈

**前端:** React 18 + Vite + TailwindCSS + Zustand + React Router v6
**后端:** FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL 16 + Redis 7
**部署:** Docker Compose + Nginx

## 快速开始

```bash
# 克隆
git clone https://github.com/shibazichuan/my-site.git
cd my-site

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 SECRET_KEY、DEEPSEEK_API_KEY 等

# 启动
docker compose up -d --build

# 数据库迁移
docker exec my-site-backend-1 alembic upgrade head

# 创建管理员
docker exec my-site-backend-1 python -m app.seed
```

打开 http://localhost

**默认管理员:** admin@example.com / admin123

## 项目结构

```
my-site/
├── frontend/          # React SPA
│   └── src/
│       ├── pages/     # 页面组件
│       ├── components/# 通用组件
│       ├── api/       # Axios + SSE
│       ├── store/     # Zustand
│       └── hooks/     # 自定义 Hook
├── backend/           # FastAPI
│   └── app/
│       ├── api/       # 路由
│       ├── models/    # SQLAlchemy 模型
│       ├── services/  # 业务逻辑
│       └── schemas/   # Pydantic
├── nginx/             # Nginx 配置
└── docker-compose.yml
```

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|:--:|
| `SECRET_KEY` | JWT 签名密钥 | ✅ |
| `POSTGRES_PASSWORD` | 数据库密码 | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 可选 |
| `PAYJS_MCHID` / `PAYJS_KEY` | 支付商户号 | 可选 |
| `UMAMI_APP_SECRET` | Umami 密钥 | 可选 |

## License

MIT
