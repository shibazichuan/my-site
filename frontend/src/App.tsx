import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminGuard from './components/AdminGuard'
import AdminLayout from './pages/admin/AdminLayout'
import PostList from './pages/admin/PostList'
import PostEditor from './pages/admin/PostEditor'

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
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<PostList />} />
          <Route path="/admin/posts" element={<PostList />} />
          <Route path="/admin/posts/new" element={<PostEditor />} />
          <Route path="/admin/posts/:id/edit" element={<PostEditor />} />
        </Route>
      </Route>
    </Routes>
  )
}
