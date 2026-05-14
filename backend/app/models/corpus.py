"""
SQLAlchemy ORM models and Pydantic schemas for the corpus layer.

SQLAlchemy models: Source, Case, PhenomenonTag, Observation
Pydantic schema naming convention:
  *Create  — request body for POST
  *Update  — request body for PATCH (all fields optional)
  *Read    — response body (includes id, timestamps)
  *List    — lightweight list-view response (omits heavy fields like raw_text)
"""
from __future__ import annotations
import uuid
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import String, Text, Boolean, Integer, Float, Date, Enum, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    SourceType, DisciplinaryFrame, ProvenanceQuality,
    ObservationEpistemicStatus, ObservationSourceType, CasesIncluded,
    TagCategory,
    IngestionStatus, IngestionMethod,
    # Case enums
    ExtractionMethod, EventDatePrecision, SleepWakeState,
    PhysicalLocationType, AloneatOnset, PsychologicalStateType,
    AlteredStateDepth, EventDuration, PresenceAbsenceUnknown,
    ParalysisExtent, EntityCount, CorroborationLevelV2,
    AccountConsistency, ExperiencerSex, EducationLevel,
    MaritalStatus, Religiosity, PriorInterestLevel,
    HistoryPresence, MotivationalFactors, RepeatExperiencer,
    PsychometricPresence, PsychometricLevel, ClinicalLevel, ClinicalPresence,
)


# ── Association tables ────────────────────────────────────────────────────────

