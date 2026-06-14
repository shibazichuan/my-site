import { useEffect, useState } from 'react';
import type { ConversationListItem, QuotaInfo } from '../../types';
import { fetchConversations, deleteConversation, fetchQuota } from '../../api/chat';

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRefresh: number;
}

export default function ChatSidebar({ activeId, onSelect, onNew, onRefresh }: Props) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    fetchConversations(1, 50).then((res) => setConversations(res.items)).catch(() => {});
    fetchQuota().then(setQuota).catch(() => {});
  }, [onRefresh]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('确定删除这个对话？')) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) onNew();
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full shrink-0">
      <div className="p-3 border-b border-gray-700">
        <button
          onClick={onNew}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wide">历史对话</div>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group flex items-center justify-between px-3 py-2 mx-1.5 mb-0.5 rounded-lg cursor-pointer text-sm transition-colors ${activeId === conv.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <span className="truncate flex-1">{conv.title}</span>
            <button
              onClick={(e) => handleDelete(conv.id, e)}
              className="ml-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-600 text-center">暂无对话</div>
        )}
      </div>
      {quota && (
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
          今日剩余: <span className="text-green-400 font-medium">{quota.remaining}/{quota.limit}</span>
        </div>
      )}
    </div>
  );
}
