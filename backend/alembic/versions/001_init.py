"""initial

Revision ID: 001
Revises:
Create Date: 2026-06-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_username", "users", ["username"])

    op.create_table("tags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("slug", sa.String(50), unique=True, nullable=False),
    )

    op.create_table("posts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("author_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(250), unique=True, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("summary", sa.String(500), nullable=True),
        sa.Column("cover_image", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'")),
        sa.Column("view_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_posts_slug", "posts", ["slug"])
    op.create_index("idx_posts_status_pub", "posts", ["status", "published_at"])
    op.create_index("idx_posts_author", "posts", ["author_id"])

    op.create_table("post_tags",
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("posts.id"), primary_key=True),
        sa.Column("tag_id", UUID(as_uuid=True), sa.ForeignKey("tags.id"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("post_tags")
    op.drop_table("posts")
    op.drop_table("tags")
    op.drop_table("users")