observation_tags = Table(
    "observation_tags",
    Base.metadata,
    Column("observation_id", UUID(as_uuid=True), ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
)


# ── SQLAlchemy ORM models ─────────────────────────────────────────────────────

class PhenomenonTag(Base, TimestampMixin):
    __tablename__ = "phenomenon_tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    category: Mapped[TagCategory] = mapped_column(
        Enum(TagCategory, name="tag_category_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    definition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aliases: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    parent_tag_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("phenomenon_tags.id", ondelete="SET NULL"), nullable=True
    )

    parent_tag: Mapped[Optional["PhenomenonTag"]] = relationship(
        "PhenomenonTag", remote_side="PhenomenonTag.id", back_populates="child_tags"
    )
    child_tags: Mapped[List["PhenomenonTag"]] = relationship("PhenomenonTag", back_populates="parent_tag")


class Source(Base, TimestampMixin):
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(1000), nullable=False)
    authors: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    publication_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    doi: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    disciplinary_frame: Mapped[Optional[DisciplinaryFrame]] = mapped_column(
        Enum(DisciplinaryFrame, name="disciplinary_frame_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    provenance_quality: Mapped[ProvenanceQuality] = mapped_column(
        Enum(ProvenanceQuality, name="provenance_quality_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="unknown",
    )
    ingestion_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_ref: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ingestion_status: Mapped[Optional[IngestionStatus]] = mapped_column(
        Enum(IngestionStatus, name="ingestion_status_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    ingestion_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    observations: Mapped[List["Observation"]] = relationship(
        "Observation", back_populates="source", cascade="all, delete-orphan"
    )
    cases: Mapped[List["Case"]] = relationship(
        "Case", back_populates="source", cascade="all, delete-orphan"
    )


class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_label: Mapped[str] = mapped_column(String(200), nullable=False)
    extraction_method: Mapped[Optional[ExtractionMethod]] = mapped_column(
        Enum(ExtractionMethod, name="extraction_method_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    extraction_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    extracted_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Section 2 — Context & Demographics
    experiencer_nationality: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    experiencer_ethnicity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    experiencer_age_at_event: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    experiencer_sex: Mapped[Optional[ExperiencerSex]] = mapped_column(
        Enum(ExperiencerSex, name="experiencer_sex_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    experiencer_gender: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    experiencer_occupation: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    education_level: Mapped[Optional[EducationLevel]] = mapped_column(
        Enum(EducationLevel, name="education_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    marital_status: Mapped[Optional[MaritalStatus]] = mapped_column(
        Enum(MaritalStatus, name="marital_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    religiosity: Mapped[Optional[Religiosity]] = mapped_column(
        Enum(Religiosity, name="religiosity_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )

    # Section 3 — Background History
    prior_ufo_interest: Mapped[Optional[PriorInterestLevel]] = mapped_column(
        Enum(PriorInterestLevel, name="prior_interest_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    prior_paranormal_belief: Mapped[Optional[PriorInterestLevel]] = mapped_column(
        Enum(PriorInterestLevel, name="prior_interest_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    cultural_media_exposure_to_aae: Mapped[Optional[PriorInterestLevel]] = mapped_column(
        Enum(PriorInterestLevel, name="prior_interest_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    childhood_trauma_history: Mapped[Optional[HistoryPresence]] = mapped_column(
        Enum(HistoryPresence, name="history_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    childhood_abuse_history: Mapped[Optional[HistoryPresence]] = mapped_column(
        Enum(HistoryPresence, name="history_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    surgical_history_present: Mapped[Optional[HistoryPresence]] = mapped_column(
        Enum(HistoryPresence, name="history_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    surgical_history_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    neuropsychiatric_history_present: Mapped[Optional[HistoryPresence]] = mapped_column(
        Enum(HistoryPresence, name="history_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    neuropsychiatric_history_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    substance_use_present: Mapped[Optional[HistoryPresence]] = mapped_column(
        Enum(HistoryPresence, name="history_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    substance_use_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motivational_factors_present: Mapped[Optional[MotivationalFactors]] = mapped_column(
        Enum(MotivationalFactors, name="motivational_factors_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    motivational_factors_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    repeat_experiencer: Mapped[Optional[RepeatExperiencer]] = mapped_column(
        Enum(RepeatExperiencer, name="repeat_experiencer_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )

    # Section 4 — Onset Conditions
    event_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    event_date_precision: Mapped[Optional[EventDatePrecision]] = mapped_column(
        Enum(EventDatePrecision, name="event_date_precision_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    event_time_of_day: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sleep_wake_state_at_onset: Mapped[Optional[SleepWakeState]] = mapped_column(
        Enum(SleepWakeState, name="sleep_wake_state_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    physical_location_type: Mapped[Optional[PhysicalLocationType]] = mapped_column(
        Enum(PhysicalLocationType, name="physical_location_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    physical_location_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alone_at_onset: Mapped[Optional[AloneatOnset]] = mapped_column(
        Enum(AloneatOnset, name="alone_at_onset_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    witness_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    environmental_stimuli_present: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    environmental_stimuli_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    psychological_state_preceding: Mapped[Optional[PsychologicalStateType]] = mapped_column(
        Enum(PsychologicalStateType, name="psychological_state_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    psychological_state_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    altered_state_at_onset: Mapped[Optional[AlteredStateDepth]] = mapped_column(
        Enum(AlteredStateDepth, name="altered_state_depth_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    altered_state_types: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Section 5 — Phenomenological Content
    duration_of_experience: Mapped[Optional[EventDuration]] = mapped_column(
        Enum(EventDuration, name="event_duration_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    missing_time_reported: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    missing_time_duration: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    paralysis_reported: Mapped[Optional[ParalysisExtent]] = mapped_column(
        Enum(ParalysisExtent, name="paralysis_extent_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    perceived_physical_transport: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    out_of_body_sensation: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    floating_sensation: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    tunnel_or_passage_sensation: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    entity_presence: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    entity_count: Mapped[Optional[EntityCount]] = mapped_column(
        Enum(EntityCount, name="entity_count_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    entity_types: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    entity_types_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entity_communication_present: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    entity_communication_modality: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    entity_communication_content_type: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    educational_or_mission_messaging: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    medical_procedure_motif: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    medical_procedure_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reproductive_or_sexual_motif: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    reproductive_motif_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    craft_or_vehicle_reported: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    craft_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    physical_environment_changes: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    physical_environment_changes_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_sequence_described: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    event_sequence_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    physiological_symptoms: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    physiological_symptoms_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emotional_valence_during_event: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    emotional_valence_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Section 6 — Physical & Physiological Evidence
    physical_marks_present: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    physical_marks_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    physical_marks_medically_examined: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    environmental_physical_evidence: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    environmental_physical_evidence_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    independent_corroboration_present: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    independent_corroboration_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    eeg_or_neurological_data_available: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    eeg_data_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    blood_or_toxicology_data_available: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    blood_data_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Section 7 — Psychological Profile
    fantasy_proneness_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    fantasy_proneness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fantasy_proneness_instrument: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    hypnotic_suggestibility_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    hypnotic_suggestibility_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hypnotic_suggestibility_instrument: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    boundary_thinness_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    boundary_thinness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    boundary_thinness_instrument: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    dissociation_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    dissociation_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dissociation_instrument: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ptsd_symptoms_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    ptsd_symptoms_present: Mapped[Optional[ClinicalLevel]] = mapped_column(
        Enum(ClinicalLevel, name="clinical_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    ptsd_instrument: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    psychopathology_screened: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    psychopathology_findings: Mapped[Optional[ClinicalPresence]] = mapped_column(
        Enum(ClinicalPresence, name="clinical_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    psychopathology_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    need_for_meaning_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    need_for_meaning_level: Mapped[Optional[PsychometricLevel]] = mapped_column(
        Enum(PsychometricLevel, name="psychometric_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    self_escape_motivation_assessed: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    self_escape_motivation_level: Mapped[Optional[PsychometricLevel]] = mapped_column(
        Enum(PsychometricLevel, name="psychometric_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )

    # Section 8 — Memory & Retrieval
    memory_retrieval_method: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    hypnosis_used: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    hypnotist_identity: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    investigator_or_therapist_involved: Mapped[Optional[PsychometricPresence]] = mapped_column(
        Enum(PsychometricPresence, name="psychometric_presence_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    investigator_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    account_consistency_over_time: Mapped[Optional[AccountConsistency]] = mapped_column(
        Enum(AccountConsistency, name="account_consistency_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    number_of_accounts_on_record: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Section 9 — Aftermath
    positive_transformation_reported: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    positive_transformation_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    negative_psychological_aftermath: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    negative_aftermath_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ongoing_contact_reported: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    ongoing_contact_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_worldview_reported: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    worldview_change_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sought_community_or_support: Mapped[Optional[PresenceAbsenceUnknown]] = mapped_column(
        Enum(PresenceAbsenceUnknown, name="presence_absence_unknown_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    community_type: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Section 10 — Corroboration Quality
    corroboration_level: Mapped[Optional[CorroborationLevelV2]] = mapped_column(
        Enum(CorroborationLevelV2, name="corroboration_level_v2_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    case_quality_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    source: Mapped["Source"] = relationship("Source", back_populates="cases")


class Observation(Base, TimestampMixin):
    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=True, index=True
    )
    observation_source_type: Mapped[ObservationSourceType] = mapped_column(
        Enum(ObservationSourceType, name="observation_source_type_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="literature",
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    epistemic_status: Mapped[ObservationEpistemicStatus] = mapped_column(
        Enum(ObservationEpistemicStatus, name="observation_epistemic_status_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="reported",
    )
    authored_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Corpus-derived fields (null when observation_source_type == literature)
    query_definition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    analysis_tool: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    corpus_snapshot_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    case_count_at_snapshot: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cases_included: Mapped[Optional[CasesIncluded]] = mapped_column(
        Enum(CasesIncluded, name="cases_included_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    case_filter_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    verbatim: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    page_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ingestion_method: Mapped[Optional[IngestionMethod]] = mapped_column(
        Enum(IngestionMethod, name="ingestion_method_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reviewed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_extracted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    source: Mapped[Optional["Source"]] = relationship("Source", back_populates="observations")
    tags: Mapped[List["PhenomenonTag"]] = relationship("PhenomenonTag", secondary=observation_tags)


# ── PhenomenonTag Pydantic schemas ────────────────────────────────────────────

class PhenomenonTagCreate(BaseModel):
    label: str
    category: TagCategory
    definition: Optional[str] = None
    aliases: Optional[List[str]] = None
    parent_tag_id: Optional[uuid.UUID] = None


class PhenomenonTagUpdate(BaseModel):
    label: Optional[str] = None
    category: Optional[TagCategory] = None
    definition: Optional[str] = None
    aliases: Optional[List[str]] = None
    parent_tag_id: Optional[uuid.UUID] = None


class PhenomenonTagRead(BaseModel):
    id: uuid.UUID
    label: str
    category: TagCategory
    definition: Optional[str] = None
    aliases: Optional[List[str]] = None
    parent_tag_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class PhenomenonTagTree(PhenomenonTagRead):
    child_tags: List[PhenomenonTagTree] = []


PhenomenonTagTree.model_rebuild()


# ── Source Pydantic schemas ───────────────────────────────────────────────────

class SourceCreate(BaseModel):
    source_type: SourceType
    title: str
    authors: Optional[List[str]] = None
    publication_date: Optional[str] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    disciplinary_frame: Optional[DisciplinaryFrame] = None
    provenance_quality: ProvenanceQuality = ProvenanceQuality.UNKNOWN
    notes: Optional[str] = None


class SourceUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    publication_date: Optional[str] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    disciplinary_frame: Optional[DisciplinaryFrame] = None
    provenance_quality: Optional[ProvenanceQuality] = None
    notes: Optional[str] = None


class SourceList(BaseModel):
    id: uuid.UUID
    source_type: SourceType
    title: str
    authors: Optional[List[str]] = None
    publication_date: Optional[str] = None
    disciplinary_frame: Optional[DisciplinaryFrame] = None
    provenance_quality: ProvenanceQuality
    ingestion_date: Optional[str] = None
    ingestion_status: Optional[IngestionStatus] = None
    observation_count: int = 0
    case_count: int = 0

    model_config = {"from_attributes": True}


class SourceRead(SourceList):
    url: Optional[str] = None
    doi: Optional[str] = None
    file_ref: Optional[str] = None
    notes: Optional[str] = None
    ingestion_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Observation Pydantic schemas ──────────────────────────────────────────────

class ObservationCreate(BaseModel):
    source_id: Optional[uuid.UUID] = None
    observation_source_type: ObservationSourceType = ObservationSourceType.LITERATURE
    content: str
    epistemic_status: ObservationEpistemicStatus = ObservationEpistemicStatus.REPORTED
    authored_by: Optional[str] = None
    query_definition: Optional[str] = None
    analysis_tool: Optional[str] = None
    corpus_snapshot_date: Optional[date] = None
    case_count_at_snapshot: Optional[int] = None
    cases_included: Optional[CasesIncluded] = None
    case_filter_description: Optional[str] = None
    verbatim: bool = False
    page_ref: Optional[str] = None
    tag_ids: List[uuid.UUID] = []
    ai_extracted: bool = False


class ObservationUpdate(BaseModel):
    source_id: Optional[uuid.UUID] = None
    observation_source_type: Optional[ObservationSourceType] = None
    content: Optional[str] = None
    epistemic_status: Optional[ObservationEpistemicStatus] = None
    authored_by: Optional[str] = None
    query_definition: Optional[str] = None
    analysis_tool: Optional[str] = None
    corpus_snapshot_date: Optional[date] = None
    case_count_at_snapshot: Optional[int] = None
    cases_included: Optional[CasesIncluded] = None
    case_filter_description: Optional[str] = None
    verbatim: Optional[bool] = None
    page_ref: Optional[str] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class ObservationRead(BaseModel):
    id: uuid.UUID
    source_id: Optional[uuid.UUID] = None
    source_title: Optional[str] = None
    observation_source_type: ObservationSourceType
    content: str
    epistemic_status: ObservationEpistemicStatus
    authored_by: Optional[str] = None
    query_definition: Optional[str] = None
    analysis_tool: Optional[str] = None
    corpus_snapshot_date: Optional[date] = None
    case_count_at_snapshot: Optional[int] = None
    cases_included: Optional[CasesIncluded] = None
    case_filter_description: Optional[str] = None
    staleness_flag: bool = False
    verbatim: bool
    page_ref: Optional[str] = None
    ingestion_method: Optional[IngestionMethod] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    ai_extracted: bool
    tags: List[PhenomenonTagRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ObservationReview(BaseModel):
    accepted: bool
    edited_content: Optional[str] = None
    epistemic_status: Optional[ObservationEpistemicStatus] = None
    tag_ids: Optional[List[uuid.UUID]] = None
