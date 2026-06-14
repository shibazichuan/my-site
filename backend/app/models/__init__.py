from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models so they register with Base.metadata
from app.models.user import User  # noqa: E402, F401
from app.models.post import Post  # noqa: E402, F401
from app.models.tag import Tag, post_tags  # noqa: E402, F401
from app.models.shortlink import ShortLink  # noqa: E402, F401
from app.models.image_record import ImageRecord  # noqa: E402, F401
from app.models.chat import Conversation, Message  # noqa: E402, F401
