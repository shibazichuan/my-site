import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGuard from './components/AdminGuard'

const Home = lazy(() => import('./pages/Home'))
const BlogList = lazy(() => import('./pages/BlogList'))
const BlogDetail = lazy(() => import('./pages/BlogDetail'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const PostList = lazy(() => import('./pages/admin/PostList'))
const PostEditor = lazy(() => import('./pages/admin/PostEditor'))
const ToolsIndex = lazy(() => import('./pages/tools/ToolsIndex'))
const ShortLink = lazy(() => import('./pages/tools/ShortLink'))
const ImageCompress = lazy(() => import('./pages/tools/ImageCompress'))
const JsonFormatter = lazy(() => import('./pages/tools/JsonFormatter'))
const Base64Tool = lazy(() => import('./pages/tools/Base64Tool'))
const RegexTester = lazy(() => import('./pages/tools/RegexTester'))
const DiffTool = lazy(() => import('./pages/tools/DiffTool'))
const MarkdownEditor = lazy(() => import('./pages/tools/MarkdownEditor'))
const JwtDebugger = lazy(() => import('./pages/tools/JwtDebugger'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

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
          <Route path="/tools/regex" element={<RegexTester />} />
          <Route path="/tools/diff" element={<DiffTool />} />
          <Route path="/tools/markdown" element={<MarkdownEditor />} />
          <Route path="/tools/jwt" element={<JwtDebugger />} />
        </Route>
      </Route>
      <Route element={<AuthGuard />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/credits" element={<CreditsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
