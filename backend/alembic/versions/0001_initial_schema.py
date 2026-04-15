"""Initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Enum types
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TYPE source_type_enum AS ENUM (
            'account','paper','book','interview','media','field_report'
        )
    """)
    op.execute("""
        CREATE TYPE disciplinary_frame_enum AS ENUM (
            'neuroscience','psychology','folklore','physics','parapsychology',
            'sociology','anthropology','psychiatry','ufology','philosophy','other'
        )
    """)
    op.execute("""
        CREATE TYPE provenance_quality_enum AS ENUM (
            'peer_reviewed','grey_literature','anecdotal',
            'investigator_report','self_reported','unknown'
        )
    """)
    op.execute("""
        CREATE TYPE account_context_enum AS ENUM (
            'sleep','wake','hypnagogic','hypnopompic',
            'altered_state','full_consciousness','unknown'
        )
    """)
    op.execute("""
        CREATE TYPE corroboration_level_enum AS ENUM (
            'none','witness','physical_trace','investigator','multiple'
        )
    """)
    op.execute("""
        CREATE TYPE epistemic_status_enum AS ENUM (
            'asserted','observed','inferred','speculative','contested','retracted'
        )
    """)
    op.execute("""
        CREATE TYPE claim_type_enum AS ENUM (
            'phenomenological','causal','correlational','definitional','methodological'
        )
    """)
    op.execute("""
        CREATE TYPE tag_category_enum AS ENUM (
            'perceptual','somatic','cognitive','narrative','environmental','emotional'
        )
    """)
    op.execute("""
        CREATE TYPE concept_type_enum AS ENUM (
            'phenomenon','mechanism','entity','location','process','theoretical_construct'
        )
    """)
    op.execute("""
        CREATE TYPE relationship_type_enum AS ENUM (
            'correlates_with','precedes','causes','contradicts',
            'is_instance_of','co_occurs_with','is_explained_by','anomalous_given'
        )
    """)
    op.execute("""
        CREATE TYPE relationship_strength_enum AS ENUM ('weak','moderate','strong')
    """)
    op.execute("""
        CREATE TYPE hypothesis_framework_enum AS ENUM (
            'neurological','psychological','sociocultural','physical',
            'interdimensional','information_theoretic','psychospiritual','unknown'
        )
    """)
    op.execute("""
        CREATE TYPE hypothesis_status_enum AS ENUM (
            'active','abandoned','merged','speculative'
        )
    """)
    op.execute("""
        CREATE TYPE attachable_entity_type_enum AS ENUM (
            'claim','concept','hypothesis','concept_relationship','source'
        )
    """)
    op.execute("""
        CREATE TYPE epistemic_note_type_enum AS ENUM (
            'methodological_concern','replication','contradiction',
            'update','personal_observation'
        )
    """)

    # ------------------------------------------------------------------
    # Corpus layer
    # ------------------------------------------------------------------

    op.create_table(
        "sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_type", sa.Enum(name="source_type_enum", create_type=False), nullable=False),
        sa.Column("title", sa.String(1000), nullable=False),
        sa.Column("authors", postgresql.JSONB, nullable=True),
        sa.Column("publication_date", sa.String(50), nullable=True),
        sa.Column("url", sa.String(2000), nullable=True),
        sa.Column("doi", sa.String(500), nullable=True),
        sa.Column("disciplinary_frame", sa.Enum(name="disciplinary_frame_enum", create_type=False), nullable=True),
        sa.Column("provenance_quality", sa.Enum(name="provenance_quality_enum", create_type=False), nullable=False, server_default="unknown"),
        sa.Column("ingestion_date", sa.String(50), nullable=True),
        sa.Column("raw_text", sa.Text, nullable=True),
        sa.Column("file_ref", sa.String(1000), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Full-text search index on sources
    op.execute("""
        CREATE INDEX ix_sources_fts ON sources
        USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(raw_text,'')))
    """)

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("account_date", sa.String(50), nullable=True),
        sa.Column("reporter_demographics", postgresql.JSONB, nullable=True),
        sa.Column("reporting_lag_days", sa.Integer, nullable=True),
        sa.Column("context", sa.Enum(name="account_context_enum", create_type=False), nullable=True),
        sa.Column("corroboration", sa.Enum(name="corroboration_level_enum", create_type=False), nullable=False, server_default="none"),
        sa.Column("hypnotic_regression", sa.Boolean, nullable=False, server_default="false"),
    )

    op.create_table(
        "phenomenon_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("label", sa.String(200), nullable=False, unique=True),
        sa.Column("category", sa.Enum(name="tag_category_enum", create_type=False), nullable=False),
        sa.Column("definition", sa.Text, nullable=True),
        sa.Column("aliases", postgresql.JSONB, nullable=True),
        sa.Column("parent_tag_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("phenomenon_tags.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "claims",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claim_text", sa.Text, nullable=False),
        sa.Column("verbatim", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("page_ref", sa.String(100), nullable=True),
        sa.Column("timestamp_ref", sa.String(100), nullable=True),
        sa.Column("epistemic_status", sa.Enum(name="epistemic_status_enum", create_type=False), nullable=False, server_default="asserted"),
        sa.Column("claim_type", sa.Enum(name="claim_type_enum", create_type=False), nullable=False),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("reviewed_at", sa.String(50), nullable=True),
        sa.Column("ai_extracted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_claims_source_id", "claims", ["source_id"])
    op.create_index("ix_claims_epistemic_status", "claims", ["epistemic_status"])
    op.create_index("ix_claims_claim_type", "claims", ["claim_type"])

    # Full-text search on claim_text
    op.execute("""
        CREATE INDEX ix_claims_fts ON claims
        USING gin(to_tsvector('english', claim_text))
    """)

    op.create_table(
        "claim_tags",
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
    )

    # ------------------------------------------------------------------
    # Synthesis layer
    # ------------------------------------------------------------------

    op.create_table(
        "concepts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("label", sa.String(500), nullable=False, unique=True),
        sa.Column("concept_type", sa.Enum(name="concept_type_enum", create_type=False), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("epistemic_status", sa.Enum(name="epistemic_status_enum", create_type=False), nullable=False, server_default="asserted"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "concept_relationships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_concept_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_concept_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relationship_type", sa.Enum(name="relationship_type_enum", create_type=False), nullable=False),
        sa.Column("strength", sa.Enum(name="relationship_strength_enum", create_type=False), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Index to quickly find all anomalous_given edges — these are surfaced prominently in the UI
    op.create_index("ix_concept_rel_type", "concept_relationships", ["relationship_type"])
    op.create_index("ix_concept_rel_source", "concept_relationships", ["source_concept_id"])
    op.create_index("ix_concept_rel_target", "concept_relationships", ["target_concept_id"])

    op.create_table(
        "concept_supporting_claims",
        sa.Column("concept_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "relationship_supporting_claims",
        sa.Column("relationship_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("concept_relationships.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "hypotheses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("label", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("framework", sa.Enum(name="hypothesis_framework_enum", create_type=False), nullable=False),
        sa.Column("assumed_ontologies", postgresql.JSONB, nullable=True),
        sa.Column("required_assumptions", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.Enum(name="hypothesis_status_enum", create_type=False), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_hypotheses_framework", "hypotheses", ["framework"])
    op.create_index("ix_hypotheses_status", "hypotheses", ["status"])

    op.create_table(
        "hypothesis_scope_claims",
        sa.Column("hypothesis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_supporting_claims",
        sa.Column("hypothesis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_anomalous_claims",
        sa.Column("hypothesis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_competitors",
        sa.Column("hypothesis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("competitor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "epistemic_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("attached_to_type", sa.Enum(name="attachable_entity_type_enum", create_type=False), nullable=False),
        sa.Column("attached_to_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("note_type", sa.Enum(name="epistemic_note_type_enum", create_type=False), nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("author", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Index to fetch all notes for a given entity efficiently
    op.create_index("ix_epistemic_notes_attached", "epistemic_notes", ["attached_to_type", "attached_to_id"])

    # ------------------------------------------------------------------
    # updated_at auto-update trigger (PostgreSQL)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)

    for table in [
        "sources", "phenomenon_tags", "claims", "concepts",
        "concept_relationships", "hypotheses", "epistemic_notes",
    ]:
        op.execute(f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    # Drop triggers
    for table in [
        "sources", "phenomenon_tags", "claims", "concepts",
        "concept_relationships", "hypotheses", "epistemic_notes",
    ]:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")

    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")

    # Drop tables (reverse dependency order)
    for table in [
        "epistemic_notes",
        "hypothesis_competitors", "hypothesis_anomalous_claims",
        "hypothesis_supporting_claims", "hypothesis_scope_claims",
        "hypotheses",
        "relationship_supporting_claims", "concept_supporting_claims",
        "concept_relationships", "concepts",
        "claim_tags", "claims", "phenomenon_tags",
        "accounts", "sources",
    ]:
        op.drop_table(table)

    # Drop enum types
    for enum in [
        "epistemic_note_type_enum", "attachable_entity_type_enum",
        "hypothesis_status_enum", "hypothesis_framework_enum",
        "relationship_strength_enum", "relationship_type_enum",
        "concept_type_enum", "tag_category_enum", "claim_type_enum",
        "epistemic_status_enum", "corroboration_level_enum",
        "account_context_enum", "provenance_quality_enum",
        "disciplinary_frame_enum", "source_type_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum}")
