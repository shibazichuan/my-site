import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts } from '../api/posts';
import PostCard from '../components/PostCard';
import type { PostListItem } from '../types';

export default function Home() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  useEffect(() => { fetchPosts({ page_size: 3 }).then((res) => setPosts(res.items)).catch(() => {}); }, []);

  return (
    <div>
      <section className="text-center py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">👨‍💻</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">你好，我是 <span className="text-blue-600">YourName</span></h1>
        <p className="text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">全栈开发者，热爱开源。这里记录我的技术实验、分享实用工具，偶尔也写写博客。</p>
        <div className="flex gap-3 justify-center">
          <Link to="/blog" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">📝 读博客</Link>
          <a href="https://github.com" target="_blank" rel="noopener" className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">💻 GitHub</a>
        </div>
      </section>
      {posts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">📝 最新文章</h2>
            <Link to="/blog" className="text-sm text-blue-600 hover:underline">查看全部 &rarr;</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </section>
      )}
    </div>
  );
}
