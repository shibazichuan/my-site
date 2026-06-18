import { useWebSocket } from '../hooks/useWebSocket';

export default function Footer() {
  const { onlineCount } = useWebSocket();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        &copy; {new Date().getFullYear()} 知讯图 &middot; Powered by FastAPI + React
        {onlineCount > 0 && (
          <span className="ml-3">
            &middot; <span className="text-green-500">🟢</span> {onlineCount} 人在线
          </span>
        )}
      </div>
    </footer>
  );
}
