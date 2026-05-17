"""Add expanded metadata fields to observations table

Revision ID: 0008_observation_expanded_fields
Revises: 0007_case_review_fields
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM

revision = "0008_observation_expanded_fields"
down_revision = "0007_case_review_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    for name, values in [
        ("observation_claim_type_enum",
         ["phenomenological", "physiological", "psychological",
          "behavioural", "demographic", "methodological", "theoretical"]),
        ("observation_polarity_enum",
         ["positive", "negative", "null_result", "mixed"]),
        ("observation_sample_size_tier_enum",
         ["single_case", "small", "medium", "large", "unspecified"]),
        ("observation_sampling_method_enum",
         ["convenience", "purposive", "snowball", "registry", "unspecified"]),
        ("observation_measurement_type_enum",
         ["self_report", "clinical_assessment", "physiological_measurement",
          "document_analysis", "observation", "computational", "unspecified"]),
    ]:
        ENUM(*values, name=name, create_type=False).create(bind, checkfirst=True)

    op.add_column("observations", sa.Column("claim_type",
        sa.Enum(name="observation_claim_type_enum", create_type=False), nullable=True))
    op.add_column("observations", sa.Column("polarity",
        sa.Enum(name="observation_polarity_enum", create_type=False), nullable=True))
    op.add_column("observations", sa.Column("sample_n", sa.Integer, nullable=True))
    op.add_column("observations", sa.Column("sample_size_tier",
        sa.Enum(name="observation_sample_size_tier_enum", create_type=False), nullable=True))
    op.add_column("observations", sa.Column("population_description", sa.Text, nullable=True))
    op.add_column("observations", sa.Column("sampling_method",
        sa.Enum(name="observation_sampling_method_enum", create_type=False), nullable=True))
    op.add_column("observations", sa.Column("measurement_type",
        sa.Enum(name="observation_measurement_type_enum", create_type=False), nullable=True))
    op.add_column("observations", sa.Column("control_group_present", sa.Boolean, nullable=True))


def downgrade() -> None:
    for col in ["claim_type", "polarity", "sample_n", "sample_size_tier",
                "population_description", "sampling_method", "measurement_type",
                "control_group_present"]:
        op.drop_column("observations", col)
    for name in ["observation_claim_type_enum", "observation_polarity_enum",
                 "observation_sample_size_tier_enum", "observation_sampling_method_enum",
                 "observation_measurement_type_enum"]:
        op.execute(f"DROP TYPE IF EXISTS {name}")
