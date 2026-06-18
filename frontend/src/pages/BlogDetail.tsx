import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPost, recordView } from '../api/posts';
import TagBadge from '../components/TagBadge';
import GiscusComment from '../components/GiscusComment';
import type { PostDetail } from '../types';

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return; setLoading(true);
    fetchPost(slug).then((p) => { setPost(p); recordView(slug); }).catch(() => setPost(null)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-gray-400 dark:text-gray-500">加载中...</div>;
  if (!post) return <div className="text-center py-20 text-gray-400 dark:text-gray-500">文章不存在</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/blog" className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; 返回博客</Link>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{post.title}</h1>
      <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500 mb-6">
        <span>{post.author_name}</span>
        <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : ''}</span>
        <span>{post.view_count} 阅读</span>
      </div>
      {post.tags.length > 0 && (
        <div className="flex gap-2 mb-6">{post.tags.map((t) => <TagBadge key={t.slug} name={t.name} slug={t.slug} />)}</div>
      )}
      <div className="prose prose-gray dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.html }} />

      <GiscusComment
        repo="shibazichuan/my-site"
        repoId="R_kgDOS6WwZg"
        category="General"
        categoryId="DIC_kwDOS6WwZs4C_aR5"
      />
    </article>
  );
}
