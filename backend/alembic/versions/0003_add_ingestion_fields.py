"""Add ingestion status and method fields

Revision ID: 0003_add_ingestion_fields
Revises: 0002_add_users_table
Create Date: 2024-01-01 00:00:02.000000

Adds:
  sources.ingestion_status  — tracks pipeline state (pending/processing/complete/failed)
  sources.ingestion_error   — stores error message on failure
  claims.ingestion_method   — records how a claim was produced (ai/manual/bulk_import)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_ingestion_fields"
down_revision: Union[str, None] = "0002_add_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New enum types
    op.execute("""
        CREATE TYPE ingestion_status_enum AS ENUM (
            'pending', 'processing', 'complete', 'failed'
        )
    """)
    op.execute("""
        CREATE TYPE ingestion_method_enum AS ENUM (
            'ai', 'manual', 'bulk_import'
        )
    """)

    # sources: ingestion_status + ingestion_error
    op.add_column(
        "sources",
        sa.Column(
            "ingestion_status",
            sa.Enum(name="ingestion_status_enum", create_type=False),
            nullable=True,  # null = no ingestion triggered yet (pre-pipeline sources)
        ),
    )
    op.add_column(
        "sources",
        sa.Column("ingestion_error", sa.Text, nullable=True),
    )
    op.create_index("ix_sources_ingestion_status", "sources", ["ingestion_status"])

    # claims: ingestion_method
    # ai_extracted bool is kept for backwards compatibility (Excel import set it to false)
    # ingestion_method is the richer replacement; both are maintained during transition.
    op.add_column(
        "claims",
        sa.Column(
            "ingestion_method",
            sa.Enum(name="ingestion_method_enum", create_type=False),
            nullable=True,  # null = legacy claim (pre-Phase 4, treat as bulk_import)
        ),
    )

    # Back-fill: existing ai_extracted=true claims → 'ai', rest → 'bulk_import'
    op.execute("""
        UPDATE claims
        SET ingestion_method = CASE
            WHEN ai_extracted = true THEN 'ai'::ingestion_method_enum
            ELSE 'bulk_import'::ingestion_method_enum
        END
    """)


def downgrade() -> None:
    op.drop_column("claims", "ingestion_method")
    op.drop_index("ix_sources_ingestion_status", table_name="sources")
    op.drop_column("sources", "ingestion_error")
    op.drop_column("sources", "ingestion_status")

    op.execute("DROP TYPE IF EXISTS ingestion_method_enum")
    op.execute("DROP TYPE IF EXISTS ingestion_status_enum")
