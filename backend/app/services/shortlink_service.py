import secrets
import string
import uuid
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.shortlink import ShortLink

_CODE_CHARS = string.ascii_letters + string.digits


def _generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(_CODE_CHARS) for _ in range(length))


async def create_shortlink(db: AsyncSession, user_id: uuid.UUID, original_url: str) -> ShortLink:
    code = _generate_code()
    for _ in range(5):
        existing = await db.execute(select(ShortLink).where(ShortLink.short_code == code))
        if not existing.scalar_one_or_none():
            break
        code = _generate_code()

    link = ShortLink(user_id=user_id, short_code=code, original_url=original_url)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


async def get_user_shortlinks(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> tuple[list[ShortLink], int]:
    query = select(ShortLink).where(ShortLink.user_id == user_id).order_by(ShortLink.created_at.desc())
    count_query = select(func.count(ShortLink.id)).where(ShortLink.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total


async def delete_shortlink(db: AsyncSession, link_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(ShortLink).where(and_(ShortLink.id == link_id, ShortLink.user_id == user_id))
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found")
    await db.delete(link)
    await db.commit()


async def get_shortlink_by_code(db: AsyncSession, code: str) -> ShortLink:
    result = await db.execute(select(ShortLink).where(ShortLink.short_code == code))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found")
    link.click_count += 1
    await db.commit()
    return link


def shortlink_to_response(link: ShortLink, base_url: str = "") -> dict:
    return {
        "id": str(link.id),
        "short_code": link.short_code,
        "short_url": f"{base_url}/r/{link.short_code}",
        "original_url": link.original_url,
        "click_count": link.click_count,
        "created_at": link.created_at,
    }
