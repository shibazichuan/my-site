import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts, deletePost } from '../../api/posts';
import type { PostListItem } from '../../types';

export default function PostList() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const res = await fetchPosts({ page_size: 100 }); setPosts(res.items); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`确定删除 "${title}"？`)) return;
    try { await deletePost(id); setPosts((prev) => prev.filter((p) => p.id !== id)); }
    catch { alert('删除失败'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">📝 文章管理</h1>
        <Link to="/admin/posts/new" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">+ 写文章</Link>
      </div>
      {loading ? <div className="text-gray-400">加载中...</div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">标题</th>
                <th className="px-4 py-3 font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 font-medium text-gray-600">阅读</th>
                <th className="px-4 py-3 font-medium text-gray-600">日期</th>
                <th className="px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{post.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${post.published_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.published_at ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{post.view_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-3">
                    <Link to={`/admin/posts/${post.id}/edit`} className="text-blue-600 hover:underline">编辑</Link>
                    <button onClick={() => handleDelete(post.id, post.title)} className="text-red-500 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无文章</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
