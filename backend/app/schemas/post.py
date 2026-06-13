from datetime import datetime
from pydantic import BaseModel


class TagResponse(BaseModel):
    name: str
    slug: str
    post_count: int = 0

    model_config = {"from_attributes": True}


class PostListItem(BaseModel):
    id: str
    title: str
    slug: str
    summary: str | None = None
    cover_image: str | None = None
    tags: list[TagResponse] = []
    author_name: str
    published_at: datetime | None = None
    view_count: int = 0

    model_config = {"from_attributes": True}


class PostDetail(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    html: str
    summary: str | None = None
    cover_image: str | None = None
    tags: list[TagResponse] = []
    author_name: str
    status: str
    published_at: datetime | None = None
    view_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPosts(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int


class PostCreate(BaseModel):
    title: str
    content: str
    tags: list[str] = []
    summary: str | None = None
    cover_image: str | None = None
    status: str = "draft"


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    summary: str | None = None
    cover_image: str | None = None
    status: str | None = None
