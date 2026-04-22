"""
SQLAlchemy ORM models and Pydantic schemas for the corpus layer.

SQLAlchemy models: Source, Account, PhenomenonTag, Claim
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
from pydantic import BaseModel

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    SourceType, DisciplinaryFrame, ProvenanceQuality,
    AccountContext, CorroborationLevel,
    EpistemicStatus, ClaimType,
    TagCategory,
    IngestionStatus, IngestionMethod,  # Phase 4
)


# ── Association tables ────────────────────────────────────────────────────────

claim_tags = Table(
    "claim_tags",
    Base.metadata,
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
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
    # Phase 4 additions
    ingestion_status: Mapped[Optional[IngestionStatus]] = mapped_column(
        Enum(IngestionStatus, name="ingestion_status_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    ingestion_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    claims: Mapped[List["Claim"]] = relationship("Claim", back_populates="source", cascade="all, delete-orphan")
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


class Claim(Base, TimestampMixin):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    verbatim: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    page_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timestamp_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    epistemic_status: Mapped[EpistemicStatus] = mapped_column(
        Enum(EpistemicStatus, name="epistemic_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="asserted"
    )
    claim_type: Mapped[ClaimType] = mapped_column(
        Enum(ClaimType, name="claim_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reviewed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_extracted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Phase 4: richer provenance than the bool above
    ingestion_method: Mapped[Optional[IngestionMethod]] = mapped_column(
        Enum(IngestionMethod, name="ingestion_method_enum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )

    source: Mapped["Source"] = relationship("Source", back_populates="claims")
    tags: Mapped[List["PhenomenonTag"]] = relationship("PhenomenonTag", secondary=claim_tags)


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
    account_date: Optional[str] = None          # ISO date or year, nullable intentional
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
    # Only used when source_type == 'account'
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
    ingestion_status: Optional[IngestionStatus] = None  # Phase 4
    claim_count: int = 0

    model_config = {"from_attributes": True}


class SourceRead(SourceList):
    """Full detail view."""
    url: Optional[str] = None
    doi: Optional[str] = None
    file_ref: Optional[str] = None
    notes: Optional[str] = None
    ingestion_error: Optional[str] = None  # Phase 4: surface pipeline errors
    account_detail: Optional[AccountDetailRead] = None
    created_at: datetime
    updated_at: datetime


# ── Claim ─────────────────────────────────────────────────────────────────────

class ClaimCreate(BaseModel):
    source_id: uuid.UUID
    claim_text: str
    verbatim: bool = False
    page_ref: Optional[str] = None
    timestamp_ref: Optional[str] = None
    epistemic_status: EpistemicStatus = EpistemicStatus.ASSERTED
    claim_type: ClaimType
    tag_ids: List[int] = []
    ai_extracted: bool = False


class ClaimUpdate(BaseModel):
    claim_text: Optional[str] = None
    verbatim: Optional[bool] = None
    page_ref: Optional[str] = None
    timestamp_ref: Optional[str] = None
    epistemic_status: Optional[EpistemicStatus] = None
    claim_type: Optional[ClaimType] = None
    tag_ids: Optional[List[int]] = None


class ClaimRead(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    source_title: Optional[str] = None
    claim_text: str
    verbatim: bool
    page_ref: Optional[str] = None
    timestamp_ref: Optional[str] = None
    epistemic_status: EpistemicStatus
    claim_type: ClaimType
    ai_extracted: bool
    ingestion_method: Optional[IngestionMethod] = None  # Phase 4
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    tags: List[PhenomenonTagRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Review queue ──────────────────────────────────────────────────────────────

class ClaimReview(BaseModel):
    """
    Used by the ingestion review queue (Chat 4/6).
    Reviewer can accept as-is, edit, or reject.
    rejected → claim is deleted.
    """
    accepted: bool
    edited_text: Optional[str] = None
    epistemic_status: Optional[EpistemicStatus] = None
    claim_type: Optional[ClaimType] = None
    tag_ids: Optional[List[int]] = None
