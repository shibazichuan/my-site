import hashlib
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.config import settings
from app.models.credits import PaymentOrder, CreditTransaction
from app.services.credits_service import ensure_credits_row

PAYJS_API = "https://payjs.cn/api"

async def create_payjs_order(order: PaymentOrder, notify_url: str) -> dict:
    body = {
        "mchid": settings.payjs_mchid,
        "total_fee": order.amount_cents,
        "out_trade_no": str(order.id),
        "body": f"充值 {order.credits} 积分",
        "notify_url": notify_url,
    }
    sign = _payjs_sign(body)
    body["sign"] = sign
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{PAYJS_API}/native", json=body)
        data = resp.json()
    if data.get("return_code") != 1:
        raise Exception(f"PayJS error: {data.get('return_msg')}")
    return {"qrcode_url": data.get("code_url", ""), "payjs_order_id": data.get("payjs_order_id", "")}

def _payjs_sign(data: dict) -> str:
    parts = sorted(f"{k}={v}" for k, v in data.items() if v and k != "sign")
    raw = "&".join(parts) + f"&key={settings.payjs_key}"
    return hashlib.md5(raw.encode()).hexdigest().upper()

def verify_payjs_sign(data: dict) -> bool:
    sign = data.pop("sign", "")
    return _payjs_sign(data) == sign

async def handle_payment_notify(db: AsyncSession, data: dict) -> None:
    if not verify_payjs_sign(data.copy()):
        raise Exception("Invalid signature")
    if data.get("return_code") != "1":
        return
    order_id = data.get("out_trade_no")
    result = await db.execute(select(PaymentOrder).where(PaymentOrder.id == uuid.UUID(order_id)))
    order = result.scalar_one_or_none()
    if not order or order.status != "pending":
        return
    order.status = "paid"
    order.gateway_order_id = data.get("payjs_order_id", "")
    uc = await ensure_credits_row(db, order.user_id)
    uc.balance += order.credits
    txn = CreditTransaction(user_id=order.user_id, amount=order.credits, type="purchase", description=f"充值 {order.credits} 积分", payment_id=str(order.id))
    db.add(txn)
    await db.commit()
