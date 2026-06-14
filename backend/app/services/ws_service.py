import json
from datetime import datetime, timezone
from redis.asyncio import Redis

ONLINE_SET = "online_users"
NOTIFICATION_CHANNEL = "notifications"


async def add_online_user(redis: Redis, user_id: str) -> None:
    await redis.sadd(ONLINE_SET, user_id)


async def remove_online_user(redis: Redis, user_id: str) -> None:
    await redis.srem(ONLINE_SET, user_id)


async def get_online_count(redis: Redis) -> int:
    return await redis.scard(ONLINE_SET)


async def broadcast_notification(redis: Redis, title: str, body: str) -> None:
    message = json.dumps({
        "type": "notification",
        "title": title,
        "body": body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await redis.publish(NOTIFICATION_CHANNEL, message)
