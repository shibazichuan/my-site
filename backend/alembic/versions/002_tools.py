"""add shortlinks and image_records

Revision ID: 002
Revises: 001
Create Date: 2026-06-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("shortlinks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("short_code", sa.String(20), unique=True, nullable=False),
        sa.Column("original_url", sa.Text(), nullable=False),
        sa.Column("click_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_shortlinks_code", "shortlinks", ["short_code"])
    op.create_index("idx_shortlinks_user", "shortlinks", ["user_id"])

    op.create_table("image_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("original_size", sa.Integer(), nullable=False),
        sa.Column("compressed_size", sa.Integer(), nullable=False),
        sa.Column("compressed_path", sa.String(500), nullable=False),
        sa.Column("quality", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_image_records_user", "image_records", ["user_id"])


def downgrade() -> None:
    op.drop_table("image_records")
    op.drop_table("shortlinks")
