import { useState } from 'react';
import ToolLayout from '../../components/ToolLayout';

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch { return '(解码失败)'; }
}

export default function JwtDebugger() {
  const [token, setToken] = useState('');
  const parts = token.split('.');
  const header = parts[0] ? decodeBase64Url(parts[0]) : '';
  const payload = parts[1] ? decodeBase64Url(parts[1]) : '';
  const signature = parts[2] || '';

  function formatJson(raw: string) {
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  }

  return (
    <ToolLayout title="JWT 调试器" description="在线解码 JWT Token，查看 Header 和 Payload">
      <textarea value={token} onChange={e => setToken(e.target.value)} rows={3} placeholder="粘贴 JWT Token (eyJhbGci...)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
      {parts.length === 3 ? (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2 font-semibold">HEADER</div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{formatJson(header)}</pre>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2 font-semibold">PAYLOAD</div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{formatJson(payload)}</pre>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2 font-semibold">SIGNATURE</div>
            <code className="text-xs text-gray-400 break-all">{signature}</code>
            <div className="text-xs text-yellow-600 mt-2">⚠ 签名未验证（需要密钥才能验证）</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">输入 JWT Token 自动解码</div>
      )}
    </ToolLayout>
  );
}
