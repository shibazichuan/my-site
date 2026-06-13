from datetime import datetime
from pydantic import BaseModel


# ---- ShortLink ----
class ShortLinkCreate(BaseModel):
    original_url: str


class ShortLinkResponse(BaseModel):
    id: str
    short_code: str
    short_url: str
    original_url: str
    click_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedShortLinks(BaseModel):
    items: list[ShortLinkResponse]
    total: int
    page: int
    page_size: int


# ---- Image ----
class ImageRecordResponse(BaseModel):
    id: str
    original_name: str
    original_size: int
    compressed_size: int
    url: str
    quality: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedImages(BaseModel):
    items: list[ImageRecordResponse]
    total: int
    page: int
    page_size: int
