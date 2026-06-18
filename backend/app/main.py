from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.config import settings
from app.database import get_redis, async_session
from app.api import auth, posts, admin, tools, chat, ws, credits, payment
from app.services.shortlink_service import get_shortlink_by_code
from app.tasks.sitemap import generate_sitemap
from app.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
    # Generate initial sitemap on startup
    try:
        await generate_sitemap({})
    except Exception:
        pass
    yield


app = FastAPI(title="My Site", lifespan=lifespan)

# Rate limiting (must be first middleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(tools.router, prefix="/api/tools", tags=["tools"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(credits.router, prefix="/api/credits", tags=["credits"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(ws.router)


@app.get("/r/{short_code}")
async def redirect_shortlink(short_code: str):
    async with async_session() as db:
        try:
            link = await get_shortlink_by_code(db, short_code)
            return RedirectResponse(url=link.original_url, status_code=302)
        finally:
            await db.close()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
