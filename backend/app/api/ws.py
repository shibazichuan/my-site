import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.database import get_redis
from app.services.auth_service import decode_token
from app.services.ws_service import (
    add_online_user, remove_online_user, get_online_count,
    NOTIFICATION_CHANNEL,
)

router = APIRouter()
_connections: dict[str, WebSocket] = {}


async def _broadcast_online_count(redis, ws: WebSocket | None = None):
    count = await get_online_count(redis)
    msg = json.dumps({"type": "online_count", "count": count})
    for ws_conn in list(_connections.values()):
        try:
            await ws_conn.send_text(msg)
        except Exception:
            pass


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = ""):
    # Auth
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await ws.close(code=4001, reason="Invalid token type")
            return
        user_id = payload.get("sub")
        if not user_id:
            await ws.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await ws.close(code=4001, reason="Authentication failed")
        return

    await ws.accept()
    redis = await get_redis()

    await add_online_user(redis, user_id)
    _connections[user_id] = ws
    await _broadcast_online_count(redis)

    pubsub = redis.pubsub()
    await pubsub.subscribe(NOTIFICATION_CHANNEL)

    async def listen_pubsub():
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await ws.send_text(message["data"])
                except Exception:
                    break

    pubsub_task = asyncio.create_task(listen_pubsub())

    try:
        while True:
            data = await asyncio.wait_for(ws.receive_text(), timeout=60.0)
            if data == '{"type":"ping"}':
                await ws.send_json({"type": "pong"})
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        pubsub_task.cancel()
        try:
            await pubsub_task
        except asyncio.CancelledError:
            pass
        await pubsub.unsubscribe(NOTIFICATION_CHANNEL)
        _connections.pop(user_id, None)
        await remove_online_user(redis, user_id)
        await _broadcast_online_count(redis)
