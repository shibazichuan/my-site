from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from redis.asyncio import Redis
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
_redis: Redis | None = None


async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
