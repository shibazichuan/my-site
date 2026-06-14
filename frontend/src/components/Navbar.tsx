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
