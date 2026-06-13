import { useState } from 'react';

interface Props { text: string; label?: string; }

export default function CopyButton({ text, label = '复制' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={handleCopy}
      className={`text-xs px-2.5 py-1 rounded border transition-colors ml-2 ${
        copied ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}>
      {copied ? '✓ 已复制' : label}
    </button>
  );
}
