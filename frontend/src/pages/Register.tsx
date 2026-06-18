import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('两次密码不一致'); return; }
    if (password.length < 8) { setError('密码至少8位'); return; }
    setLoading(true);
    try { await register(email, username, password); navigate('/'); }
    catch (err: unknown) { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold text-center mb-8 dark:text-gray-100">注册</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded">{error}</div>}
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
          <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认密码</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '注册中...' : '注册'}
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">已有账号？<Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">登录</Link></p>
      </form>
    </div>
  );
}
