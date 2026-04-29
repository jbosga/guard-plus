"""Replace Claim→Observation, Hypothesis→{Hypothesis,TheoreticalFramework}

Revision ID: 0004_obs_hyp_framework
Revises: 0003_add_ingestion_fields
Create Date: 2026-04-29 00:00:00.000000

Phase A data model refactor:
  - claims table → observations table (richer epistemic provenance fields)
  - hypotheses table replaced with new hypotheses (observation-linked) + theoretical_frameworks
  - Old claim/hypothesis join tables dropped
  - concept_supporting_claims and relationship_supporting_claims dropped
    (Concept observation anchoring is a planned follow-on phase)
  - epistemic_status_enum RETAINED (still used by Concept.epistemic_status)
  - claim_type_enum DROPPED
  - Old hypothesis_status_enum DROPPED and recreated with new values
    (active, dormant, abandoned, merged, refuted)

Data migration note: existing claims data is discarded (was imported from
Excel under the old schema and will be re-imported after the refactor).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

revision: str = "0004_obs_hyp_framework"
down_revision: Union[str, None] = "0003_add_ingestion_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── Pre-existing enum types (created in earlier migrations) ───────────────
    # Defined as ENUM objects so op.create_table columns can reference them by
    # object rather than by sa.Enum(name=...) which can spuriously emit CREATE TYPE.
    corroboration_level_enum = ENUM(
        'none', 'witness', 'physical_trace', 'investigator', 'multiple',
        name='corroboration_level_enum', create_type=False,
    )
    ingestion_method_enum = ENUM(
        'ai', 'manual', 'bulk_import',
        name='ingestion_method_enum', create_type=False,
    )
    hypothesis_framework_enum = ENUM(
        'neurological', 'psychological', 'sociocultural', 'physical',
        'interdimensional', 'information_theoretic', 'psychospiritual', 'unknown',
        name='hypothesis_framework_enum', create_type=False,
    )

    # ── 1. Create new enum types ───────────────────────────────────────────────
    # ENUM(...).create(checkfirst=True) is idempotent — safe after partial runs.
    observation_epistemic_status_enum = ENUM(
        'reported', 'corroborated', 'contested', 'artefactual', 'retracted',
        name='observation_epistemic_status_enum', create_type=False,
    )
    observation_epistemic_status_enum.create(bind, checkfirst=True)

    content_type_enum = ENUM(
        'experiential', 'behavioral', 'physiological', 'environmental',
        'testimonial', 'documentary_trace',
        name='content_type_enum', create_type=False,
    )
    content_type_enum.create(bind, checkfirst=True)

    source_modality_enum = ENUM(
        'first_person_verbal', 'investigator_summary', 'physiological',
        'behavioral', 'documentary', 'aggregate_statistical',
        name='source_modality_enum', create_type=False,
    )
    source_modality_enum.create(bind, checkfirst=True)

    epistemic_distance_enum = ENUM(
        'direct', 'summarized', 'aggregated', 'derived',
        name='epistemic_distance_enum', create_type=False,
    )
    epistemic_distance_enum.create(bind, checkfirst=True)

    collection_method_enum = ENUM(
        'spontaneous_report', 'structured_interview', 'hypnotic_regression',
        'questionnaire', 'clinical_assessment', 'passive_recording',
        'investigator_inference',
        name='collection_method_enum', create_type=False,
    )
    collection_method_enum.create(bind, checkfirst=True)

    sample_size_tier_enum = ENUM(
        'single_case', 'small', 'moderate', 'large', 'population',
        name='sample_size_tier_enum', create_type=False,
    )
    sample_size_tier_enum.create(bind, checkfirst=True)

    sampling_method_enum = ENUM(
        'self_selected', 'investigator_referred', 'clinical',
        'survey', 'convenience', 'unknown',
        name='sampling_method_enum', create_type=False,
    )
    sampling_method_enum.create(bind, checkfirst=True)

    hypothesis_type_enum = ENUM(
        'causal', 'correlational', 'mechanistic', 'taxonomic', 'predictive',
        name='hypothesis_type_enum', create_type=False,
    )
    hypothesis_type_enum.create(bind, checkfirst=True)

    confidence_level_enum = ENUM(
        'speculative', 'plausible', 'supported', 'contested',
        name='confidence_level_enum', create_type=False,
    )
    confidence_level_enum.create(bind, checkfirst=True)

    framework_status_enum = ENUM(
        'active', 'dormant', 'abandoned', 'merged', 'refuted',
        name='framework_status_enum', create_type=False,
    )
    framework_status_enum.create(bind, checkfirst=True)

    # ── 2. Create observations table ──────────────────────────────────────────
    op.create_table(
        "observations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("content_type", content_type_enum, nullable=False),
        sa.Column("source_modality", source_modality_enum, nullable=False),
        sa.Column("epistemic_distance", epistemic_distance_enum, nullable=False),
        sa.Column("collection_method", collection_method_enum, nullable=False),
        sa.Column("epistemic_status", observation_epistemic_status_enum, nullable=False, server_default="reported"),
        sa.Column("corroboration_level", corroboration_level_enum, nullable=False, server_default="none"),
        sa.Column("sample_n", sa.Integer, nullable=True),
        sa.Column("sample_size_tier", sample_size_tier_enum, nullable=True),
        sa.Column("sampling_method", sampling_method_enum, nullable=True),
        sa.Column("inclusion_criteria_documented", sa.Boolean, nullable=True),
        sa.Column("verbatim", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("page_ref", sa.String(100), nullable=True),
        sa.Column("ingestion_method", ingestion_method_enum, nullable=True),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("reviewed_at", sa.String(50), nullable=True),
        sa.Column("ai_extracted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_observations_source_id", "observations", ["source_id"])

    # ── 3. Create observation_tags join table ─────────────────────────────────
    op.create_table(
        "observation_tags",
        sa.Column("observation_id", UUID(as_uuid=True), sa.ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", UUID(as_uuid=True), sa.ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
    )

    # ── 4. Drop all join tables referencing claims or old hypotheses ──────────
    # Must drop before the tables they reference.
    op.drop_table("hypothesis_scope_claims")
    op.drop_table("hypothesis_supporting_claims")
    op.drop_table("hypothesis_anomalous_claims")
    op.drop_table("hypothesis_competitors")
    op.drop_table("concept_supporting_claims")
    op.drop_table("relationship_supporting_claims")
    op.drop_table("claim_tags")

    # ── 5. Drop old claims table ──────────────────────────────────────────────
    op.drop_table("claims")

    # ── 6. Drop old hypotheses table ─────────────────────────────────────────
    op.drop_table("hypotheses")

    # ── 7. Drop old enum types no longer in use ───────────────────────────────
    op.execute("DROP TYPE IF EXISTS claim_type_enum")
    # hypothesis_status_enum is replaced — drop old values, recreate with new
    op.execute("DROP TYPE IF EXISTS hypothesis_status_enum")

    # ── 8. Create new hypothesis_status_enum ─────────────────────────────────
    hypothesis_status_enum = ENUM(
        'active', 'dormant', 'abandoned', 'merged', 'refuted',
        name='hypothesis_status_enum', create_type=False,
    )
    hypothesis_status_enum.create(bind, checkfirst=True)

    # ── 9. Create new hypotheses table ───────────────────────────────────────
    op.create_table(
        "hypotheses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("label", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("hypothesis_type", hypothesis_type_enum, nullable=False),
        sa.Column("falsification_condition", sa.Text, nullable=True),
        sa.Column("scope", sa.Text, nullable=True),
        sa.Column("framework", hypothesis_framework_enum, nullable=False),
        sa.Column("assumed_ontologies", JSONB, nullable=True),
        sa.Column("status", hypothesis_status_enum, nullable=False, server_default="active"),
        sa.Column("confidence_level", confidence_level_enum, nullable=False, server_default="speculative"),
        sa.Column("parent_hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_hypotheses_framework", "hypotheses", ["framework"])
    op.create_index("ix_hypotheses_status", "hypotheses", ["status"])

    # ── 10. Create hypothesis join tables ─────────────────────────────────────
    op.create_table(
        "hypothesis_supporting_observations",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("observation_id", UUID(as_uuid=True), sa.ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_anomalous_observations",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("observation_id", UUID(as_uuid=True), sa.ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_competitors",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("competitor_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    )

    # ── 11. Create theoretical_frameworks table ───────────────────────────────
    op.create_table(
        "theoretical_frameworks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("label", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("framework_type", hypothesis_framework_enum, nullable=False),
        sa.Column("assumed_ontologies", JSONB, nullable=True),
        sa.Column("status", framework_status_enum, nullable=False, server_default="active"),
        sa.Column("confidence_level", confidence_level_enum, nullable=False, server_default="speculative"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # ── 12. Create framework join tables ──────────────────────────────────────
    op.create_table(
        "framework_core_hypotheses",
        sa.Column("framework_id", UUID(as_uuid=True), sa.ForeignKey("theoretical_frameworks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "framework_anomalous_hypotheses",
        sa.Column("framework_id", UUID(as_uuid=True), sa.ForeignKey("theoretical_frameworks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    )

    # ── 13. updated_at trigger for new tables ─────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    for table in ("observations", "hypotheses", "theoretical_frameworks"):
        op.execute(f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
        """)


