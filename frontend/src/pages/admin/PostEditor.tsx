import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPost, updatePost, fetchPost, uploadFile, type PostCreateData } from '../../api/posts';
import type { PostDetail } from '../../types';

export default function PostEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (id) fetchPost(id).then((p: PostDetail) => {
      setTitle(p.title); setContent(p.content); setTags(p.tags.map((t) => t.name).join(', '));
      setSummary(p.summary || ''); setStatus(p.status);
    }).catch(() => alert('文章不存在')).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title || !content) { alert('标题和内容不能为空'); return; }
    setSaving(true);
    const data: PostCreateData = {
      title, content, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      summary: summary || undefined, status,
    };
    try {
      if (isEdit && id) await updatePost(id, data);
      else await createPost(data);
      navigate('/admin/posts');
    } catch (err: unknown) { alert('保存失败: ' + ((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Unknown')); }
    finally { setSaving(false); }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadFile(file); setContent((prev) => prev + `\n![${file.name}](${url})\n`); }
    catch { alert('上传失败'); }
  }

  if (loading) return <div className="text-gray-400">加载中...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? '编辑文章' : '写文章'}</h1>
      <form onSubmit={handleSave} className="space-y-4 max-w-4xl">
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="文章标题" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={18}
              placeholder="Markdown 内容..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
          </div>
          <div className="w-56 space-y-3 shrink-0">
            <div>
              <label className="block text-xs text-gray-500 mb-1">标签（逗号分隔）</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="前端, 工具"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">摘要</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="一句话描述..."
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">草稿</option>
                <option value="published">发布</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">上传图片</label>
              <input type="file" accept="image/*" onChange={handleImageUpload}
                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '保存中...' : isEdit ? '更新' : '发布'}
              </button>
              <button type="button" onClick={() => navigate('/admin/posts')}
                className="flex-1 border border-gray-300 text-gray-700 py-1.5 rounded text-xs hover:bg-gray-50">取消</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
