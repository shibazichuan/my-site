from datetime import datetime
from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    conversation_id: str | None = None
    message: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: str
    title: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedConversations(BaseModel):
    items: list[ConversationListItem]
    total: int
    page: int
    page_size: int


class QuotaResponse(BaseModel):
    used: int
    limit: int
    remaining: int
