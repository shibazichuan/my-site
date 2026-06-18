import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err: unknown) { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Login failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold text-center mb-8 dark:text-gray-100">登录</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="your@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '登录中...' : '登录'}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">还没有账号？<Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">注册</Link></p>
      </form>
    </div>
  );
}
