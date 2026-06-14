import { useEffect, useState, useRef } from 'react';
import { fetchConversation, sendMessage } from '../../api/chat';
import type { ChatMessage as ChatMessageType } from '../../types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface Props {
  conversationId: string | null;
  onRefresh: () => void;
}

export default function ChatMain({ conversationId, onRefresh }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setStreamText('');
      return;
    }
    setLoading(true);
    fetchConversation(conversationId)
      .then((conv) => setMessages(conv.messages))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  async function handleSend(message: string) {
    const userMsg: ChatMessageType = {
      id: 'local-' + Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamText('');

    await sendMessage(message, conversationId, {
      onToken: (content) => setStreamText((prev) => prev + content),
      onDone: (convId) => {
        setStreamText('');
        setStreaming(false);
        if (!conversationId) {
          onRefresh();
        } else {
          fetchConversation(convId).then((conv) => setMessages(conv.messages)).catch(() => {});
        }
      },
      onError: (detail) => {
        setStreamText('');
        setStreaming(false);
        alert(detail);
      },
    });
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          选择对话或点击 "+" 创建新对话
        </div>
        <ChatInput onSend={handleSend} disabled={false} />
      </div>
    );
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}
          {streaming && streamText && (
            <ChatMessage
              msg={{
                id: 'streaming',
                role: 'assistant',
                content: streamText,
                created_at: new Date().toISOString(),
              }}
            />
          )}
          {streaming && !streamText && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold">AI</div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse rounded-sm" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
