# my-site — 个人网站

## 启动
```bash
docker compose up -d --build    # 构建并启动
docker compose ps                # 查看状态
docker compose logs backend      # 后端日志
docker exec my-site-backend-1 alembic upgrade head  # DB迁移
docker exec my-site-backend-1 python -m app.seed    # 创建admin
```

## 本地开发
- 前端: `cd frontend && npm run dev` → :3000（自动 proxy /api → :8000）
- 后端: `uvicorn app.main:app --reload`（需要本地 PG/Redis 或连 Docker 的）

## 技术栈
- 前端: React 18 + Vite + TailwindCSS + Zustand + Axios + React Router v6
- 后端: FastAPI + SQLAlchemy 2.0 async + Alembic + bcrypt + python-jose
- 基础设施: PostgreSQL 16 + Redis 7 + Nginx + Docker Compose

## 关键文件
- `frontend/src/App.tsx` — 路由结构
- `frontend/src/api/client.ts` — Axios 拦截器（自动刷新token）
- `frontend/src/store/authStore.ts` — Zustand 认证状态
- `backend/app/main.py` — FastAPI 入口
- `backend/app/models/` — SQLAlchemy 模型
- `backend/app/services/post_service.py` — 博客业务逻辑
- `backend/app/services/auth_service.py` — 认证逻辑

## 已知坑
- `alembic.ini` 的 URL 只用于 CLI，实际迁移用 env.py 中的 `settings.database_url`
- `Base.metadata` 需要 import 所有 model 才会填充表
- async 模式下 ORM 对象脱离 session 后无法懒加载，需用 `selectinload` 预加载
- `passlib` 与 `bcrypt>=4.1` 不兼容，已改用 `bcrypt` 直接调用
