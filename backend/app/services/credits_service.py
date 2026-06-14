import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.credits import UserCredits, CreditTransaction, PaymentOrder

PLANS = [
    {"id": "basic", "name": "入门包", "amount_cents": 1000, "credits": 100},
    {"id": "standard", "name": "标准包", "amount_cents": 5000, "credits": 500},
    {"id": "pro", "name": "进阶包", "amount_cents": 10000, "credits": 1000},
]

def get_plans():
    return [{"id": p["id"], "name": p["name"], "amount_cents": p["amount_cents"], "credits": p["credits"]} for p in PLANS]

async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(select(UserCredits).where(UserCredits.user_id == user_id))
    uc = result.scalar_one_or_none()
    return uc.balance if uc else 0

async def ensure_credits_row(db: AsyncSession, user_id: uuid.UUID) -> UserCredits:
    result = await db.execute(select(UserCredits).where(UserCredits.user_id == user_id))
    uc = result.scalar_one_or_none()
    if not uc:
        uc = UserCredits(user_id=user_id, balance=0)
        db.add(uc)
        await db.flush()
    return uc

async def consume_credits(db: AsyncSession, user_id: uuid.UUID, amount: int, description: str) -> bool:
    uc = await ensure_credits_row(db, user_id)
    if uc.balance < amount:
        return False
    uc.balance -= amount
    txn = CreditTransaction(user_id=user_id, amount=-amount, type="consume", description=description)
    db.add(txn)
    await db.commit()
    return True

async def create_order(db: AsyncSession, user_id: uuid.UUID, plan_id: str) -> PaymentOrder:
    plan = next((p for p in PLANS if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    order = PaymentOrder(user_id=user_id, amount_cents=plan["amount_cents"], credits=plan["credits"])
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order

async def get_transactions(db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20):
    query = select(CreditTransaction).where(CreditTransaction.user_id == user_id).order_by(CreditTransaction.created_at.desc())
    count_q = select(func.count(CreditTransaction.id)).where(CreditTransaction.user_id == user_id)
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    return list(result.scalars().all()), total
