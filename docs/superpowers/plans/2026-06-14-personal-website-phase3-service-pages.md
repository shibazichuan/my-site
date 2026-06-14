# 服务页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 技术服务展示页面（4 Tab 切换 + 悬浮客服），纯前端，复用已有 AI Chat API

**Architecture:** React 组件纯前端，ServiceTab 渲染各服务内容，FloatingChat 复用 ChatMain 组件，React Router Tab 路由

**Tech Stack:** React 18, Vite, TailwindCSS, React Router v6

**Spec:** `docs/superpowers/specs/2026-06-14-personal-website-phase3-service-pages-design.md`

---

## File Structure

```
New files:
frontend/src/
├── pages/ServicesPage.tsx         # 服务页容器（Tab 路由 + 内容渲染）
├── components/ServiceTab.tsx      # 单个服务 Tab 内容
├── components/FloatingChat.tsx    # 悬浮客服气泡 + 聊天窗口

Modified files:
frontend/src/App.tsx               # 新增 /services/* 路由
frontend/src/components/Navbar.tsx # 新增 "🛠️ 服务" 入口
```

---

### Task 1: ServiceTab Component

**Files:**
- Create: `frontend/src/components/ServiceTab.tsx`

- [ ] **Step 1: Create ServiceTab component with all 4 service data + rendering**

```tsx
interface ServiceData {
  icon: string;
  title: string;
  subtitle: string;
  features: string[];
  techStack?: string[];
  price: string;
  priceLabel?: string;
}

const SERVICES: Record<string, ServiceData> = {
  dev: {
    icon: '🛠️',
    title: '外包开发',
    subtitle: '全栈开发经验，从需求分析到上线交付，一站式技术服务。',
    features: ['Web 应用开发', '微信小程序开发', 'RESTful API 设计与开发', '管理后台系统', '数据库设计与优化'],
    techStack: ['React', 'Vue', 'FastAPI', 'Node.js', 'PostgreSQL', 'Docker'],
    price: '¥5,000 起',
    priceLabel: '按项目复杂度评估，交付周期 2-8 周',
  },
  teaching: {
    icon: '🎓',
    title: '技术教学',
    subtitle: '1v1 个性化辅导，从入门到就业，量身定制学习路径。',
    features: ['Python 后端开发', 'React 前端开发', '技术面试辅导', '项目实战指导', '代码 Review 与改进'],
    price: '¥300/小时',
    priceLabel: '支持线上远程教学，时间灵活预约',
  },
  devops: {
    icon: '🔧',
    title: 'DevOps 服务',
    subtitle: '让你的应用稳定、安全、可扩展。',
    features: ['Docker 容器化部署', 'CI/CD 流水线搭建', '云服务器部署与运维', '监控告警系统', '数据库性能优化'],
    techStack: ['Docker', 'Kubernetes', 'GitHub Actions', 'Nginx', 'AWS/阿里云'],
    price: '联系报价',
    priceLabel: '根据项目规模和需求定制方案',
  },
  consulting: {
    icon: '💡',
    title: '技术咨询',
    subtitle: '帮你做对技术决策，少走弯路，加速产品落地。',
    features: ['系统架构评审', '性能瓶颈诊断与优化', '技术选型建议', '代码质量审查', '安全漏洞评估'],
    price: '联系报价',
    priceLabel: '按咨询深度和时长灵活计费',
  },
};

interface Props {
  tab: string;
}

export default function ServiceTab({ tab }: Props) {
  const service = SERVICES[tab] || SERVICES.dev;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center py-12 px-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl mb-8">
        <div className="text-5xl mb-4">{service.icon}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{service.title}</h1>
        <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">{service.subtitle}</p>
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">服务内容</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {service.features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500 shrink-0">✓</span>
              {f}
            </div>
          ))}
        </div>

        {service.techStack && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-3">技术栈</h4>
            <div className="flex flex-wrap gap-2">
              {service.techStack.map((t) => (
                <span key={t} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white text-center">
        <div className="text-3xl font-bold mb-2">{service.price}</div>
        {service.priceLabel && (
          <p className="text-indigo-200 text-sm mb-6">{service.priceLabel}</p>
        )}
        <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors">
          💬 立即咨询
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ServiceTab.tsx
git commit -m "feat: add ServiceTab component with 4 service types"
```

