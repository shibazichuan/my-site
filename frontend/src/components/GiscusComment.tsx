import { useEffect, useRef } from 'react';

interface GiscusCommentProps {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping?: 'pathname' | 'url' | 'title' | 'og:title';
  theme?: string;
}

/**
 * Giscus 评论组件 — 基于 GitHub Discussions
 *
 * 使用前需要：
 * 1. 仓库开启 Discussions: Settings → Features → Discussions
 * 2. 安装 Giscus App: https://github.com/apps/giscus
 * 3. 访问 https://giscus.app 获取 repoId / categoryId
 */
export default function GiscusComment({
  repo,
  repoId,
  category,
  categoryId,
  mapping = 'pathname',
  theme = 'preferred_color_scheme',
}: GiscusCommentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || container.hasChildNodes()) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', category);
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', mapping);
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    container.appendChild(script);
  }, [repo, repoId, category, categoryId, mapping, theme]);

  return <div ref={ref} className="mt-12 pt-8 border-t border-gray-200" />;
}
