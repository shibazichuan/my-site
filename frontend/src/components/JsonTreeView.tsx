import { useState } from 'react';

function renderValue(val: unknown): string {
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return `"${val}"`;
  return JSON.stringify(val);
}

interface TreeNodeProps { name: string; value: unknown; depth: number; }

function TreeNode({ name, value, depth }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 3);
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    return (
      <div className="ml-4" style={{ paddingLeft: depth * 16 }}>
        <span className="text-blue-700">{name}</span>
        <span className="text-gray-400">: </span>
        <span className={typeof value === 'string' ? 'text-green-600' : 'text-orange-600'}>
          {renderValue(value)}
        </span>
      </div>
    );
  }

  const entries: [string, unknown][] = isObject
    ? Object.entries(value as Record<string, unknown>)
    : (value as unknown[]).map((v, i): [string, unknown] => [String(i), v]);
  const bracket = isObject ? ['{', '}'] : ['[', ']'];

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="cursor-pointer hover:text-blue-600" onClick={() => setOpen(!open)}>
        <span className="text-gray-400 mr-1">{open ? '▼' : '▶'}</span>
        <span className="text-blue-700">{name}</span>
        <span className="text-gray-400"> {bracket[0]}</span>
        {!open && <span className="text-gray-400"> ... {bracket[1]}</span>}
      </div>
      {open && (
        <>
          {entries.map(([k, v]) => (
            <TreeNode key={k} name={String(k)} value={v} depth={depth + 1} />
          ))}
          <div style={{ paddingLeft: depth * 16 }}>
            <span className="text-gray-400">{bracket[1]}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function JsonTreeView({ data }: { data: unknown }) {
  if (data === null) return <div className="text-gray-400 text-sm p-4">null</div>;
  const isArray = Array.isArray(data);
  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>);
  const bracket = isArray ? ['[', ']'] : ['{', '}'];
  return (
    <div className="font-mono text-xs leading-relaxed p-4 overflow-auto">
      <div className="text-gray-400">{bracket[0]}</div>
      {entries.map(([k, v]) => (
        <TreeNode key={k} name={k} value={v} depth={0} />
      ))}
      <div className="text-gray-400">{bracket[1]}</div>
    </div>
  );
}
