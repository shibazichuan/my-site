import { Link } from 'react-router-dom';

const TOOLS = [
  { to: '/tools/shortlink', icon: '🔗', title: '短链接', desc: '生成短链接，查看点击统计' },
  { to: '/tools/image', icon: '🖼️', title: '图片压缩', desc: '上传图片，在线压缩优化体积' },
  { to: '/tools/json', icon: '📋', title: 'JSON 格式化', desc: '格式化/压缩 JSON，树形视图，JSONPath 搜索' },
  { to: '/tools/base64', icon: '🔐', title: 'Base64 编解码', desc: '文本和文件 Base64 编码/解码' },
  { to: '/tools/regex', icon: '🔍', title: '正则测试器', desc: '在线测试正则表达式，高亮匹配' },
  { to: '/tools/diff', icon: '📊', title: 'Diff 对比', desc: '文本差异对比，增删改高亮' },
  { to: '/tools/markdown', icon: '📄', title: 'Markdown 编辑器', desc: '在线编辑，实时预览' },
  { to: '/tools/jwt', icon: '🔐', title: 'JWT 调试器', desc: '解码 JWT Header/Payload' },
];

export default function ToolsIndex() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">🛠️ 工具箱</h1>
      <p className="text-sm text-gray-500 mb-8">实用工具，提升效率</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <Link key={tool.to} to={tool.to}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="text-3xl mb-3">{tool.icon}</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1">{tool.title}</h3>
            <p className="text-sm text-gray-500">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
