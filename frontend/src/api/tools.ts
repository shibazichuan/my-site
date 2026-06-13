import client from './client';
import type { ShortLinkItem, PaginatedShortLinks, ImageRecordItem, PaginatedImages } from '../types';

// ShortLinks
export async function createShortLink(original_url: string): Promise<ShortLinkItem> {
  const { data } = await client.post<ShortLinkItem>('/tools/shortlinks', { original_url });
  return data;
}
export async function fetchShortLinks(page = 1, page_size = 20): Promise<PaginatedShortLinks> {
  const { data } = await client.get<PaginatedShortLinks>('/tools/shortlinks', { params: { page, page_size } });
  return data;
}
export async function deleteShortLink(id: string): Promise<void> {
  await client.delete(`/tools/shortlinks/${id}`);
}

// Images
export async function uploadImage(file: File, quality = 80): Promise<ImageRecordItem> {
  const form = new FormData(); form.append('file', file); form.append('quality', String(quality));
  const { data } = await client.post<ImageRecordItem>('/tools/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
export async function fetchImages(page = 1, page_size = 20): Promise<PaginatedImages> {
  const { data } = await client.get<PaginatedImages>('/tools/images', { params: { page, page_size } });
  return data;
}
