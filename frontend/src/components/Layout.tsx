import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => { initialize(); }, [initialize]);
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
