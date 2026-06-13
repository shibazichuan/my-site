import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.models.image_record import ImageRecord
from app.storage.local import LocalStorage


async def compress_and_save(
    db: AsyncSession, user_id: uuid.UUID, file: UploadFile, quality: int = 80
) -> ImageRecord:
    storage = LocalStorage()
    meta = await storage.save_compressed_image(file, quality)

    record = ImageRecord(
        user_id=user_id,
        original_name=file.filename or "unknown",
        original_size=meta["original_size"],
        compressed_size=meta["compressed_size"],
        compressed_path=meta["compressed_path"],
        quality=meta["quality"],
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_user_images(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> tuple[list[ImageRecord], int]:
    query = select(ImageRecord).where(ImageRecord.user_id == user_id).order_by(ImageRecord.created_at.desc())
    count_query = select(func.count(ImageRecord.id)).where(ImageRecord.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total


def image_record_to_response(record: ImageRecord) -> dict:
    return {
        "id": str(record.id),
        "original_name": record.original_name,
        "original_size": record.original_size,
        "compressed_size": record.compressed_size,
        "url": record.compressed_path,
        "quality": record.quality,
        "created_at": record.created_at,
    }
