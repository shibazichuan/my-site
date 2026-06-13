import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import type { PostListItem } from '../types';

const ALL_TAGS = [
  { name: '前端', slug: 'frontend' }, { name: '后端', slug: 'backend' },
  { name: '工具', slug: 'tools' }, { name: 'AI', slug: 'ai' },
];

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const page = Number(searchParams.get('page')) || 1;
  const tag = searchParams.get('tag') || '';

  useEffect(() => {
    setLoading(true);
    fetchPosts({ page, page_size: 12, tag: tag || undefined, search: search || undefined })
      .then((res) => { setPosts(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, tag, search]);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📝 博客</h1>
      <div className="flex gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParams('search', search)}
          placeholder="搜索文章..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => updateParams('search', search)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">搜索</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => updateParams('tag', '')}
          className={`px-3 py-1 rounded-full text-sm ${!tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
        {ALL_TAGS.map((t) => (
          <button key={t.slug} onClick={() => updateParams('tag', t.slug)}
            className={`px-3 py-1 rounded-full text-sm ${tag === t.slug ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.name}</button>
        ))}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div>
      : posts.length === 0 ? <div className="text-center py-12 text-gray-400">暂无文章</div>
      : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          <Pagination page={page} total={total} pageSize={12} onPageChange={(p) => updateParams('page', String(p))} />
        </>
      )}
    </div>
  );
}
