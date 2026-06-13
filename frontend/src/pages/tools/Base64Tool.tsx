import { useState, type ChangeEvent } from 'react';
import ToolLayout from '../../components/ToolLayout';
import CopyButton from '../../components/CopyButton';

type TabKey = 'encode' | 'decode';
type Mode = 'text' | 'file';

const HISTORY_KEY = 'base64_history';

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(item: string) {
  const history = loadHistory().filter(h => h !== item);
  history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export default function Base64Tool() {
  const [tab, setTab] = useState<TabKey>('encode');
  const [mode, setMode] = useState<Mode>('text');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>(loadHistory());

  function handleEncode() {
    setError('');
    try {
      const result = btoa(input);
      setOutput(result);
      saveHistory(`编码: ${input.slice(0, 50)}...`);
      setHistory(loadHistory());
    } catch (e: unknown) { setError((e as Error).message); }
  }

  function handleDecode() {
    setError('');
    try {
      const result = atob(input);
      setOutput(result);
      saveHistory(`解码: ${input.slice(0, 50)}...`);
      setHistory(loadHistory());
    } catch { setError('解码失败，请检查输入是否为有效 Base64'); }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (tab === 'encode') setInput(base64);
      else {
        try { setOutput(atob(base64)); } catch { setError('文件解码失败'); }
      }
    };
    reader.onerror = () => setError('文件读取失败');
    if (tab === 'encode') reader.readAsDataURL(file);
    else reader.readAsDataURL(file);
  }

  const isEncode = tab === 'encode';

  return (
    <ToolLayout title="🔐 Base64 编解码" description="对文本或文件进行 Base64 编码和解码">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['encode', 'decode'] as TabKey[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setInput(''); setOutput(''); setError(''); }}
              className={`px-4 py-1.5 text-sm rounded-lg ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'encode' ? '编码' : '解码'}
            </button>
          ))}
          <div className="flex ml-auto gap-1">
            {(['text', 'file'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs rounded ${mode === m ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {m === 'text' ? '📝 文本' : '📁 文件'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'file' && (
          <div>
            <input type="file" onChange={handleFile}
              className="w-full text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isEncode ? '原文' : 'Base64 密文'}</label>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10}
              placeholder={isEncode ? '输入要编码的文本...' : '粘贴 Base64 字符串...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{isEncode ? 'Base64 结果' : '解码结果'}</label>
              {output && <CopyButton text={output} />}
            </div>
            <textarea readOnly value={output} rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none resize-y" />
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded">{error}</div>}

        <button onClick={isEncode ? handleEncode : handleDecode}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          {isEncode ? '编码 →' : '← 解码'}
        </button>

        {history.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">历史记录 ({history.length})</summary>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {history.map((item, i) => (
                <div key={i} className="text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded truncate">{item}</div>
              ))}
            </div>
          </details>
        )}
      </div>
    </ToolLayout>
  );
}
