import client from './client';
import type { ConversationDetail, PaginatedConversations, QuotaInfo } from '../types';

export async function fetchConversations(page = 1, pageSize = 20): Promise<PaginatedConversations> {
  const { data } = await client.get<PaginatedConversations>('/chat/conversations', {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const { data } = await client.get<ConversationDetail>(`/chat/conversations/${id}`);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await client.delete(`/chat/conversations/${id}`);
}

export async function fetchQuota(): Promise<QuotaInfo> {
  const { data } = await client.get<QuotaInfo>('/chat/quota');
  return data;
}

export interface SSECallbacks {
  onToken: (content: string) => void;
  onDone: (conversationId: string, title: string) => void;
  onError: (detail: string) => void;
}

export async function sendMessage(
  message: string,
  conversationId: string | null,
  callbacks: SSECallbacks,
): Promise<void> {
  const token = localStorage.getItem('access_token');
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

  if (!response.ok) {
    callbacks.onError(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'token') {
            callbacks.onToken(event.content);
          } else if (event.type === 'done') {
            callbacks.onDone(event.conversation_id, event.title);
          } else if (event.type === 'error') {
            callbacks.onError(event.detail);
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  }
}
