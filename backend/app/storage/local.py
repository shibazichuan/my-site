import uuid
import os
from fastapi import UploadFile, HTTPException, status
from app.config import settings


class LocalStorage:
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or settings.upload_dir
        os.makedirs(self.base_dir, exist_ok=True)

    async def save(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or "")[1] or ".bin"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.base_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        return f"/static/{filename}"
