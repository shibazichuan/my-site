import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-lg text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">知讯图</Link>
          <Link to="/blog" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">博客</Link>
          <Link to="/services" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">🛠️ 服务</Link>
          {isAuthenticated && <Link to="/tools" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">工具箱</Link>}
          {isAuthenticated && <Link to="/chat" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">🤖 AI 聊天</Link>}
          {isAuthenticated && <Link to="/credits" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">💰 积分</Link>}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-base"
            title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {isAuthenticated ? (
            <>
              {isAdmin && <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">后台</Link>}
              <span className="text-gray-500 dark:text-gray-400">{user?.username}</span>
              <button onClick={logout} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">退出</button>
            </>
          ) : (
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">登录</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
