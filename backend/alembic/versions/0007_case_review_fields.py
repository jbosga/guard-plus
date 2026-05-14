"""Add review fields to cases table (Phase E)

Revision ID: 0007_case_review_fields
Revises: 0006_v2_schema
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_case_review_fields"
down_revision = "0006_v2_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("reviewed", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("cases", sa.Column("reviewed_by", sa.String(200), nullable=True))
    op.add_column("cases", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "reviewed_at")
    op.drop_column("cases", "reviewed_by")
    op.drop_column("cases", "reviewed")
