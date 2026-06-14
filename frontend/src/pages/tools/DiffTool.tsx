import { useState, useMemo } from 'react';
import ToolLayout from '../../components/ToolLayout';

function diffLines(a: string, b: string): { type: 'same' | 'add' | 'remove'; text: string }[] {
  const al = a.split('\n'), bl = b.split('\n');
  const result: { type: 'same' | 'add' | 'remove'; text: string }[] = [];
  // Simple line-by-line diff
  const maxLen = Math.max(al.length, bl.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < al.length && i < bl.length && al[i] === bl[i]) {
      result.push({ type: 'same', text: al[i] });
    } else {
      if (i < al.length) result.push({ type: 'remove', text: al[i] });
      if (i < bl.length) result.push({ type: 'add', text: bl[i] });
    }
  }
  return result;
}

export default function DiffTool() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const diff = useMemo(() => diffLines(left, right), [left, right]);

  return (
    <ToolLayout title="Diff 对比" description="对比两段文本差异，增删改一目了然">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">原始文本</div>
          <textarea value={left} onChange={e => setLeft(e.target.value)} rows={12} placeholder="粘贴原始文本..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">修改后文本</div>
          <textarea value={right} onChange={e => setRight(e.target.value)} rows={12} placeholder="粘贴修改后文本..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4 font-mono text-sm leading-relaxed min-h-[100px]">
        {diff.length === 0 ? <span className="text-gray-400">输入文本查看差异</span> : diff.map((line, i) => (
          <div key={i} className={`${line.type === 'add' ? 'bg-green-50 text-green-800' : line.type === 'remove' ? 'bg-red-50 text-red-800' : ''} px-2`}>
            <span className="w-6 inline-block text-xs text-gray-400 select-none">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
            {line.text || ' '}
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}
