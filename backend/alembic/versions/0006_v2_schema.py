"""v2 schema: source-type discriminated model, Case table, Observation refactor

Revision ID: 0006_v2_schema
Revises: 0005_hypothesis_review_fields
Create Date: 2026-05-14

Changes:
  - Drop accounts table (Account model removed)
  - Drop observations, observation_tags (and hypothesis join tables that ref observations)
  - Drop old enum types: content_type_enum, source_modality_enum, epistemic_distance_enum,
    collection_method_enum, sample_size_tier_enum, sampling_method_enum,
    corroboration_level_enum, account_context_enum, old source_type_enum
  - Create new source_type_enum (case_report, empirical_study, review_paper, theoretical)
  - Replace source_type column on sources table
  - Create ~25 new case-layer enum types
  - Create cases table
  - Recreate observations table (corpus-derived schema, nullable source_id)
  - Recreate observation_tags
  - Recreate hypothesis_supporting_observations and hypothesis_anomalous_observations
    (FK to new observations table)

Data note: existing observation data is discarded (was imported under the old schema).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

revision: str = "0006_v2_schema"
down_revision: Union[str, None] = "0005_hypothesis_review_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Drop hypothesis observation join tables (FK → observations) ─────────
    op.drop_table("hypothesis_supporting_observations")
    op.drop_table("hypothesis_anomalous_observations")

    # ── 2. Drop observation-related tables ────────────────────────────────────
    op.drop_table("observation_tags")
    op.drop_table("observations")
    op.execute("DROP TABLE IF EXISTS observation_review")

    # ── 3. Drop accounts table ────────────────────────────────────────────────
    op.drop_table("accounts")

    # ── 4. Drop old enum types no longer used ─────────────────────────────────
    for t in (
        "content_type_enum",
        "source_modality_enum",
        "epistemic_distance_enum",
        "collection_method_enum",
        "sample_size_tier_enum",
        "sampling_method_enum",
        "corroboration_level_enum",
        "account_context_enum",
    ):
        op.execute(f"DROP TYPE IF EXISTS {t}")

    # ── 5. Replace source_type_enum ───────────────────────────────────────────
    # Drop the column first (old values: account, paper, book, interview, media, field_report)
    op.drop_column("sources", "source_type")
    op.execute("DROP TYPE IF EXISTS source_type_enum")

    new_source_type_enum = ENUM(
        "case_report", "empirical_study", "review_paper", "theoretical",
        name="source_type_enum", create_type=False,
    )
    new_source_type_enum.create(bind, checkfirst=True)

    op.add_column(
        "sources",
        sa.Column(
            "source_type",
            new_source_type_enum,
            nullable=False,
            server_default="empirical_study",
        ),
    )
    op.alter_column("sources", "source_type", server_default=None)

    # ── 6. Create new enum types ──────────────────────────────────────────────

    def mk_enum(name: str, *values: str) -> ENUM:
        e = ENUM(*values, name=name, create_type=False)
        e.create(bind, checkfirst=True)
        return e

    # Observation layer
    observation_source_type_enum = mk_enum(
        "observation_source_type_enum", "literature", "corpus_derived"
    )
    cases_included_enum = mk_enum(
        "cases_included_enum", "all", "filtered_subset"
    )

    # Case layer — extraction provenance
    extraction_method_enum = mk_enum(
        "extraction_method_enum", "manual", "ai_assisted", "imported"
    )

    # Case layer — demographics
    experiencer_sex_enum = mk_enum(
        "experiencer_sex_enum", "male", "female", "intersex", "not_reported"
    )
    education_level_enum = mk_enum(
        "education_level_enum",
        "primary", "secondary", "tertiary", "postgraduate", "not_reported",
    )
    marital_status_enum = mk_enum(
        "marital_status_enum",
        "single", "married", "partnered", "divorced", "widowed", "not_reported",
    )
    religiosity_enum = mk_enum(
        "religiosity_enum", "none", "low", "moderate", "high", "not_reported"
    )

    # Case layer — background
    prior_interest_level_enum = mk_enum(
        "prior_interest_level_enum", "none", "low", "moderate", "high", "not_reported"
    )
    history_presence_enum = mk_enum(
        "history_presence_enum", "none", "suspected", "confirmed", "not_reported"
    )
    motivational_factors_enum = mk_enum(
        "motivational_factors_enum",
        "none_apparent", "suspected", "confirmed", "not_assessed",
    )
    repeat_experiencer_enum = mk_enum(
        "repeat_experiencer_enum",
        "first_experience", "repeat_experiencer", "not_reported",
    )

    # Case layer — onset
    event_date_precision_enum = mk_enum(
        "event_date_precision_enum",
        "exact", "month_and_year", "year_only", "decade", "unknown",
    )
    sleep_wake_state_enum = mk_enum(
        "sleep_wake_state_enum",
        "fully_awake", "drowsy", "hypnagogic", "hypnopompic", "asleep", "unknown",
    )
    physical_location_type_enum = mk_enum(
        "physical_location_type_enum",
        "bedroom", "other_indoor", "vehicle", "outdoor_rural", "outdoor_urban", "unknown",
    )
    alone_at_onset_enum = mk_enum(
        "alone_at_onset_enum", "alone", "others_present", "unknown"
    )
    psychological_state_type_enum = mk_enum(
        "psychological_state_type_enum",
        "normal", "stressed", "anxious", "depressed", "elated", "dissociated", "unknown",
    )
    altered_state_depth_enum = mk_enum(
        "altered_state_depth_enum", "none", "mild", "moderate", "deep", "unknown"
    )
    event_duration_enum = mk_enum(
        "event_duration_enum",
        "seconds", "minutes", "under_one_hour", "one_to_several_hours", "unknown",
    )

    # Case layer — phenomenological
    presence_absence_unknown_enum = mk_enum(
        "presence_absence_unknown_enum", "none", "yes", "unknown"
    )
    paralysis_extent_enum = mk_enum(
        "paralysis_extent_enum", "none", "partial", "full", "unknown"
    )
    entity_count_enum = mk_enum(
        "entity_count_enum", "one", "two_to_five", "more_than_five", "unknown"
    )

    # Case layer — psychological assessment
    psychometric_presence_enum = mk_enum(
        "psychometric_presence_enum", "no", "yes", "unknown"
    )
    psychometric_level_enum = mk_enum(
        "psychometric_level_enum", "low", "moderate", "high"
    )
    clinical_level_enum = mk_enum(
        "clinical_level_enum", "none", "subclinical", "clinical"
    )
    clinical_presence_enum = mk_enum(
        "clinical_presence_enum", "none", "subclinical", "clinical_diagnosis"
    )

    # Case layer — memory & corroboration
    account_consistency_enum = mk_enum(
        "account_consistency_enum",
        "not_assessed", "consistent", "minor_variations",
        "significant_variations", "contradictory",
    )
    corroboration_level_v2_enum = mk_enum(
        "corroboration_level_v2_enum",
        "testimony_only", "corroborated_by_witness",
        "corroborated_by_physical_evidence", "corroborated_by_both", "unknown",
    )

    # ── 7. Create cases table ─────────────────────────────────────────────────
    op.create_table(
        "cases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_label", sa.String(200), nullable=False),
        sa.Column("extraction_method", extraction_method_enum, nullable=True),
        sa.Column("extraction_date", sa.Date, nullable=True),
        sa.Column("extracted_by", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        # Demographics
        sa.Column("experiencer_nationality", sa.String(100), nullable=True),
        sa.Column("experiencer_ethnicity", sa.String(100), nullable=True),
        sa.Column("experiencer_age_at_event", sa.Integer, nullable=True),
        sa.Column("experiencer_sex", experiencer_sex_enum, nullable=True),
        sa.Column("experiencer_gender", sa.String(100), nullable=True),
        sa.Column("experiencer_occupation", sa.String(200), nullable=True),
        sa.Column("education_level", education_level_enum, nullable=True),
        sa.Column("marital_status", marital_status_enum, nullable=True),
        sa.Column("religiosity", religiosity_enum, nullable=True),
        # Background History
        sa.Column("prior_ufo_interest", prior_interest_level_enum, nullable=True),
        sa.Column("prior_paranormal_belief", prior_interest_level_enum, nullable=True),
        sa.Column("cultural_media_exposure_to_aae", prior_interest_level_enum, nullable=True),
        sa.Column("childhood_trauma_history", history_presence_enum, nullable=True),
        sa.Column("childhood_abuse_history", history_presence_enum, nullable=True),
        sa.Column("surgical_history_present", history_presence_enum, nullable=True),
        sa.Column("surgical_history_detail", sa.Text, nullable=True),
        sa.Column("neuropsychiatric_history_present", history_presence_enum, nullable=True),
        sa.Column("neuropsychiatric_history_detail", sa.Text, nullable=True),
        sa.Column("substance_use_present", history_presence_enum, nullable=True),
        sa.Column("substance_use_detail", sa.Text, nullable=True),
        sa.Column("motivational_factors_present", motivational_factors_enum, nullable=True),
        sa.Column("motivational_factors_detail", sa.Text, nullable=True),
        sa.Column("repeat_experiencer", repeat_experiencer_enum, nullable=True),
        # Onset Conditions
        sa.Column("event_date", sa.Date, nullable=True),
        sa.Column("event_date_precision", event_date_precision_enum, nullable=True),
        sa.Column("event_time_of_day", sa.String(50), nullable=True),
        sa.Column("sleep_wake_state_at_onset", sleep_wake_state_enum, nullable=True),
        sa.Column("physical_location_type", physical_location_type_enum, nullable=True),
        sa.Column("physical_location_detail", sa.Text, nullable=True),
        sa.Column("alone_at_onset", alone_at_onset_enum, nullable=True),
        sa.Column("witness_count", sa.Integer, nullable=True),
        sa.Column("environmental_stimuli_present", presence_absence_unknown_enum, nullable=True),
        sa.Column("environmental_stimuli_detail", sa.Text, nullable=True),
        sa.Column("psychological_state_preceding", psychological_state_type_enum, nullable=True),
        sa.Column("psychological_state_detail", sa.Text, nullable=True),
        sa.Column("altered_state_at_onset", altered_state_depth_enum, nullable=True),
        sa.Column("altered_state_types", JSONB, nullable=True),
        # Phenomenological Content
        sa.Column("duration_of_experience", event_duration_enum, nullable=True),
        sa.Column("missing_time_reported", presence_absence_unknown_enum, nullable=True),
        sa.Column("missing_time_duration", sa.String(200), nullable=True),
        sa.Column("paralysis_reported", paralysis_extent_enum, nullable=True),
        sa.Column("perceived_physical_transport", presence_absence_unknown_enum, nullable=True),
        sa.Column("out_of_body_sensation", presence_absence_unknown_enum, nullable=True),
        sa.Column("floating_sensation", presence_absence_unknown_enum, nullable=True),
        sa.Column("tunnel_or_passage_sensation", presence_absence_unknown_enum, nullable=True),
        sa.Column("entity_presence", presence_absence_unknown_enum, nullable=True),
        sa.Column("entity_count", entity_count_enum, nullable=True),
        sa.Column("entity_types", JSONB, nullable=True),
        sa.Column("entity_types_detail", sa.Text, nullable=True),
        sa.Column("entity_communication_present", presence_absence_unknown_enum, nullable=True),
        sa.Column("entity_communication_modality", JSONB, nullable=True),
        sa.Column("entity_communication_content_type", JSONB, nullable=True),
        sa.Column("educational_or_mission_messaging", presence_absence_unknown_enum, nullable=True),
        sa.Column("medical_procedure_motif", presence_absence_unknown_enum, nullable=True),
        sa.Column("medical_procedure_detail", sa.Text, nullable=True),
        sa.Column("reproductive_or_sexual_motif", presence_absence_unknown_enum, nullable=True),
        sa.Column("reproductive_motif_detail", sa.Text, nullable=True),
        sa.Column("craft_or_vehicle_reported", presence_absence_unknown_enum, nullable=True),
        sa.Column("craft_description", sa.Text, nullable=True),
        sa.Column("physical_environment_changes", presence_absence_unknown_enum, nullable=True),
        sa.Column("physical_environment_changes_detail", sa.Text, nullable=True),
        sa.Column("event_sequence_described", presence_absence_unknown_enum, nullable=True),
        sa.Column("event_sequence_detail", sa.Text, nullable=True),
        sa.Column("physiological_symptoms", JSONB, nullable=True),
        sa.Column("physiological_symptoms_detail", sa.Text, nullable=True),
        sa.Column("emotional_valence_during_event", JSONB, nullable=True),
        sa.Column("emotional_valence_detail", sa.Text, nullable=True),
        # Physical & Physiological Evidence
        sa.Column("physical_marks_present", presence_absence_unknown_enum, nullable=True),
        sa.Column("physical_marks_detail", sa.Text, nullable=True),
        sa.Column("physical_marks_medically_examined", psychometric_presence_enum, nullable=True),
        sa.Column("environmental_physical_evidence", presence_absence_unknown_enum, nullable=True),
        sa.Column("environmental_physical_evidence_detail", sa.Text, nullable=True),
        sa.Column("independent_corroboration_present", presence_absence_unknown_enum, nullable=True),
        sa.Column("independent_corroboration_detail", sa.Text, nullable=True),
        sa.Column("eeg_or_neurological_data_available", psychometric_presence_enum, nullable=True),
        sa.Column("eeg_data_detail", sa.Text, nullable=True),
        sa.Column("blood_or_toxicology_data_available", psychometric_presence_enum, nullable=True),
        sa.Column("blood_data_detail", sa.Text, nullable=True),
        # Psychological Profile
        sa.Column("fantasy_proneness_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("fantasy_proneness_score", sa.Float, nullable=True),
        sa.Column("fantasy_proneness_instrument", sa.String(200), nullable=True),
        sa.Column("hypnotic_suggestibility_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("hypnotic_suggestibility_score", sa.Float, nullable=True),
        sa.Column("hypnotic_suggestibility_instrument", sa.String(200), nullable=True),
        sa.Column("boundary_thinness_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("boundary_thinness_score", sa.Float, nullable=True),
        sa.Column("boundary_thinness_instrument", sa.String(200), nullable=True),
        sa.Column("dissociation_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("dissociation_score", sa.Float, nullable=True),
        sa.Column("dissociation_instrument", sa.String(200), nullable=True),
        sa.Column("ptsd_symptoms_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("ptsd_symptoms_present", clinical_level_enum, nullable=True),
        sa.Column("ptsd_instrument", sa.String(200), nullable=True),
        sa.Column("psychopathology_screened", psychometric_presence_enum, nullable=True),
        sa.Column("psychopathology_findings", clinical_presence_enum, nullable=True),
        sa.Column("psychopathology_detail", sa.Text, nullable=True),
        sa.Column("need_for_meaning_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("need_for_meaning_level", psychometric_level_enum, nullable=True),
        sa.Column("self_escape_motivation_assessed", psychometric_presence_enum, nullable=True),
        sa.Column("self_escape_motivation_level", psychometric_level_enum, nullable=True),
        # Memory & Retrieval
        sa.Column("memory_retrieval_method", JSONB, nullable=True),
        sa.Column("hypnosis_used", psychometric_presence_enum, nullable=True),
        sa.Column("hypnotist_identity", sa.String(200), nullable=True),
        sa.Column("investigator_or_therapist_involved", psychometric_presence_enum, nullable=True),
        sa.Column("investigator_detail", sa.Text, nullable=True),
        sa.Column("account_consistency_over_time", account_consistency_enum, nullable=True),
        sa.Column("number_of_accounts_on_record", sa.Integer, nullable=True),
        # Aftermath
        sa.Column("positive_transformation_reported", presence_absence_unknown_enum, nullable=True),
        sa.Column("positive_transformation_detail", sa.Text, nullable=True),
        sa.Column("negative_psychological_aftermath", presence_absence_unknown_enum, nullable=True),
        sa.Column("negative_aftermath_detail", sa.Text, nullable=True),
        sa.Column("ongoing_contact_reported", presence_absence_unknown_enum, nullable=True),
        sa.Column("ongoing_contact_detail", sa.Text, nullable=True),
        sa.Column("changed_worldview_reported", presence_absence_unknown_enum, nullable=True),
        sa.Column("worldview_change_detail", sa.Text, nullable=True),
        sa.Column("sought_community_or_support", presence_absence_unknown_enum, nullable=True),
        sa.Column("community_type", JSONB, nullable=True),
        # Corroboration Quality
        sa.Column("corroboration_level", corroboration_level_v2_enum, nullable=True),
        sa.Column("case_quality_notes", sa.Text, nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_cases_source_id", "cases", ["source_id"])

    # ── 8. Recreate observations table (new schema) ───────────────────────────
    observation_epistemic_status_enum = ENUM(
        "reported", "corroborated", "contested", "artefactual", "retracted",
        name="observation_epistemic_status_enum", create_type=False,
    )
    ingestion_method_enum = ENUM(
        "ai", "manual", "bulk_import",
        name="ingestion_method_enum", create_type=False,
    )

    op.create_table(
        "observations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=True),
        sa.Column("observation_source_type", observation_source_type_enum, nullable=False, server_default="literature"),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("epistemic_status", observation_epistemic_status_enum, nullable=False, server_default="reported"),
        sa.Column("authored_by", sa.String(200), nullable=True),
        sa.Column("query_definition", sa.Text, nullable=True),
        sa.Column("analysis_tool", sa.String(200), nullable=True),
        sa.Column("corpus_snapshot_date", sa.Date, nullable=True),
        sa.Column("case_count_at_snapshot", sa.Integer, nullable=True),
        sa.Column("cases_included", cases_included_enum, nullable=True),
        sa.Column("case_filter_description", sa.Text, nullable=True),
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

    # ── 9. Recreate observation_tags ──────────────────────────────────────────
    op.create_table(
        "observation_tags",
        sa.Column("observation_id", UUID(as_uuid=True), sa.ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", UUID(as_uuid=True), sa.ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
    )

    # ── 10. Recreate hypothesis observation join tables ────────────────────────
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

    # ── 11. updated_at trigger for new tables ─────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    for table in ("cases", "observations"):
        op.execute(f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
        """)


