"""Add review fields to hypotheses table

Revision ID: 0005_hypothesis_review_fields
Revises: 0004_obs_hyp_framework
Create Date: 2026-04-29 00:00:00.000000

Adds source traceability and review lifecycle to AI-extracted hypotheses,
mirroring the pattern already on the observations table.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0005_hypothesis_review_fields"
down_revision: Union[str, None] = "0004_obs_hyp_framework"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "hypotheses",
        sa.Column(
            "source_id",
            UUID(as_uuid=True),
            sa.ForeignKey("sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "hypotheses",
        sa.Column("ai_extracted", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "hypotheses",
        sa.Column("reviewed_by", sa.String(200), nullable=True),
    )
    op.add_column(
        "hypotheses",
        sa.Column("reviewed_at", sa.Text(), nullable=True),
    )
    op.create_index("ix_hypotheses_source_id", "hypotheses", ["source_id"])
    op.create_index("ix_hypotheses_ai_extracted", "hypotheses", ["ai_extracted"])


def downgrade() -> None:
    op.drop_index("ix_hypotheses_ai_extracted", table_name="hypotheses")
    op.drop_index("ix_hypotheses_source_id", table_name="hypotheses")
    op.drop_column("hypotheses", "reviewed_at")
    op.drop_column("hypotheses", "reviewed_by")
    op.drop_column("hypotheses", "ai_extracted")
    op.drop_column("hypotheses", "source_id")
