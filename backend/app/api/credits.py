import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.credits import PlanResponse, CreateOrderRequest, OrderResponse, BalanceResponse, TransactionItem, PaginatedTransactions
from app.services.credits_service import get_plans, get_balance, create_order, get_transactions

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/plans", response_model=list[PlanResponse])
async def plans():
    return get_plans()

@router.get("/balance", response_model=BalanceResponse)
async def balance(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return BalanceResponse(balance=await get_balance(db, user.id))

@router.post("/order", response_model=OrderResponse)
async def create(request: Request, data: CreateOrderRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.config import settings
    order = await create_order(db, user.id, data.plan_id)
    qrcode_url = ""
    if settings.payjs_mchid:
        from app.services.payment_service import create_payjs_order
        result = await create_payjs_order(order, str(request.base_url).rstrip("/") + "/api/payment/notify")
        qrcode_url = result["qrcode_url"]
        order.gateway_order_id = result["payjs_order_id"]
        await db.commit()
    return OrderResponse(order_id=str(order.id), amount_cents=order.amount_cents, credits=order.credits, qrcode_url=qrcode_url)

@router.get("/transactions", response_model=PaginatedTransactions)
async def transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_transactions(db, user.id, page, page_size)
    return PaginatedTransactions(
        items=[TransactionItem(id=str(i.id), amount=i.amount, type=i.type, description=i.description, created_at=i.created_at) for i in items],
        total=total, page=page, page_size=page_size,
    )