def downgrade() -> None:
    # Drop recreated join tables
    op.drop_table("hypothesis_anomalous_observations")
    op.drop_table("hypothesis_supporting_observations")
    op.drop_table("observation_tags")
    op.drop_table("observations")
    op.drop_table("cases")

    # Drop new enum types
    for t in (
        "observation_source_type_enum",
        "cases_included_enum",
        "extraction_method_enum",
        "experiencer_sex_enum",
        "education_level_enum",
        "marital_status_enum",
        "religiosity_enum",
        "prior_interest_level_enum",
        "history_presence_enum",
        "motivational_factors_enum",
        "repeat_experiencer_enum",
        "event_date_precision_enum",
        "sleep_wake_state_enum",
        "physical_location_type_enum",
        "alone_at_onset_enum",
        "psychological_state_type_enum",
        "altered_state_depth_enum",
        "event_duration_enum",
        "presence_absence_unknown_enum",
        "paralysis_extent_enum",
        "entity_count_enum",
        "psychometric_presence_enum",
        "psychometric_level_enum",
        "clinical_level_enum",
        "clinical_presence_enum",
        "account_consistency_enum",
        "corroboration_level_v2_enum",
    ):
        op.execute(f"DROP TYPE IF EXISTS {t}")

    # Restore old source_type_enum and column (schema only — data not recoverable)
    op.drop_column("sources", "source_type")
    op.execute("DROP TYPE IF EXISTS source_type_enum")
    op.execute("""
        CREATE TYPE source_type_enum AS ENUM (
            'account', 'paper', 'book', 'interview', 'media', 'field_report'
        )
    """)
    op.add_column(
        "sources",
        sa.Column(
            "source_type",
            sa.Enum(name="source_type_enum", create_type=False),
            nullable=False,
            server_default="paper",
        ),
    )
    op.alter_column("sources", "source_type", server_default=None)

    # Restore old enum types (values only — data not recoverable)
    op.execute("CREATE TYPE corroboration_level_enum AS ENUM ('none', 'witness', 'physical_trace', 'investigator', 'multiple')")
    op.execute("CREATE TYPE account_context_enum AS ENUM ('sleep', 'wake', 'hypnagogic', 'hypnopompic', 'altered_state', 'full_consciousness', 'unknown')")
    op.execute("CREATE TYPE content_type_enum AS ENUM ('experiential', 'behavioral', 'physiological', 'environmental', 'testimonial', 'documentary_trace')")
    op.execute("CREATE TYPE source_modality_enum AS ENUM ('first_person_verbal', 'investigator_summary', 'physiological', 'behavioral', 'documentary', 'aggregate_statistical')")
    op.execute("CREATE TYPE epistemic_distance_enum AS ENUM ('direct', 'summarized', 'aggregated', 'derived')")
    op.execute("CREATE TYPE collection_method_enum AS ENUM ('spontaneous_report', 'structured_interview', 'hypnotic_regression', 'questionnaire', 'clinical_assessment', 'passive_recording', 'investigator_inference')")
    op.execute("CREATE TYPE sample_size_tier_enum AS ENUM ('single_case', 'small', 'moderate', 'large', 'population')")
    op.execute("CREATE TYPE sampling_method_enum AS ENUM ('self_selected', 'investigator_referred', 'clinical', 'survey', 'convenience', 'unknown')")

    # Restore accounts and old observations tables (schema only — data not recoverable)
    op.create_table(
        "accounts",
        sa.Column("id", UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("account_date", sa.String(50), nullable=True),
        sa.Column("reporter_demographics", JSONB, nullable=True),
        sa.Column("reporting_lag_days", sa.Integer, nullable=True),
        sa.Column("context", sa.Enum(name="account_context_enum", create_type=False), nullable=True),
        sa.Column("corroboration", sa.Enum(name="corroboration_level_enum", create_type=False), nullable=False, server_default="none"),
        sa.Column("hypnotic_regression", sa.Boolean, nullable=False, server_default="false"),
    )

    op.create_table(
        "observations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("content_type", sa.Enum(name="content_type_enum", create_type=False), nullable=False),
        sa.Column("source_modality", sa.Enum(name="source_modality_enum", create_type=False), nullable=False),
        sa.Column("epistemic_distance", sa.Enum(name="epistemic_distance_enum", create_type=False), nullable=False),
        sa.Column("collection_method", sa.Enum(name="collection_method_enum", create_type=False), nullable=False),
        sa.Column("epistemic_status", sa.Enum(name="observation_epistemic_status_enum", create_type=False), nullable=False, server_default="reported"),
        sa.Column("corroboration_level", sa.Enum(name="corroboration_level_enum", create_type=False), nullable=False, server_default="none"),
        sa.Column("sample_n", sa.Integer, nullable=True),
        sa.Column("sample_size_tier", sa.Enum(name="sample_size_tier_enum", create_type=False), nullable=True),
        sa.Column("sampling_method", sa.Enum(name="sampling_method_enum", create_type=False), nullable=True),
        sa.Column("inclusion_criteria_documented", sa.Boolean, nullable=True),
        sa.Column("verbatim", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("page_ref", sa.String(100), nullable=True),
        sa.Column("ingestion_method", sa.Enum(name="ingestion_method_enum", create_type=False), nullable=True),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("reviewed_at", sa.String(50), nullable=True),
        sa.Column("ai_extracted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "observation_tags",
        sa.Column("observation_id", UUID(as_uuid=True), sa.ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", UUID(as_uuid=True), sa.ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
    )
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
