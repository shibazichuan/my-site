import uuid
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.tools import (
    ShortLinkCreate, ShortLinkResponse, PaginatedShortLinks,
    ImageRecordResponse, PaginatedImages,
)
from app.services.shortlink_service import (
    create_shortlink, get_user_shortlinks, delete_shortlink, shortlink_to_response,
)
from app.services.image_service import compress_and_save, get_user_images, image_record_to_response

router = APIRouter(dependencies=[Depends(get_current_user)])


# ---- Short Links ----
@router.post("/shortlinks", response_model=ShortLinkResponse, status_code=201)
async def create_link(
    data: ShortLinkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    link = await create_shortlink(db, user.id, data.original_url)
    return shortlink_to_response(link)


@router.get("/shortlinks", response_model=PaginatedShortLinks)
async def list_links(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_shortlinks(db, user.id, page=page, page_size=page_size)
    return PaginatedShortLinks(
        items=[shortlink_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/shortlinks/{link_id}", status_code=204)
async def delete_link(
    link_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_shortlink(db, link_id, user.id)


# ---- Images ----
@router.post("/images/upload", response_model=ImageRecordResponse, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    quality: int = Form(80),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await compress_and_save(db, user.id, file, quality)
    return image_record_to_response(record)


@router.get("/images", response_model=PaginatedImages)
async def list_images(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_images(db, user.id, page=page, page_size=page_size)
    return PaginatedImages(
        items=[image_record_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )
