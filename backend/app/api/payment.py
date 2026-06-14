from fastapi import APIRouter, Request
from app.database import async_session
from app.services.payment_service import handle_payment_notify

router = APIRouter()

@router.post("/notify")
async def notify(request: Request):
    data = dict(await request.form())
    async with async_session() as db:
        try:
            await handle_payment_notify(db, data)
            return "success"
        except Exception:
            await db.rollback()
            return "fail"
        finally:
            await db.close()
