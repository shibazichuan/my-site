import uuid
import os
from io import BytesIO
from fastapi import UploadFile, HTTPException, status
from PIL import Image
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

    async def save_compressed_image(
        self, file: UploadFile, quality: int = 80
    ) -> dict:
        """Compress and save an image, return metadata dict."""
        ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported image format. Use JPG, PNG, or WebP.",
            )
        content = await file.read()
        original_size = len(content)

        img = Image.open(BytesIO(content))
        filename = f"{uuid.uuid4().hex}.jpg"
        compressed_dir = os.path.join(self.base_dir, "compressed")
        os.makedirs(compressed_dir, exist_ok=True)
        filepath = os.path.join(compressed_dir, filename)

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(filepath, "JPEG", quality=quality, optimize=True)

        compressed_size = os.path.getsize(filepath)
        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compressed_path": f"/static/compressed/{filename}",
            "quality": quality,
        }
