import type { ChatMessage as ChatMessageType } from '../../types';

export default function ChatMessage({ msg }: { msg: ChatMessageType }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100"
            dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
          />
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          U
        </div>
      )}
    </div>
  );
}

function formatContent(content: string): string {
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks ```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code: string) => {
    return `<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs"><code>${code}</code></pre>`;
  });

  // Inline code `
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs">$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}
