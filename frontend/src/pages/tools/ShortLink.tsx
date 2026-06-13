import { useState, useEffect, type FormEvent } from 'react';
import { createShortLink, fetchShortLinks, deleteShortLink } from '../../api/tools';
import ToolLayout from '../../components/ToolLayout';
import CopyButton from '../../components/CopyButton';
import Pagination from '../../components/Pagination';
import type { ShortLinkItem } from '../../types';

export default function ShortLink() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [links, setLinks] = useState<ShortLinkItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadLinks() {
    try { const res = await fetchShortLinks(page); setLinks(res.items); setTotal(res.total); }
    catch { /* ignore */ }
  }
  useEffect(() => { loadLinks(); }, [page]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!url) { setError('请输入链接'); return; }
    setLoading(true);
    try { await createShortLink(url); setUrl(''); setPage(1); await loadLinks(); }
    catch { setError('生成失败，请重试'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除？')) return;
    try { await deleteShortLink(id); await loadLinks(); } catch { /* ignore */ }
  }

  return (
    <ToolLayout title="🔗 短链接" description="把长链接变短，方便分享">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
          placeholder="粘贴长链接..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '生成中...' : '生成'}
        </button>
      </form>
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>}

      {links.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">短链接</th>
                  <th className="px-4 py-3 font-medium text-gray-600">原始链接</th>
                  <th className="px-4 py-3 font-medium text-gray-600">点击</th>
                  <th className="px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={link.short_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline text-xs">{link.short_url}</a>
                      <CopyButton text={link.short_url} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{link.original_url}</td>
                    <td className="px-4 py-3 text-gray-500">{link.click_count}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(link.id)} className="text-red-500 hover:underline text-xs">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={20} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">还没有短链接</div>
      )}
    </ToolLayout>
  );
}
