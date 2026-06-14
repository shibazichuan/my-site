import uuid
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_redis
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    SendMessageRequest,
    PaginatedConversations,
    ConversationDetail,
    QuotaResponse,
)
from app.services.chat_service import (
    stream_deepseek,
    get_user_conversations,
    get_conversation_detail,
    delete_conversation,
    get_quota,
    conversation_to_list_item,
    conversation_to_detail,
)

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/send")
async def send_message(
    data: SendMessageRequest,
    user: User = Depends(get_current_user),
):
    redis = await get_redis()
    return StreamingResponse(
        stream_deepseek(
            redis=redis,
            user_id=user.id,
            conversation_id=data.conversation_id,
            message=data.message,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=PaginatedConversations)
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_conversations(db, user.id, page=page, page_size=page_size)
    return PaginatedConversations(
        items=[conversation_to_list_item(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
async def get_conversation(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await get_conversation_detail(db, conv_id, user.id)
    return conversation_to_detail(conv)


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation_route(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_conversation(db, conv_id, user.id)


@router.get("/quota", response_model=QuotaResponse)
async def quota(
    user: User = Depends(get_current_user),
):
    redis = await get_redis()
    return await get_quota(redis, user.id)
