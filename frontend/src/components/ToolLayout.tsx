import type { ReactNode } from 'react';

interface Props { title: string; description: string; children: ReactNode; }

export default function ToolLayout({ title, description, children }: Props) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
      <p className="text-sm text-gray-500 mb-6">{description}</p>
      {children}
    </div>
  );
}
