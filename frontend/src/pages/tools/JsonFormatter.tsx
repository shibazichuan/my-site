import { useState } from 'react';
import ToolLayout from '../../components/ToolLayout';
import CopyButton from '../../components/CopyButton';
import JsonTreeView from '../../components/JsonTreeView';

type ViewMode = 'text' | 'tree';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [jsonPath, setJsonPath] = useState('');
  const [pathResult, setPathResult] = useState('');

  function format() {
    setError(''); setPathResult('');
    try {
      const obj = JSON.parse(input);
      setParsed(obj);
      setOutput(JSON.stringify(obj, null, indentSize));
    } catch (e: unknown) {
      setError((e as Error).message);
      setParsed(null);
      setOutput('');
    }
  }

  function compress() {
    setError(''); setPathResult('');
    try {
      const obj = JSON.parse(input);
      setParsed(obj);
      setOutput(JSON.stringify(obj));
    } catch (e: unknown) {
      setError((e as Error).message);
      setParsed(null);
      setOutput('');
    }
  }

  function searchPath() {
    if (!parsed || !jsonPath) return;
    try {
      const parts = jsonPath.split('.').map(p => p.trim()).filter(Boolean);
      let result: unknown = parsed;
      for (const part of parts) {
        if (result && typeof result === 'object') {
          result = Array.isArray(result)
            ? (result as unknown[])[parseInt(part)]
            : (result as Record<string, unknown>)[part];
        } else { throw new Error('Path not found'); }
      }
      setPathResult(JSON.stringify(result, null, 2));
    } catch (e: unknown) {
      setPathResult(`Error: ${(e as Error).message}`);
    }
  }

  return (
    <ToolLayout title="📋 JSON 格式化" description="格式化、压缩 JSON，支持树形视图和 JSONPath 搜索">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">输入</label>
            <div className="flex gap-1">
              <button onClick={format} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">格式化</button>
              <button onClick={compress} className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700">压缩</button>
            </div>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder='{"key":"value"}' rows={16}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">输出</label>
            <div className="flex items-center gap-2">
              <select value={indentSize} onChange={(e) => { setIndentSize(Number(e.target.value)); if (output) format(); }}
                className="border border-gray-300 rounded px-2 py-1 text-xs outline-none">
                <option value={2}>2空格</option><option value={4}>4空格</option>
              </select>
              <button onClick={() => setViewMode(v => v === 'text' ? 'tree' : 'text')}
                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                {viewMode === 'text' ? '树形' : '文本'}
              </button>
              {output && <CopyButton text={output} />}
            </div>
          </div>
          {error ? (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded border border-red-200 font-mono">{error}</div>
          ) : viewMode === 'tree' && parsed ? (
            <div className="border border-gray-300 rounded-lg bg-white overflow-auto" style={{ maxHeight: '320px' }}>
              <JsonTreeView data={parsed} />
            </div>
          ) : (
            <textarea readOnly value={output} rows={16}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none resize-y" />
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input value={jsonPath} onChange={(e) => setJsonPath(e.target.value)}
          placeholder="JSONPath, 如: user.address.city" onKeyDown={(e) => e.key === 'Enter' && searchPath()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={searchPath}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-blue-700">搜索</button>
      </div>
      {pathResult && (
        <textarea readOnly value={pathResult} rows={4}
          className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none resize-y" />
      )}
    </ToolLayout>
  );
}
