"""Create initial admin user. Run: python -m app.seed"""
import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models.user import User
from app.services.auth_service import hash_password


async def seed():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        if result.scalar_one_or_none():
            print("Admin already exists")
            return
        admin = User(
            email="admin@example.com",
            username="admin",
            password_hash=hash_password("admin123"),
            is_admin=True,
        )
        db.add(admin)
        await db.commit()
        print("Admin created: admin@example.com / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
