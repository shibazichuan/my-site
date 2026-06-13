import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.post import PostCreate, PostUpdate, PostDetail
from app.services.post_service import create_post, update_post, delete_post, get_post_by_id, post_to_detail
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.storage.local import LocalStorage

router = APIRouter(dependencies=[Depends(require_admin)])


@router.post("/posts", response_model=PostDetail, status_code=201)
async def create(data: PostCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await create_post(db, data, user.id)
    return post_to_detail(post)


@router.put("/posts/{post_id}", response_model=PostDetail)
async def update(post_id: uuid.UUID, data: PostUpdate, db: AsyncSession = Depends(get_db)):
    post = await update_post(db, post_id, data)
    return post_to_detail(post)


@router.delete("/posts/{post_id}", status_code=204)
async def delete(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await delete_post(db, post_id)


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    storage = LocalStorage()
    url = await storage.save(file)
    return {"url": url}
