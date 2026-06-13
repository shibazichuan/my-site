from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_redis
from app.services.post_service import (
    get_posts, get_post_by_slug, increment_view_count,
    post_to_list_item, post_to_detail,
)
from app.schemas.post import PaginatedPosts, PostDetail

router = APIRouter()


@router.get("", response_model=PaginatedPosts)
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    tag: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    posts, total = await get_posts(db, page=page, page_size=page_size, tag=tag, search=search)
    return PaginatedPosts(
        items=[post_to_list_item(p) for p in posts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{slug}", response_model=PostDetail)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    post = await get_post_by_slug(db, slug)
    return post_to_detail(post)


@router.post("/{slug}/view", status_code=204)
async def view_post(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    redis_client = await get_redis()
    client_ip = request.client.host if request.client else "unknown"
    await increment_view_count(redis_client, slug, client_ip)
