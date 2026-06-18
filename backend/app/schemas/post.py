from datetime import datetime
from pydantic import BaseModel, Field


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
    title: str = Field(max_length=200)
    content: str = Field(max_length=100000)
    tags: list[str] = Field(default=[], max_items=20)
    summary: str | None = Field(default=None, max_length=500)
    cover_image: str | None = Field(default=None, max_length=2048)
    status: str = Field(default="draft", max_length=20)


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = Field(default=None, max_length=100000)
    tags: list[str] | None = Field(default=None, max_items=20)
    summary: str | None = Field(default=None, max_length=500)
    cover_image: str | None = Field(default=None, max_length=2048)
    status: str | None = Field(default=None, max_length=20)
