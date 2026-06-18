from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, RefreshRequest
from app.services.auth_service import (
    register_user, authenticate_user, create_access_token,
    create_refresh_token, decode_token, get_user_by_id, user_to_response,
)
from app.middleware.auth import get_current_user
from app.models.user import User
from app.limiter import limiter

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, data)
    uid = str(user.id)
    return TokenResponse(
        access_token=create_access_token(uid),
        refresh_token=create_refresh_token(uid),
        user=user_to_response(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    uid = str(user.id)
    return TokenResponse(
        access_token=create_access_token(uid),
        refresh_token=create_refresh_token(uid),
        user=user_to_response(user),
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user_to_response(user)


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh(data: RefreshRequest):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    return {"access_token": create_access_token(user_id), "token_type": "bearer"}
