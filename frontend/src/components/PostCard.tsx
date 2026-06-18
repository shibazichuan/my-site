import { Link } from 'react-router-dom';
import type { PostListItem } from '../types';
import TagBadge from './TagBadge';

export default function PostCard({ post }: { post: PostListItem }) {
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : '';
  return (
    <article className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {post.cover_image && (
        <Link to={`/blog/${post.slug}`}>
          <img src={post.cover_image} alt={post.title} className="w-full h-40 object-cover" />
        </Link>
      )}
      <div className="p-4">
        <Link to={`/blog/${post.slug}`}>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 mb-1 line-clamp-2">{post.title}</h3>
        </Link>
        {post.summary && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{post.summary}</p>}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {post.tags.map((t) => <TagBadge key={t.slug} name={t.name} slug={t.slug} />)}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{post.author_name}</span>
          <span>{date} &middot; {post.view_count} 阅读</span>
        </div>
      </div>
    </article>
  );
}
