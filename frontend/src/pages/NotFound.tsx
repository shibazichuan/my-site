import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <SEO title="页面不存在" description="您访问的页面不存在" />
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">页面不存在或已被删除</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">返回首页</Link>
      </div>
    </div>
  );
}
