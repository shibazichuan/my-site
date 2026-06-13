export interface User {
  id: string; email: string; username: string; is_admin: boolean; is_active: boolean;
}
export interface Tag {
  name: string; slug: string; post_count: number;
}
export interface PostListItem {
  id: string; title: string; slug: string; summary: string | null;
  cover_image: string | null; tags: Tag[]; author_name: string;
  published_at: string | null; view_count: number;
}
export interface PostDetail extends PostListItem {
  content: string; html: string; status: string; created_at: string; updated_at: string;
}
export interface PaginatedPosts {
  items: PostListItem[]; total: number; page: number; page_size: number;
}
export interface TokenResponse {
  access_token: string; refresh_token: string; token_type: string; user: User;
}
