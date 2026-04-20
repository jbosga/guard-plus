"""
SQLAlchemy ORM models and Pydantic schemas for the synthesis layer.

SQLAlchemy models: Concept, ConceptRelationship, Hypothesis, EpistemicNote
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Text, Enum, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, model_validator

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    EpistemicStatus,
    ConceptType,
    RelationshipType, RelationshipStrength,
    HypothesisFramework, AssumedOntology, HypothesisStatus,
    EpistemicNoteType, AttachableEntityType,
)
from app.models.corpus import Claim, ClaimRead


# ── Association tables ────────────────────────────────────────────────────────

concept_supporting_claims = Table(
    "concept_supporting_claims",
    Base.metadata,
    Column("concept_id", UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

relationship_supporting_claims = Table(
    "relationship_supporting_claims",
    Base.metadata,
    Column("relationship_id", UUID(as_uuid=True), ForeignKey("concept_relationships.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

hypothesis_scope_claims = Table(
    "hypothesis_scope_claims",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

hypothesis_supporting_claims = Table(
    "hypothesis_supporting_claims",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

hypothesis_anomalous_claims = Table(
    "hypothesis_anomalous_claims",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

hypothesis_competitors = Table(
    "hypothesis_competitors",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("competitor_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
)


# ── SQLAlchemy ORM models ─────────────────────────────────────────────────────

class Concept(Base, TimestampMixin):
    __tablename__ = "concepts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    concept_type: Mapped[ConceptType] = mapped_column(
        Enum(ConceptType, name="concept_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    epistemic_status: Mapped[EpistemicStatus] = mapped_column(
        Enum(EpistemicStatus, name="epistemic_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="asserted"
    )

    supporting_claims: Mapped[List[Claim]] = relationship("Claim", secondary=concept_supporting_claims)


class ConceptRelationship(Base, TimestampMixin):
    __tablename__ = "concept_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType, name="relationship_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True
    )
    strength: Mapped[Optional[RelationshipStrength]] = mapped_column(
        Enum(RelationshipStrength, name="relationship_strength_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    supporting_claims: Mapped[List[Claim]] = relationship("Claim", secondary=relationship_supporting_claims)


class Hypothesis(Base, TimestampMixin):
    __tablename__ = "hypotheses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    framework: Mapped[HypothesisFramework] = mapped_column(
        Enum(HypothesisFramework, name="hypothesis_framework_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True
    )
    assumed_ontologies: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    required_assumptions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    status: Mapped[HypothesisStatus] = mapped_column(
        Enum(HypothesisStatus, name="hypothesis_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="active", index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    scope_claims: Mapped[List[Claim]] = relationship("Claim", secondary=hypothesis_scope_claims)
    supporting_claims: Mapped[List[Claim]] = relationship("Claim", secondary=hypothesis_supporting_claims)
    anomalous_claims: Mapped[List[Claim]] = relationship("Claim", secondary=hypothesis_anomalous_claims)
    competing_hypotheses: Mapped[List["Hypothesis"]] = relationship(
        "Hypothesis",
        secondary=hypothesis_competitors,
        primaryjoin=lambda: Hypothesis.id == hypothesis_competitors.c.hypothesis_id,
        secondaryjoin=lambda: Hypothesis.id == hypothesis_competitors.c.competitor_id,
    )


class EpistemicNote(Base, TimestampMixin):
    __tablename__ = "epistemic_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attached_to_type: Mapped[AttachableEntityType] = mapped_column(
        Enum(AttachableEntityType, name="attachable_entity_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    attached_to_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    note_type: Mapped[EpistemicNoteType] = mapped_column(
        Enum(EpistemicNoteType, name="epistemic_note_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)


# ── Concept ───────────────────────────────────────────────────────────────────

class ConceptCreate(BaseModel):
    label: str
    concept_type: ConceptType
    description: Optional[str] = None
    epistemic_status: EpistemicStatus = EpistemicStatus.SPECULATIVE
    supporting_claim_ids: List[int] = []


class ConceptUpdate(BaseModel):
    label: Optional[str] = None
    concept_type: Optional[ConceptType] = None
    description: Optional[str] = None
    epistemic_status: Optional[EpistemicStatus] = None
    supporting_claim_ids: Optional[List[int]] = None


class ConceptRead(BaseModel):
    id: int
    label: str
    concept_type: ConceptType
    description: Optional[str] = None
    epistemic_status: EpistemicStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── ConceptRelationship ───────────────────────────────────────────────────────

class ConceptRelationshipCreate(BaseModel):
    source_concept_id: int
    target_concept_id: int
    relationship_type: RelationshipType
    strength: RelationshipStrength = RelationshipStrength.MODERATE
    notes: Optional[str] = None
    supporting_claim_ids: List[int] = []


class ConceptRelationshipUpdate(BaseModel):
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[RelationshipStrength] = None
    notes: Optional[str] = None
    supporting_claim_ids: Optional[List[int]] = None


class ConceptRelationshipRead(BaseModel):
    id: int
    source_concept_id: int
    target_concept_id: int
    relationship_type: RelationshipType
    strength: Optional[RelationshipStrength] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Hypothesis ────────────────────────────────────────────────────────────────

class HypothesisCreate(BaseModel):
    label: str
    description: Optional[str] = None
    framework: HypothesisFramework
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    required_assumptions: Optional[List[str]] = None
    status: HypothesisStatus = HypothesisStatus.ACTIVE
    notes: Optional[str] = None
    scope_claim_ids: List[int] = []
    supporting_claim_ids: List[int] = []
    anomalous_claim_ids: List[int] = []          # structurally required; enforced below
    competing_hypothesis_ids: List[int] = []

    @model_validator(mode="after")
    def anomalous_claims_warning(self) -> "HypothesisCreate":
        # Soft enforcement: flag if empty but don't hard-reject.
        # Early-stage hypotheses may not yet have anomalous claims identified.
        # The API response will include a warning header (see route).
        self._anomalous_empty = len(self.anomalous_claim_ids) == 0
        return self


class HypothesisUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    framework: Optional[HypothesisFramework] = None
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    required_assumptions: Optional[List[str]] = None
    status: Optional[HypothesisStatus] = None
    notes: Optional[str] = None
    scope_claim_ids: Optional[List[int]] = None
    supporting_claim_ids: Optional[List[int]] = None
    anomalous_claim_ids: Optional[List[int]] = None
    competing_hypothesis_ids: Optional[List[int]] = None


class HypothesisList(BaseModel):
    """Lightweight list view with counts instead of full claim lists."""
    id: int
    label: str
    framework: HypothesisFramework
    status: HypothesisStatus
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    supporting_claim_count: int = 0
    anomalous_claim_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HypothesisRead(HypothesisList):
    """Full detail view — includes all claim lists."""
    description: Optional[str] = None
    required_assumptions: Optional[List[str]] = None
    notes: Optional[str] = None
    scope_claims: List[ClaimRead] = []
    supporting_claims: List[ClaimRead] = []
    anomalous_claims: List[ClaimRead] = []       # surfaced prominently in UI


# ── EpistemicNote ─────────────────────────────────────────────────────────────

class EpistemicNoteCreate(BaseModel):
    attached_to_type: AttachableEntityType
    attached_to_id: int
    note_type: EpistemicNoteType
    text: str


class EpistemicNoteRead(BaseModel):
    id: int
    attached_to_type: AttachableEntityType
    attached_to_id: int
    note_type: EpistemicNoteType
    text: str
    author: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
