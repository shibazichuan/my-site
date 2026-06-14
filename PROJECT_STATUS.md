# my-site 项目状态

> 最后更新: 2026-06-15

## 🌐 线上地址

- **HTTPS**: https://zhixumentu.com
- **IP**: 121.40.140.52
- **GitHub**: https://github.com/shibazichuan/my-site

## 🖥️ 服务器

| 项目 | 详情 |
|------|------|
| 平台 | 阿里云 ECS |
| 配置 | 2C1.6G, 40GB, Ubuntu 22.04 |
| 地域 | 华东1（杭州） |
| 到期 | 2026-09-14（免费试用） |
| SSL | Let's Encrypt, 2026-09-12 到期自动续 |

## 🐳 运行的容器

| 容器 | 镜像 | 状态 |
|------|------|:--:|
| my-site-nginx-1 | nginx:alpine | ✅ |
| my-site-frontend-1 | my-site-frontend:latest | ✅ |
| my-site-backend-1 | my-site-backend:latest | ✅ |
| my-site-postgres-1 | postgres:16-alpine | ✅ healthy |
| my-site-redis-1 | redis:7-alpine | ✅ healthy |
| my-site-umami-1 | umami:postgresql-latest | ✅ |
| my-site-umami-db-1 | postgres:16-alpine | ✅ healthy |

## 📋 功能清单

| 阶段 | 功能 | 状态 |
|:--:|------|:--:|
| 🥚 一 | 博客 + 认证 + 管理后台 + Docker | ✅ |
| 🐣 二 | 工具箱（短链接/图片/JSON/Base64）+ Umami | ✅ |
| 🤖 三-1 | AI 聊天（DeepSeek SSE 多会话） | ✅ |
| 🛒 三-2 | 服务页面（外包/教学/DevOps/咨询+悬浮客服） | ✅ |
| 💬 三-3 | WebSocket 基础设施（在线人数+通知通道） | ✅ |
| 💳 三-4 | 积分付费系统（PayJS+积分充值/消费） | ✅ |
| 🔧 三-5 | 工具箱扩展（正则/Diff/Markdown/JWT） | ✅ |
| 🎨 优化 | SEO + PWA + ErrorBoundary + 代码分割 + 404 | ✅ |
| 🚀 部署 | 阿里云 ECS + SSL + 域名 + 自动备份 | ✅ |

## 📁 项目结构

```
my-site/
├── backend/           # FastAPI (30+ 文件)
│   └── app/
│       ├── api/       # 7 个路由模块
│       ├── models/    # 8 个模型
│       ├── services/  # 9 个服务
│       └── schemas/   # 5 个 schema
├── frontend/          # React + Vite + TailwindCSS (35+ 文件)
│   └── src/
│       ├── pages/     # 16 个页面
│       ├── components/# 15 个组件
│       ├── api/       # 4 个 API 模块
│       ├── store/     # Zustand
│       └── hooks/     # 自定义 Hook
├── nginx/             # Nginx 配置
├── deploy/            # 生产部署配置
├── docs/              # 设计文档 + 实现计划
├── docker-compose.yml
└── .env.example
```

## 🔐 管理员

- 地址: https://zhixumentu.com/login
- 邮箱: admin@example.com
- ⚠️ 需要改成真实邮箱

## 💰 成本

| 项目 | 当前 | 续费 |
|------|:--:|:--:|
| 服务器 | ¥0（试用） | ¥58/月 |
| 域名 | 已购 | ¥70/年 |
| DeepSeek API | ~¥10/月 | ~¥120/年 |

## ⏳ 待办

- [ ] 改管理员邮箱
- [ ] 9月前决定续费方案
- [ ] 博客评论系统
- [ ] CI/CD 自动部署
- [ ] 深色模式

## 📊 提交统计

- 总提交: 51
- 分支: master
- 远程: github.com/shibazichuan/my-site
