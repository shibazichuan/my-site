from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings

storage_uri = settings.rate_limit_redis_url or settings.redis_url

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri,
    default_limits=["200/minute"],
)
