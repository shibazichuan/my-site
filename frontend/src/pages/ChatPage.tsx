import { useState, useCallback } from 'react';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatMain from '../components/chat/ChatMain';

export default function ChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);
  const handleNew = useCallback(() => { setActiveId(null); setSidebarOpen(false); }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] relative">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden absolute top-3 left-3 z-50 bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar — always visible on desktop, overlay on mobile */}
      <div className={`${sidebarOpen ? 'fixed inset-0 z-40 flex' : 'hidden'} md:relative md:flex md:inset-auto`}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className="relative z-50 md:z-auto">
          <ChatSidebar
            activeId={activeId}
            onSelect={handleSelect}
            onNew={handleNew}
            onRefresh={refreshKey}
          />
        </div>
      </div>

      {/* Main chat area */}
      <ChatMain
        conversationId={activeId}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
