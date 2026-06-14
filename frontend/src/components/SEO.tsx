import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
}

export default function SEO({ title, description, image, type = 'website' }: Props) {
  const siteName = '知讯图';
  const fullTitle = title ? `${title} — ${siteName}` : siteName;
  const desc = description || '全栈开发者个人网站 — 博客、工具、技术服务';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
