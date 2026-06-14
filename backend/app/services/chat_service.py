import json
import uuid
from datetime import date
from typing import AsyncGenerator

import httpx
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from redis.asyncio import Redis

from app.config import settings
from app.models.chat import Conversation, Message
from app.database import async_session


async def _get_quota_key(user_id: uuid.UUID) -> str:
    return f"chat_quota:{user_id}:{date.today().isoformat()}"


async def check_quota(redis: Redis, user_id: uuid.UUID) -> bool:
    key = await _get_quota_key(user_id)
    used = int(await redis.get(key) or 0)
    return used < settings.daily_chat_quota


async def get_quota(redis: Redis, user_id: uuid.UUID) -> dict:
    key = await _get_quota_key(user_id)
    used = int(await redis.get(key) or 0)
    return {"used": used, "limit": settings.daily_chat_quota, "remaining": max(0, settings.daily_chat_quota - used)}


async def _incr_quota(redis: Redis, user_id: uuid.UUID) -> None:
    key = await _get_quota_key(user_id)
    await redis.incr(key)
    await redis.expire(key, 86400)


async def stream_deepseek(
    redis: Redis,
    user_id: uuid.UUID,
    conversation_id: str | None,
    message: str,
) -> AsyncGenerator[str, None]:
    # Quota check
    if not await check_quota(redis, user_id):
        yield f'data: {{"type":"error","detail":"日配额已用完，明天再来吧"}}\n\n'
        return

    # Build messages array
    chat_messages = [{"role": "system", "content": "你是一个有帮助的AI助手。"}]

    async with async_session() as db:
        try:
            if conversation_id:
                result = await db.execute(
                    select(Conversation)
                    .where(and_(Conversation.id == uuid.UUID(conversation_id), Conversation.user_id == user_id))
                )
                conv = result.scalar_one_or_none()
                if not conv:
                    yield f'data: {{"type":"error","detail":"对话不存在"}}\n\n'
                    return
                msgs = await db.execute(
                    select(Message)
                    .where(Message.conversation_id == uuid.UUID(conversation_id))
                    .order_by(Message.created_at)
                )
                for m in msgs.scalars().all():
                    chat_messages.append({"role": m.role, "content": m.content})

            chat_messages.append({"role": "user", "content": message})

            # Call DeepSeek API with streaming
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.deepseek_api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.deepseek_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": chat_messages,
                        "stream": True,
                    },
                ) as response:
                    if response.status_code != 200:
                        text = await response.aread()
                        yield f'data: {{"type":"error","detail":"AI 服务暂时不可用"}}\n\n'
                        return

                    full_content = ""
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_content += content
                                    escaped = json.dumps({"type": "token", "content": content})
                                    yield f"data: {escaped}\n\n"
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

            # Persist messages
            if not conversation_id:
                title = message[:30].replace("\n", " ")
                conv = Conversation(user_id=user_id, title=title)
                db.add(conv)
                await db.flush()
                conversation_id = str(conv.id)
            else:
                conv = await db.get(Conversation, uuid.UUID(conversation_id))

            user_msg = Message(conversation_id=uuid.UUID(conversation_id), role="user", content=message)
            assistant_msg = Message(conversation_id=uuid.UUID(conversation_id), role="assistant", content=full_content)
            db.add_all([user_msg, assistant_msg])

            # Increment quota on success
            await _incr_quota(redis, user_id)

            await db.commit()

            conv_title = conv.title if conv else "新对话"
            yield f'data: {{"type":"done","conversation_id":"{conversation_id}","title":{json.dumps(conv_title)}}}\n\n'

        except httpx.ReadTimeout:
            await db.rollback()
            yield f'data: {{"type":"error","detail":"AI 响应超时，请重试"}}\n\n'
        except Exception:
            await db.rollback()
            yield f'data: {{"type":"error","detail":"服务器内部错误"}}\n\n'


async def get_user_conversations(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> tuple[list[Conversation], int]:
    query = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    count_query = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total


async def get_conversation_detail(db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .where(and_(Conversation.id == conversation_id, Conversation.user_id == user_id))
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


async def delete_conversation(db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Conversation).where(and_(Conversation.id == conversation_id, Conversation.user_id == user_id))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()


def conversation_to_list_item(conv: Conversation) -> dict:
    return {
        "id": str(conv.id),
        "title": conv.title,
        "updated_at": conv.updated_at,
    }


def conversation_to_detail(conv: Conversation) -> dict:
    return {
        "id": str(conv.id),
        "title": conv.title,
        "messages": [
            {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at}
            for m in conv.messages
        ],
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
    }
