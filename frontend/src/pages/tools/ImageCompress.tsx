import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { uploadImage, fetchImages } from '../../api/tools';
import ToolLayout from '../../components/ToolLayout';
import Pagination from '../../components/Pagination';
import type { ImageRecordItem } from '../../types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageRecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadImages() {
    try { const res = await fetchImages(page); setImages(res.items); setTotal(res.total); }
    catch { /* ignore */ }
  }
  useEffect(() => { loadImages(); }, [page]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!file) { setError('请选择图片'); return; }
    setLoading(true);
    try { await uploadImage(file, quality); setFile(null); setPage(1); await loadImages(); }
    catch { setError('压缩失败，请重试'); }
    finally { setLoading(false); }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  return (
    <ToolLayout title="🖼️ 图片压缩" description="上传图片，在线压缩减小体积">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择图片</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange}
            className="w-full text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">压缩质量: {quality}%</label>
          <input type="range" min="10" max="100" value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-blue-600" />
        </div>
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? '压缩中...' : '上传压缩'}
        </button>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
      </form>

      {images.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">文件名</th>
                  <th className="px-4 py-3 font-medium text-gray-600">原始大小</th>
                  <th className="px-4 py-3 font-medium text-gray-600">压缩后</th>
                  <th className="px-4 py-3 font-medium text-gray-600">比率</th>
                  <th className="px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {images.map((img) => (
                  <tr key={img.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 text-xs">{img.original_name}</td>
                    <td className="px-4 py-3 text-gray-500">{formatSize(img.original_size)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatSize(img.compressed_size)}</td>
                    <td className="px-4 py-3">
                      <span className="text-green-600 text-xs font-medium">
                        ↓ {((1 - img.compressed_size / img.original_size) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={img.url} target="_blank" rel="noopener" download
                        className="text-blue-600 hover:underline text-xs">下载</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={20} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">还没有压缩记录</div>
      )}
    </ToolLayout>
  );
}
