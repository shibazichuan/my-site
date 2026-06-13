# 个人网站 - 阶段二：工具箱 设计文档

> **日期**: 2026-06-14
> **状态**: 已确认
> **概述**: 新增工具箱（短链接、图片压缩、JSON格式化、Base64编解码）、Umami 统计、ARQ 定时任务

---

## 1. 范围

| 模块 | 功能 | 说明 |
|------|------|------|
| 短链接 | 创建 + 管理面板（列表/点击统计/删除/复制） | 需后端存储 |
| 图片压缩 | 上传压缩/批量/质量调节/历史记录 | 需后端处理 |
| JSON格式化 | 语法高亮/树形视图/JSONPath 搜索 | 纯前端 |
| Base64编解码 | 文本+文件编解码/历史记录(localStorage) | 纯前端 |
| Umami 统计 | 自建 Umami 服务，全站 JS 埋点 | Docker 部署 |
| ARQ 定时任务 | 站点地图生成 | 挂载到现有 backend |
| 全局 | 所有工具需登录后使用 | 无需管理员权限 |

---

## 2. 架构

```
新增/修改服务:
├── umami (Docker)        → 端口 3000，仅内部
├── umami-db (PostgreSQL) → 独立数据库
├── backend  → 新增: tools API, sitemap 任务
├── frontend → 新增: /tools/* 页面, Umami script
├── nginx    → 新增: /umami/* 反向代理, /sitemap.xml 路由
```

---

## 3. 数据库新增表

### 3.1 shortlinks

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | 创建者 |
| short_code | VARCHAR(20) UNIQUE | 随机生成短码 |
| original_url | TEXT | 原始长链接 |
| click_count | INTEGER DEFAULT 0 | 点击计数 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 3.2 images

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | 上传者 |
| original_name | VARCHAR(255) | 原始文件名 |
| original_size | INTEGER | 压缩前字节数 |
| compressed_size | INTEGER | 压缩后字节数 |
| compressed_path | VARCHAR(500) | 存储路径 |
| quality | INTEGER | 压缩质量 (1-100) |
| created_at | TIMESTAMP | |

---

## 4. API

### 4.1 短链接

```
POST   /api/tools/shortlinks          { original_url } → { id, short_code, short_url, original_url, click_count, created_at }
GET    /api/tools/shortlinks          ?page=1&page_size=20 → { items[], total, page }
DELETE /api/tools/shortlinks/{id}     → 204
GET    /r/{short_code}               → 302 重定向到 original_url（由 backend 处理，nginx 转发 /r/* 到 backend）
```

### 4.2 图片压缩

```
POST   /api/tools/images/upload       multipart (file, quality=80) → { id, original_name, original_size, compressed_size, url, quality, created_at }
GET    /api/tools/images              ?page=1&page_size=20 → { items[], total }
```

压缩后端用 Python `PIL/Pillow`，支持 JPEG/PNG/WebP 格式。

### 4.3 站点地图

```
# ARQ 定时任务, 每周日 3:00
# 扫描所有 published posts, 生成 sitemap.xml 到 /app/data/uploads/
# Nginx 将 /sitemap.xml 路由到 static 目录
```

---

## 5. 前端

### 5.1 新页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/tools` | ToolsIndex | 工具箱首页，卡片导航 |
| `/tools/shortlink` | ShortLink | 双栏：左侧生成/右侧列表 |
| `/tools/image` | ImageCompress | 上传区+质量滑块+历史列表 |
| `/tools/json` | JsonFormatter | 左右分栏：输入/格式化输出，树形/文本切换 + JSONPath |
| `/tools/base64` | Base64Tool | 编码/解码 Tab 切换，文件 + 文本 |

### 5.2 新组件

| 组件 | 说明 |
|------|------|
| `ToolLayout` | 工具页统一布局：标题 + 描述 + 主体插槽 |
| `CopyButton` | 一键复制 + 1.5s "已复制"反馈 |
| `AuthGuard` | 修改支持 `requireAdmin` prop，默认 false |
| `JsonTreeView` | JSON 树形视图渲染 |

### 5.3 路由结构

```tsx
// App.tsx 新增
<Route element={<AuthGuard />}>
  <Route element={<Layout />}>
    <Route path="/tools" element={<ToolsIndex />} />
    <Route path="/tools/shortlink" element={<ShortLink />} />
    <Route path="/tools/image" element={<ImageCompress />} />
    <Route path="/tools/json" element={<JsonFormatter />} />
    <Route path="/tools/base64" element={<Base64Tool />} />
  </Route>
</Route>
```

### 5.4 Umami 埋点

在 `index.html` 的 `<head>` 中添加 Umami script tag（从 UNAMI_SCRIPT_URL 环境变量注入）。

---

## 6. Docker Compose

新增 umami 和 umami-db 服务：

```yaml
umami-db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: umami
    POSTGRES_PASSWORD: ${UMAMI_DB_PASSWORD}
    POSTGRES_DB: umami
  volumes:
    - ./data/umami-db:/var/lib/postgresql/data

umami:
  image: ghcr.io/umami-software/umami:postgresql-latest
  environment:
    DATABASE_URL: postgresql://umami:${UMAMI_DB_PASSWORD}@umami-db:5432/umami
    APP_SECRET: ${UMAMI_APP_SECRET}
  depends_on:
    umami-db:
      condition: service_healthy

nginx:
  # 新增 /umami/ location → proxy_pass umami:3000
  # 新增 /sitemap.xml → static 目录
```

---

## 7. Nginx 新增规则

```nginx
location /umami/ {
    proxy_pass http://umami:3000/;
}

location = /sitemap.xml {
    alias /usr/share/nginx/html/static/sitemap.xml;
}
```

---

## 8. 非功能需求

- **安全**: 短链接和图片 API 需用户认证
- **性能**: 图片压缩在请求线程内同步处理（Pillow），单文件 < 10MB
- **文件存储**: 压缩后图片存 `./data/uploads/compressed/`，Nginx 直接 serve
- **限流**: 短链接重定向用 Redis 计数防刷（已有基础可复用）

---

## 9. 不做（明确砍掉）

- 图片裁剪/旋转/水印
- JSON 对比器
- Base64 批量处理
- ARQ token 清理（延后）
- 自建 Umami 替代托管版（保留后期选项）
