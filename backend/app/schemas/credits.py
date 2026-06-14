from datetime import datetime
from pydantic import BaseModel

class PlanResponse(BaseModel):
    id: str
    name: str
    amount_cents: int
    credits: int

class CreateOrderRequest(BaseModel):
    plan_id: str

class OrderResponse(BaseModel):
    order_id: str
    amount_cents: int
    credits: int
    qrcode_url: str = ""

class BalanceResponse(BaseModel):
    balance: int

class TransactionItem(BaseModel):
    id: str
    amount: int
    type: str
    description: str
    created_at: datetime

class PaginatedTransactions(BaseModel):
    items: list[TransactionItem]
    total: int
    page: int
    page_size: int
