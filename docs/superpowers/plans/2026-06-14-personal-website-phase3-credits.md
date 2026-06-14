# 积分付费系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 积分充值/消费框架 + PayJS 支付网关集成

**Architecture:** FastAPI + SQLAlchemy 积分管理 + PayJS REST API 对接 + Webhook 回调验签 + React 充值页面

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, httpx, React 18, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-06-14-personal-website-phase3-credits-design.md`

---

## File Structure

```
New files (backend):
backend/app/
├── models/credits.py
├── schemas/credits.py
├── services/credits_service.py
├── services/payment_service.py
├── api/credits.py
├── api/payment.py
├── alembic/versions/004_credits.py

New files (frontend):
frontend/src/
├── pages/CreditsPage.tsx

Modified:
backend/app/config.py, models/__init__.py, main.py
.env.example
frontend/src/App.tsx, components/Navbar.tsx, types/index.ts
```

---

### Task 1: Config + Models + Migration

**Files:** Modify `config.py`, `.env.example` | Create `models/credits.py`, `alembic/versions/004_credits.py` | Modify `models/__init__.py`

- [ ] **Step 1: Add config**

```python
# config.py — add:
payjs_mchid: str = ""
payjs_key: str = ""
credits_per_yuan: int = 10
```

```env
# .env.example — add:
PAYJS_MCHID=your_mchid
PAYJS_KEY=your_key
CREDITS_PER_YUAN=10
```

- [ ] **Step 2: Create models/credits.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base


class UserCredits(Base):
    __tablename__ = "user_credits"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    balance: Mapped[int] = mapped_column(Integer, default=0)
    user: Mapped["User"] = relationship("User")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentOrder(Base):
    __tablename__ = "payment_orders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    gateway: Mapped[str] = mapped_column(String(20), default="payjs")
    gateway_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Create migration 004_credits.py**

```python
"""credits

Revision ID: 004
Revises: 003
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "004"
down_revision = "003"

def upgrade():
    op.create_table("user_credits",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("balance", sa.Integer(), server_default=sa.text("0")),
    )
    op.create_table("credit_transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("payment_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_ct_user", "credit_transactions", ["user_id", "created_at"])
    op.create_table("payment_orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'")),
        sa.Column("gateway", sa.String(20), server_default=sa.text("'payjs'")),
        sa.Column("gateway_order_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("payment_orders")
    op.drop_table("credit_transactions")
    op.drop_table("user_credits")
```

- [ ] **Step 4: Update models/__init__.py** — add import:
```python
from app.models.credits import UserCredits, CreditTransaction, PaymentOrder  # noqa: E402, F401
```

- [ ] **Step 5: Commit**

---

### Task 2: Schemas + Services

**Files:** Create `schemas/credits.py`, `services/credits_service.py`, `services/payment_service.py`

- [ ] **Step 1: Create schemas/credits.py**

```python
from datetime import datetime
from pydantic import BaseModel

class PlanResponse(BaseModel):
    id: str; name: str; amount_cents: int; credits: int

class CreateOrderRequest(BaseModel):
    plan_id: str

class OrderResponse(BaseModel):
    order_id: str; amount_cents: int; credits: int; qrcode_url: str = ""

class BalanceResponse(BaseModel):
    balance: int

class TransactionItem(BaseModel):
    id: str; amount: int; type: str; description: str; created_at: datetime

class PaginatedTransactions(BaseModel):
    items: list[TransactionItem]; total: int; page: int; page_size: int
```

- [ ] **Step 2: Create services/credits_service.py**

```python
import uuid, hashlib, time
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
import httpx
from app.config import settings
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
```

- [ ] **Step 3: Create services/payment_service.py**

```python
import hashlib, uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.config import settings
from app.models.credits import PaymentOrder, CreditTransaction
from app.services.credits_service import ensure_credits_row

PAYJS_API = "https://payjs.cn/api"

async def create_payjs_order(order: PaymentOrder, notify_url: str) -> dict:
    """Call PayJS unified order API, return {qrcode_url, payjs_order_id}"""
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
```

- [ ] **Step 4: Commit**

---

### Task 3: API Routes + Register

**Files:** Create `api/credits.py`, `api/payment.py` | Modify `main.py`

- [ ] **Step 1: Create api/credits.py**

```python
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.credits import *
from app.services.credits_service import *

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/plans", response_model=list[PlanResponse])
async def plans(): return get_plans()

@router.get("/balance", response_model=BalanceResponse)
async def balance(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return BalanceResponse(balance=await get_balance(db, user.id))

@router.post("/order", response_model=OrderResponse)
async def create(request: Request, data: CreateOrderRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = await create_order(db, user.id, data.plan_id)
    # If PayJS is configured, create actual order
    qrcode_url = ""
    if settings.payjs_mchid:
        from app.services.payment_service import create_payjs_order
        result = await create_payjs_order(order, str(request.base_url).rstrip("/") + "/api/payment/notify")
        qrcode_url = result["qrcode_url"]
        order.gateway_order_id = result["payjs_order_id"]
        await db.commit()
    return OrderResponse(order_id=str(order.id), amount_cents=order.amount_cents, credits=order.credits, qrcode_url=qrcode_url)

@router.get("/transactions", response_model=PaginatedTransactions)
async def transactions(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items, total = await get_transactions(db, user.id, page, page_size)
    return PaginatedTransactions(items=[TransactionItem(id=str(i.id), amount=i.amount, type=i.type, description=i.description, created_at=i.created_at) for i in items], total=total, page=page, page_size=page_size)
```

- [ ] **Step 2: Create api/payment.py**

```python
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
```

- [ ] **Step 3: Register in main.py** — add:
```python
from app.api import credits, payment
app.include_router(credits.router, prefix="/api/credits", tags=["credits"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
```

- [ ] **Step 4: Commit**

---

### Task 4: Frontend — CreditsPage + Integration

**Files:** Create `pages/CreditsPage.tsx` | Modify `types/index.ts`, `App.tsx`, `Navbar.tsx`

- [ ] **Step 1: Add types**

```typescript
// types/index.ts — add:
export interface PlanItem { id: string; name: string; amount_cents: number; credits: number; }
export interface CreditTransactionItem { id: string; amount: number; type: string; description: string; created_at: string; }
```

- [ ] **Step 2: Create CreditsPage.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import type { PlanItem, CreditTransactionItem } from '../types';

export default function CreditsPage() {
  const [balance, setBalance] = useState(0);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [transactions, setTransactions] = useState<CreditTransactionItem[]>([]);
  const [qrcode, setQrcode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/credits/balance').then(r => setBalance(r.data.balance)).catch(() => {});
    client.get('/credits/plans').then(r => setPlans(r.data)).catch(() => {});
    client.get('/credits/transactions?page_size=10').then(r => setTransactions(r.data.items)).catch(() => {});
  }, []);

  async function handleBuy(planId: string) {
    setLoading(true);
    try {
      const { data } = await client.post('/credits/order', { plan_id: planId });
      if (data.qrcode_url) setQrcode(data.qrcode_url);
    } catch { alert('创建订单失败'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">💰 积分中心</h1>
      <p className="text-gray-500 mb-8">当前积分: <span className="text-2xl font-bold text-indigo-600">{balance}</span></p>

      {/* Plans */}
      <h2 className="text-lg font-semibold mb-4">充值套餐</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-xl font-bold text-gray-900 mb-1">{plan.name}</div>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{plan.credits}</div>
            <div className="text-sm text-gray-500 mb-4">积分</div>
            <div className="text-lg font-semibold text-gray-700 mb-4">¥{(plan.amount_cents / 100).toFixed(0)}</div>
            <button onClick={() => handleBuy(plan.id)} disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? '处理中...' : '立即充值'}
            </button>
          </div>
        ))}
      </div>

      {/* QR Code */}
      {qrcode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrcode('')}>
          <div className="bg-white rounded-xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">扫码支付</h3>
            <img src={qrcode} alt="支付二维码" className="w-48 h-48 mx-auto mb-3" />
            <p className="text-sm text-gray-500">支付成功后积分自动到账</p>
            <button onClick={() => { setQrcode(''); window.location.reload(); }} className="mt-3 text-indigo-600 text-sm hover:underline">已完成支付</button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <h2 className="text-lg font-semibold mb-4">积分流水</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr><th className="px-4 py-3 text-left text-gray-600">说明</th><th className="px-4 py-3 text-right text-gray-600">金额</th><th className="px-4 py-3 text-right text-gray-600">时间</th></tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-gray-700">{t.description}</td>
                <td className={`px-4 py-3 text-right font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">暂无流水</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into App + Navbar** — add `/credits` route (AuthGuard), add "💰 积分" to Navbar

- [ ] **Step 4: Commit**

---

### Task 5: Build & Verify

- [ ] **Step 1:** `npx tsc --noEmit` — no errors
- [ ] **Step 2:** `docker compose up -d --build backend frontend nginx`
- [ ] **Step 3:** `docker exec my-site-backend-1 alembic upgrade head`
- [ ] **Step 4:** Verify `curl http://localhost/api/credits/plans` returns 3 plans
- [ ] **Step 5:** Commit
