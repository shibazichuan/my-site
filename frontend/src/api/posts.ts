import client from './client';
import type { PostDetail, PaginatedPosts } from '../types';

export interface PostsQuery {
  page?: number; page_size?: number; tag?: string; search?: string;
}
export async function fetchPosts(query: PostsQuery = {}): Promise<PaginatedPosts> {
  const { data } = await client.get<PaginatedPosts>('/posts', { params: query });
  return data;
}
export async function fetchPost(slug: string): Promise<PostDetail> {
  const { data } = await client.get<PostDetail>(`/posts/${slug}`);
  return data;
}
export async function recordView(slug: string): Promise<void> {
  await client.post(`/posts/${slug}/view`);
}

export interface PostCreateData {
  title: string; content: string; tags?: string[]; summary?: string; cover_image?: string; status?: string;
}
export async function createPost(data: PostCreateData): Promise<PostDetail> {
  const { data: post } = await client.post<PostDetail>('/admin/posts', data);
  return post;
}
export async function updatePost(id: string, data: Partial<PostCreateData>): Promise<PostDetail> {
  const { data: post } = await client.put<PostDetail>(`/admin/posts/${id}`, data);
  return post;
}
export async function deletePost(id: string): Promise<void> {
  await client.delete(`/admin/posts/${id}`);
}
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData(); form.append('file', file);
  const { data } = await client.post<{ url: string }>('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
