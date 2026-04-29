"""
SQLAlchemy ORM models and Pydantic schemas for the corpus layer.

SQLAlchemy models: Source, Account, PhenomenonTag, Observation
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

from sqlalchemy import String, Text, Boolean, Integer, Enum, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, model_validator

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    SourceType, DisciplinaryFrame, ProvenanceQuality,
    AccountContext, CorroborationLevel,
    ObservationEpistemicStatus, ContentType, SourceModality,
    EpistemicDistance, CollectionMethod, SampleSizeTier, SamplingMethod,
    TagCategory,
    IngestionStatus, IngestionMethod,
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
    category: Mapped[TagCategory] = mapped_column(Enum(TagCategory, name="tag_category_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False)
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
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType, name="source_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False)
    title: Mapped[str] = mapped_column(String(1000), nullable=False)
    authors: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    publication_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    doi: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    disciplinary_frame: Mapped[Optional[DisciplinaryFrame]] = mapped_column(
        Enum(DisciplinaryFrame, name="disciplinary_frame_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=True
    )
    provenance_quality: Mapped[ProvenanceQuality] = mapped_column(
        Enum(ProvenanceQuality, name="provenance_quality_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="unknown"
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

    observations: Mapped[List["Observation"]] = relationship("Observation", back_populates="source", cascade="all, delete-orphan")
    account_detail: Mapped[Optional["Account"]] = relationship(
        "Account", back_populates="source", uselist=False, cascade="all, delete-orphan"
    )


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True
    )
    account_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reporter_demographics: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    reporting_lag_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    context: Mapped[Optional[AccountContext]] = mapped_column(
        Enum(AccountContext, name="account_context_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=True
    )
    corroboration: Mapped[CorroborationLevel] = mapped_column(
        Enum(CorroborationLevel, name="corroboration_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="none"
    )
    hypnotic_regression: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    source: Mapped["Source"] = relationship("Source", back_populates="account_detail")


class Observation(Base, TimestampMixin):
    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    content_type: Mapped[ContentType] = mapped_column(
        Enum(ContentType, name="content_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    source_modality: Mapped[SourceModality] = mapped_column(
        Enum(SourceModality, name="source_modality_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    epistemic_distance: Mapped[EpistemicDistance] = mapped_column(
        Enum(EpistemicDistance, name="epistemic_distance_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    collection_method: Mapped[CollectionMethod] = mapped_column(
        Enum(CollectionMethod, name="collection_method_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    epistemic_status: Mapped[ObservationEpistemicStatus] = mapped_column(
        Enum(ObservationEpistemicStatus, name="observation_epistemic_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="reported",
    )
    corroboration_level: Mapped[CorroborationLevel] = mapped_column(
        Enum(CorroborationLevel, name="corroboration_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="none",
    )

    sample_n: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sample_size_tier: Mapped[Optional[SampleSizeTier]] = mapped_column(
        Enum(SampleSizeTier, name="sample_size_tier_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    sampling_method: Mapped[Optional[SamplingMethod]] = mapped_column(
        Enum(SamplingMethod, name="sampling_method_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    inclusion_criteria_documented: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

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

    source: Mapped["Source"] = relationship("Source", back_populates="observations")
    tags: Mapped[List["PhenomenonTag"]] = relationship("PhenomenonTag", secondary=observation_tags)


# ── PhenomenonTag ─────────────────────────────────────────────────────────────

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
    """Full hierarchy node — child_tags populated recursively."""
    child_tags: List[PhenomenonTagTree] = []


PhenomenonTagTree.model_rebuild()


# ── Account detail ─────────────────────────────────────────────────────────────

class AccountDetailCreate(BaseModel):
    account_date: Optional[str] = None
    reporter_demographics: Optional[dict] = None
    reporting_lag_days: Optional[int] = None
    context: Optional[AccountContext] = None
    corroboration: CorroborationLevel = CorroborationLevel.NONE
    hypnotic_regression: bool = False


class AccountDetailRead(BaseModel):
    account_date: Optional[str] = None
    reporter_demographics: Optional[dict] = None
    reporting_lag_days: Optional[int] = None
    context: Optional[AccountContext] = None
    corroboration: CorroborationLevel
    hypnotic_regression: bool

    model_config = {"from_attributes": True}


# ── Source ────────────────────────────────────────────────────────────────────

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
    account_detail: Optional[AccountDetailCreate] = None


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
    """Lightweight list view — no raw_text."""
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

    model_config = {"from_attributes": True}


class SourceRead(SourceList):
    """Full detail view."""
    url: Optional[str] = None
    doi: Optional[str] = None
    file_ref: Optional[str] = None
    notes: Optional[str] = None
    ingestion_error: Optional[str] = None
    account_detail: Optional[AccountDetailRead] = None
    created_at: datetime
    updated_at: datetime


# ── Observation ───────────────────────────────────────────────────────────────

class ObservationCreate(BaseModel):
    source_id: uuid.UUID
    content: str
    content_type: ContentType
    source_modality: SourceModality
    epistemic_distance: EpistemicDistance
    collection_method: CollectionMethod
    epistemic_status: ObservationEpistemicStatus = ObservationEpistemicStatus.REPORTED
    corroboration_level: CorroborationLevel = CorroborationLevel.NONE
    sample_n: Optional[int] = None
    sample_size_tier: Optional[SampleSizeTier] = None
    sampling_method: Optional[SamplingMethod] = None
    inclusion_criteria_documented: Optional[bool] = None
    verbatim: bool = False
    page_ref: Optional[str] = None
    tag_ids: List[uuid.UUID] = []
    ai_extracted: bool = False

    @model_validator(mode="after")
    def check_aggregate_fields(self) -> "ObservationCreate":
        agg = [self.sample_n, self.sample_size_tier, self.sampling_method, self.inclusion_criteria_documented]
        if any(f is not None for f in agg) and self.epistemic_distance != EpistemicDistance.AGGREGATED:
            raise ValueError(
                "Aggregate fields (sample_n, sample_size_tier, sampling_method, "
                "inclusion_criteria_documented) may only be set when epistemic_distance is 'aggregated'."
            )
        return self


class ObservationUpdate(BaseModel):
    content: Optional[str] = None
    content_type: Optional[ContentType] = None
    source_modality: Optional[SourceModality] = None
    epistemic_distance: Optional[EpistemicDistance] = None
    collection_method: Optional[CollectionMethod] = None
    epistemic_status: Optional[ObservationEpistemicStatus] = None
    corroboration_level: Optional[CorroborationLevel] = None
    sample_n: Optional[int] = None
    sample_size_tier: Optional[SampleSizeTier] = None
    sampling_method: Optional[SamplingMethod] = None
    inclusion_criteria_documented: Optional[bool] = None
    verbatim: Optional[bool] = None
    page_ref: Optional[str] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class ObservationRead(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    source_title: Optional[str] = None
    content: str
    content_type: ContentType
    source_modality: SourceModality
    epistemic_distance: EpistemicDistance
    collection_method: CollectionMethod
    epistemic_status: ObservationEpistemicStatus
    corroboration_level: CorroborationLevel
    sample_n: Optional[int] = None
    sample_size_tier: Optional[SampleSizeTier] = None
    sampling_method: Optional[SamplingMethod] = None
    inclusion_criteria_documented: Optional[bool] = None
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


# ── Review queue ──────────────────────────────────────────────────────────────

class ObservationReview(BaseModel):
    """
    Used by the ingestion review queue.
    Reviewer can accept as-is, edit, or reject.
    rejected → observation is deleted.
    """
    accepted: bool
    edited_content: Optional[str] = None
    epistemic_status: Optional[ObservationEpistemicStatus] = None
    content_type: Optional[ContentType] = None
    tag_ids: Optional[List[uuid.UUID]] = None
