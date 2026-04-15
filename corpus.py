"""
Corpus layer models: Source, Account (extends Source)
Claim layer models: PhenomenonTag, Claim
"""

import uuid
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, Integer, Float,
    ForeignKey, Enum as SAEnum, ARRAY, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    SourceType, DisciplinaryFrame, ProvenanceQuality,
    AccountContext, CorroborationLevel,
    EpistemicStatus, ClaimType,
    TagCategory,
)


# ---------------------------------------------------------------------------
# Association tables (many-to-many)
# ---------------------------------------------------------------------------

from sqlalchemy import Table, Column

# Claim <-> PhenomenonTag
claim_tags = Table(
    "claim_tags",
    Base.metadata,
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("phenomenon_tags.id", ondelete="CASCADE"), primary_key=True),
)


# ---------------------------------------------------------------------------
# Source (corpus layer)
# ---------------------------------------------------------------------------

class Source(Base, TimestampMixin):
    """
    A source document: paper, book, interview, first-person account, etc.
    Raw text is stored in DB to enable re-extraction as prompts improve.
    """
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_type: Mapped[SourceType] = mapped_column(
        SAEnum(SourceType, name="source_type_enum"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(1000), nullable=False)
    authors: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)  # ["Last, First", ...]
    publication_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # ISO date or year
    url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    doi: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    disciplinary_frame: Mapped[Optional[DisciplinaryFrame]] = mapped_column(
        SAEnum(DisciplinaryFrame, name="disciplinary_frame_enum"), nullable=True
    )
    provenance_quality: Mapped[ProvenanceQuality] = mapped_column(
        SAEnum(ProvenanceQuality, name="provenance_quality_enum"),
        nullable=False,
        default=ProvenanceQuality.UNKNOWN,
    )

    ingestion_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_ref: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)  # Filesystem path
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Polymorphic identity for Account subtype
    __mapper_args__ = {
        "polymorphic_identity": "source",
        "polymorphic_on": "source_type",
    }

    # Relationships
    claims: Mapped[List["Claim"]] = relationship(
        "Claim", back_populates="source", cascade="all, delete-orphan"
    )
    epistemic_notes: Mapped[List["EpistemicNote"]] = relationship(
        "EpistemicNote",
        primaryjoin="and_(EpistemicNote.attached_to_type == 'source', "
                    "foreign(EpistemicNote.attached_to_id) == Source.id)",
        viewonly=True,
    )

    def __repr__(self) -> str:
        return f"<Source id={self.id} type={self.source_type} title={self.title[:40]!r}>"


class Account(Source):
    """
    Extension of Source for first-person abduction accounts.
    Carries experiencer-specific metadata that doesn't apply to papers/books.
    """
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True
    )

    # When the reported event occurred (distinct from reporting date)
    account_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Reporter demographics (JSONB for flexibility — may expand over time)
    reporter_demographics: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )  # {"age": 34, "location": "Ohio, US", "background": "nurse"}

    # Gap between event and account (in days; null if unknown)
    reporting_lag_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    context: Mapped[Optional[AccountContext]] = mapped_column(
        SAEnum(AccountContext, name="account_context_enum"), nullable=True
    )
    corroboration: Mapped[CorroborationLevel] = mapped_column(
        SAEnum(CorroborationLevel, name="corroboration_level_enum"),
        nullable=False,
        default=CorroborationLevel.NONE,
    )

    # Was this account collected under hypnosis?
    hypnotic_regression: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __mapper_args__ = {
        "polymorphic_identity": "account",
    }

    def __repr__(self) -> str:
        return f"<Account id={self.id} date={self.account_date} context={self.context}>"


# ---------------------------------------------------------------------------
# PhenomenonTag (controlled vocabulary, hierarchical)
# ---------------------------------------------------------------------------

class PhenomenonTag(Base, TimestampMixin):
    """
    Controlled vocabulary for tagging claims at the phenomenon level.
    Self-referential hierarchy: entity_contact → entity_communication → entity_medical_procedure
    """
    __tablename__ = "phenomenon_tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    category: Mapped[TagCategory] = mapped_column(
        SAEnum(TagCategory, name="tag_category_enum"), nullable=False
    )
    definition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aliases: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)  # ["missing time", "time loss"]

    # Self-referential hierarchy
    parent_tag_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("phenomenon_tags.id", ondelete="SET NULL"), nullable=True
    )
    parent_tag: Mapped[Optional["PhenomenonTag"]] = relationship(
        "PhenomenonTag", remote_side="PhenomenonTag.id", back_populates="child_tags"
    )
    child_tags: Mapped[List["PhenomenonTag"]] = relationship(
        "PhenomenonTag", back_populates="parent_tag"
    )

    # Claims tagged with this
    claims: Mapped[List["Claim"]] = relationship(
        "Claim", secondary=claim_tags, back_populates="tags"
    )

    def __repr__(self) -> str:
        return f"<PhenomenonTag {self.label!r} ({self.category})>"


# ---------------------------------------------------------------------------
# Claim (middle tier — the epistemic atom)
# ---------------------------------------------------------------------------

class Claim(Base, TimestampMixin):
    """
    An atomic assertion extracted from a source.

    This is the epistemic atom of the system. Every claim:
    - Is attributed to exactly one source
    - Carries its own epistemic status
    - Is tagged at claim level (not just source level)
    - Is traceable to a page/timestamp in the original

    Do NOT collapse claims into sources. The claim layer is the
    foundation of everything in the synthesis layer.
    """
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False
    )

    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    verbatim: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Location in source
    page_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timestamp_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # For audio/video

    epistemic_status: Mapped[EpistemicStatus] = mapped_column(
        SAEnum(EpistemicStatus, name="epistemic_status_enum"),
        nullable=False,
        default=EpistemicStatus.ASSERTED,
    )
    claim_type: Mapped[ClaimType] = mapped_column(
        SAEnum(ClaimType, name="claim_type_enum"), nullable=False
    )

    # Reviewer attribution (populated after human review in ingestion queue)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reviewed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Was this extracted by AI (vs. manually entered)?
    ai_extracted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="claims")
    tags: Mapped[List["PhenomenonTag"]] = relationship(
        "PhenomenonTag", secondary=claim_tags, back_populates="claims"
    )

    def __repr__(self) -> str:
        return f"<Claim id={self.id} status={self.epistemic_status} text={self.claim_text[:60]!r}>"