---

### Task 2: ServicesPage Container

**Files:**
- Create: `frontend/src/pages/ServicesPage.tsx`

- [ ] **Step 1: Create ServicesPage with Tab navigation**

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import ServiceTab from '../components/ServiceTab';
import FloatingChat from '../components/FloatingChat';

const TABS = [
  { key: 'dev', label: '外包开发', icon: '🛠️' },
  { key: 'teaching', label: '技术教学', icon: '🎓' },
  { key: 'devops', label: 'DevOps', icon: '🔧' },
  { key: 'consulting', label: '技术咨询', icon: '💡' },
];

export default function ServicesPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab = tab || 'dev';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab nav */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => navigate(`/services/${t.key}`)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ServiceTab tab={activeTab} />
      </div>

      {/* Floating chat */}
      <FloatingChat />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ServicesPage.tsx
git commit -m "feat: add ServicesPage with Tab navigation"
```

---

### Task 3: FloatingChat Component

**Files:**
- Create: `frontend/src/components/FloatingChat.tsx`

- [ ] **Step 1: Create FloatingChat — resuses ChatMain component**

```tsx
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import ChatMain from './chat/ChatMain';

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center text-2xl"
        title="在线客服"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <div className="font-semibold text-sm">💬 在线客服</div>
              <div className="text-xs text-indigo-200">咨询技术服务，我会尽快回复</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg">✕</button>
          </div>

          {isAuthenticated ? (
            <div className="flex-1 flex flex-col min-h-0">
              <ChatMain
                conversationId={convId}
                onRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-400 text-sm">
              <div>
                <div className="text-3xl mb-3">🔒</div>
                <p>请先登录后使用在线客服</p>
                <a href="/login" className="text-indigo-600 hover:underline mt-2 inline-block">前往登录 →</a>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/FloatingChat.tsx
git commit -m "feat: add FloatingChat widget (reuses ChatMain)"
```

---

### Task 4: App + Navbar Integration

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

- [ ] **Step 1: Add /services routes to App.tsx**

```tsx
import ServicesPage from './pages/ServicesPage'
```

Add routes — public, no auth required, inside Layout:

```tsx
<Route element={<Layout />}>
  <Route path="/" element={<Home />} />
  <Route path="/blog" element={<BlogList />} />
  <Route path="/blog/:slug" element={<BlogDetail />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/services/:tab?" element={<ServicesPage />} />
</Route>
```

Full App.tsx after changes:

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
import ServicesPage from './pages/ServicesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/services/:tab?" element={<ServicesPage />} />
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

- [ ] **Step 2: Add nav entry to Navbar.tsx**

In Navbar, add the services link in the left nav, between blog and tools (public, always visible):

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
          <Link to="/services" className="text-sm text-gray-600 hover:text-gray-900">🛠️ 服务</Link>
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

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: add /services routes and navbar entry"
```

---

### Task 5: Build & Verify

- [ ] **Step 1: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Build and restart frontend**

```bash
docker compose up -d --build frontend nginx
```

- [ ] **Step 3: Verify pages**

```bash
curl -s http://localhost/services | grep "外包开发"
curl -s http://localhost/services/teaching | grep "技术教学"
curl -s http://localhost/services/devops | grep "DevOps"
curl -s http://localhost/services/consulting | grep "技术咨询"
```
Expected: All 4 return HTML with matching content.

- [ ] **Step 4: Commit (if any changes)**

```bash
git add . && git commit -m "chore: finalize service pages verification"
```
