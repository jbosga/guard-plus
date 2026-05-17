"""Add created_by to sources, cases, observations, hypotheses, theoretical_frameworks

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_add_created_by"
down_revision = "0008_observation_expanded_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("sources", "cases", "observations", "hypotheses", "theoretical_frameworks"):
        op.add_column(table, sa.Column("created_by", sa.String(200), nullable=True))


def downgrade() -> None:
    for table in ("sources", "cases", "observations", "hypotheses", "theoretical_frameworks"):
        op.drop_column(table, "created_by")
