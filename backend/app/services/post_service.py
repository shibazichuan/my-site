import uuid
import re
from datetime import datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.post import Post
from app.models.tag import Tag
from app.services.markdown_service import render_markdown
from app.schemas.post import PostCreate, PostUpdate
from app.database import async_session


def slugify(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug[:250]


async def get_or_create_tags(db: AsyncSession, tag_names: list[str]) -> list[Tag]:
    tags = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        result = await db.execute(select(Tag).where(Tag.name == name))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=name, slug=slugify(name))
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


async def create_post(db: AsyncSession, data: PostCreate, author_id: uuid.UUID) -> Post:
    slug = slugify(data.title)
    existing = await db.execute(select(Post).where(Post.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    html = render_markdown(data.content)
    tags = await get_or_create_tags(db, data.tags)

    post = Post(
        author_id=author_id,
        title=data.title,
        slug=slug,
        content=data.content,
        html=html,
        summary=data.summary,
        cover_image=data.cover_image,
        status=data.status,
        published_at=datetime.now(timezone.utc) if data.status == "published" else None,
    )
    post.tags = tags
    db.add(post)
    await db.commit()
    await db.refresh(post, attribute_names=["title", "slug", "content", "html", "summary", "cover_image", "status", "published_at", "view_count", "created_at", "updated_at"])
    # tags and author are already loaded from assignment, re-load via selectinload
    result = await db.execute(
        select(Post).where(Post.id == post.id).options(selectinload(Post.tags), selectinload(Post.author))
    )
    return result.scalar_one()


async def update_post(db: AsyncSession, post_id: uuid.UUID, data: PostUpdate) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id).options(selectinload(Post.tags)))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if data.title is not None:
        post.title = data.title
        post.slug = slugify(data.title)
    if data.content is not None:
        post.content = data.content
        post.html = render_markdown(data.content)
    if data.summary is not None:
        post.summary = data.summary
    if data.cover_image is not None:
        post.cover_image = data.cover_image
    if data.status is not None:
        post.status = data.status
        if data.status == "published" and post.published_at is None:
            post.published_at = datetime.now(timezone.utc)
    if data.tags is not None:
        post.tags = await get_or_create_tags(db, data.tags)

    await db.commit()
    # Re-fetch with relationships loaded to avoid lazy-load issues
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.tags), selectinload(Post.author))
    )
    return result.scalar_one()


async def delete_post(db: AsyncSession, post_id: uuid.UUID) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.delete(post)
    await db.commit()


async def get_posts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 12,
    tag: str | None = None,
    search: str | None = None,
) -> tuple[list[Post], int]:
    query = select(Post).options(selectinload(Post.tags), selectinload(Post.author))
    count_query = select(func.count(Post.id))

    conditions = [Post.status == "published"]
    if tag:
        conditions.append(Post.tags.any(Tag.slug == tag))
    if search:
        conditions.append(Post.title.ilike(f"%{search}%") | Post.content.ilike(f"%{search}%"))

    where = and_(*conditions)
    query = query.where(where).order_by(Post.published_at.desc())
    count_query = count_query.where(where)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    posts = list(result.scalars().all())

    return posts, total


async def get_post_by_slug(db: AsyncSession, slug: str) -> Post:
    result = await db.execute(
        select(Post)
        .where(Post.slug == slug, Post.status == "published")
        .options(selectinload(Post.tags), selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def get_post_by_id(db: AsyncSession, post_id: uuid.UUID) -> Post:
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.tags), selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def increment_view_count(redis_client, slug: str, client_ip: str) -> None:
    key = f"view:{slug}:{client_ip}"
    already = await redis_client.get(key)
    if not already:
        async with async_session() as session:
            result = await session.execute(select(Post).where(Post.slug == slug))
            post = result.scalar_one_or_none()
            if post:
                post.view_count += 1
                await session.commit()
        await redis_client.setex(key, 86400, "1")  # 24h


def post_to_list_item(post: Post) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "slug": post.slug,
        "summary": post.summary,
        "cover_image": post.cover_image,
        "tags": [{"name": t.name, "slug": t.slug, "post_count": 0} for t in post.tags],
        "author_name": post.author.username,
        "published_at": post.published_at,
        "view_count": post.view_count,
    }


def post_to_detail(post: Post) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "html": post.html,
        "summary": post.summary,
        "cover_image": post.cover_image,
        "tags": [{"name": t.name, "slug": t.slug, "post_count": 0} for t in post.tags],
        "author_name": post.author.username,
        "status": post.status,
        "published_at": post.published_at,
        "view_count": post.view_count,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
    }
