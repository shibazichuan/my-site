import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import ChatMain from './chat/ChatMain';

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [convId, _setConvId] = useState<string | null>(null);
  const [_refreshKey, setRefreshKey] = useState(0);
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center text-2xl"
        title="在线客服"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <div className="font-semibold text-sm">💬 在线客服</div>
              <div className="text-xs text-indigo-200">咨询技术服务，我会尽快回复</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg">✕</button>
          </div>

          {isAuthenticated ? (
            <div className="flex-1 flex flex-col min-h-0">
              <ChatMain
                conversationId={convId}
                onRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-400 text-sm">
              <div>
                <div className="text-3xl mb-3">🔒</div>
                <p>请先登录后使用在线客服</p>
                <a href="/login" className="text-indigo-600 hover:underline mt-2 inline-block">前往登录 →</a>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
