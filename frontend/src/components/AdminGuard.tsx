import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AdminGuard() {
  const { isAuthenticated, isAdmin, fetchUser } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated) fetchUser().finally(() => setChecking(false));
    else setChecking(false);
  }, []);

  if (checking) return <div className="text-center py-20 text-gray-400">验证中...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="text-center py-20 text-gray-500">403 - 无权限访问</div>;
  return <Outlet />;
}
