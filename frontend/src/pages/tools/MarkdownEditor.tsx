import { useState, useMemo } from 'react';
import ToolLayout from '../../components/ToolLayout';

function renderMarkdown(content: string): string {
  let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs"><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-base mt-4 mb-2">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-lg mt-4 mb-2">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="font-bold text-xl mt-4 mb-2">$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

export default function MarkdownEditor() {
  const [content, setContent] = useState('');
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <ToolLayout title="Markdown 编辑器" description="在线编辑 Markdown，实时预览渲染效果">
      <div className="grid grid-cols-2 gap-4" style={{ minHeight: '60vh' }}>
        <div>
          <div className="text-xs text-gray-500 mb-1">编辑</div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="# 输入 Markdown..." className="w-full h-full min-h-[400px] border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">预览</div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[400px] prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: html || '<span class="text-gray-400">预览区域...</span>' }} />
        </div>
      </div>
    </ToolLayout>
  );
}
