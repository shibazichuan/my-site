import uuid
import os
from io import BytesIO
from fastapi import UploadFile, HTTPException, status
from PIL import Image
from app.config import settings

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".pdf", ".txt", ".md"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class LocalStorage:
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or settings.upload_dir
        os.makedirs(self.base_dir, exist_ok=True)

    async def save(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{ext}' not allowed.",
            )

        # Read in chunks to avoid memory exhaustion on large files
        chunks = []
        total_size = 0
        while True:
            chunk = await file.read(8192)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB.",
                )
            chunks.append(chunk)

        content = b"".join(chunks)
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.base_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        return f"/static/{filename}"

    async def save_compressed_image(
        self, file: UploadFile, quality: int = 80
    ) -> dict:
        """Compress and save an image, return metadata dict."""
        ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported image format. Use JPG, PNG, or WebP.",
            )

        # Read in chunks to avoid memory exhaustion on large files
        chunks = []
        total_size = 0
        while True:
            chunk = await file.read(8192)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB.",
                )
            chunks.append(chunk)

        content = b"".join(chunks)
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