def downgrade() -> None:
    # Drop framework tables
    op.drop_table("framework_anomalous_hypotheses")
    op.drop_table("framework_core_hypotheses")
    op.drop_table("theoretical_frameworks")

    # Drop new hypothesis tables
    op.drop_table("hypothesis_competitors")
    op.drop_table("hypothesis_anomalous_observations")
    op.drop_table("hypothesis_supporting_observations")
    op.drop_table("hypotheses")

    # Restore old hypothesis_status_enum
    op.execute("DROP TYPE IF EXISTS hypothesis_status_enum")
    op.execute("""
        CREATE TYPE hypothesis_status_enum AS ENUM (
            'active', 'abandoned', 'merged', 'speculative'
        )
    """)

    # Restore old hypotheses table (schema only — data is not recoverable)
    op.create_table(
        "hypotheses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("label", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("framework", sa.Enum(name="hypothesis_framework_enum", create_type=False), nullable=False),
        sa.Column("assumed_ontologies", JSONB, nullable=True),
        sa.Column("required_assumptions", JSONB, nullable=True),
        sa.Column("status", sa.Enum(name="hypothesis_status_enum", create_type=False), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # Restore old claim-related tables (schema only — data is not recoverable)
    op.execute("""
        CREATE TYPE claim_type_enum AS ENUM (
            'phenomenological', 'causal', 'correlational', 'definitional', 'methodological'
        )
    """)
    op.create_table(
        "claims",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claim_text", sa.Text, nullable=False),
        sa.Column("verbatim", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("page_ref", sa.String(100), nullable=True),
        sa.Column("timestamp_ref", sa.String(100), nullable=True),
        sa.Column("epistemic_status", sa.Enum(name="epistemic_status_enum", create_type=False), nullable=False, server_default="asserted"),
        sa.Column("claim_type", sa.Enum(name="claim_type_enum", create_type=False), nullable=False),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("reviewed_at", sa.String(50), nullable=True),
        sa.Column("ai_extracted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("ingestion_method", sa.Enum(name="ingestion_method_enum", create_type=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "claim_tags",
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", UUID(as_uuid=True), sa.ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "concept_supporting_claims",
        sa.Column("concept_id", UUID(as_uuid=True), sa.ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "relationship_supporting_claims",
        sa.Column("relationship_id", UUID(as_uuid=True), sa.ForeignKey("concept_relationships.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_scope_claims",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_supporting_claims",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_anomalous_claims",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "hypothesis_competitors",
        sa.Column("hypothesis_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("competitor_id", UUID(as_uuid=True), sa.ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    )

    # Drop new observation tables
    op.drop_table("observation_tags")
    op.drop_table("observations")

    # Drop new enum types
    op.execute("DROP TYPE IF EXISTS framework_status_enum")
    op.execute("DROP TYPE IF EXISTS confidence_level_enum")
    op.execute("DROP TYPE IF EXISTS hypothesis_type_enum")
    op.execute("DROP TYPE IF EXISTS sampling_method_enum")
    op.execute("DROP TYPE IF EXISTS sample_size_tier_enum")
    op.execute("DROP TYPE IF EXISTS collection_method_enum")
    op.execute("DROP TYPE IF EXISTS epistemic_distance_enum")
    op.execute("DROP TYPE IF EXISTS source_modality_enum")
    op.execute("DROP TYPE IF EXISTS content_type_enum")
    op.execute("DROP TYPE IF EXISTS observation_epistemic_status_enum")
