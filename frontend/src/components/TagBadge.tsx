import { Link } from 'react-router-dom';
export default function TagBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <Link to={`/blog?tag=${slug}`} className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs hover:bg-blue-100 transition-colors">
      {name}
    </Link>
  );
}
