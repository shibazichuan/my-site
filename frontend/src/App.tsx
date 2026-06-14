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
import CreditsPage from './pages/CreditsPage'
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
        <Route path="/credits" element={<CreditsPage />} />
      </Route>
    </Routes>
  )
}
