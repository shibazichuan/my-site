import { useState, useMemo } from 'react';
import ToolLayout from '../../components/ToolLayout';

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const matches = useMemo(() => {
    setError('');
    if (!pattern || !text) return [];
    try {
      const re = new RegExp(pattern, flags);
      const results = [...text.matchAll(re)];
      return results;
    } catch (e: any) {
      setError(e.message);
      return [];
    }
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (!pattern || matches.length === 0) return text;
    try {
      const re = new RegExp(pattern, flags);
      return text.replace(re, (match) => `<mark class="bg-yellow-200 rounded px-0.5">${match}</mark>`);
    } catch { return text; }
  }, [pattern, flags, text, matches.length]);

  return (
    <ToolLayout title="正则测试器" description="在线测试正则表达式，实时查看匹配结果和捕获组">
      <div className="space-y-4">
        <div className="flex gap-3">
          <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="/正则表达式/" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={flags} onChange={e => setFlags(e.target.value)} placeholder="flags (g/i/m)" className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="测试文本..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
        <div>
          <div className="text-xs text-gray-500 mb-2">匹配结果 ({matches.length})</div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[60px] text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: highlighted || '<span class="text-gray-400">匹配内容高亮显示...</span>' }} />
        </div>
        {matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((m, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                <div className="text-xs text-gray-400 mb-1">匹配 #{i + 1}: <code className="bg-gray-100 px-1 rounded">{m[0]}</code></div>
                {m.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[...m].slice(1).map((g, j) => (
                      <span key={j} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">组{j + 1}: {g || '(空)'}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
