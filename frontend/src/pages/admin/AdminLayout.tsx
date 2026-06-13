import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const links = [{ to: '/admin/posts', label: '📝 文章管理' }];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-52 bg-gray-900 text-gray-300 p-4 shrink-0">
        <div className="font-bold text-white mb-6 text-sm">🛠️ 管理后台</div>
        <nav className="space-y-1 text-sm">
          {links.map((link) => (
            <Link key={link.to} to={link.to}
              className={`block px-3 py-2 rounded ${location.pathname.startsWith(link.to) ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs text-gray-500">{user?.username}</div>
      </aside>
      <main className="flex-1 p-6 bg-gray-50"><Outlet /></main>
    </div>
  );
}
