"""
SQLAlchemy ORM models and Pydantic schemas for the synthesis layer.

SQLAlchemy models: Concept, ConceptRelationship, Hypothesis, TheoreticalFramework, EpistemicNote
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
    HypothesisFramework, AssumedOntology,
    HypothesisType, HypothesisStatus, ConfidenceLevel,
    FrameworkStatus,
    EpistemicNoteType, AttachableEntityType,
)
from app.models.corpus import Observation, ObservationRead


# ── Association tables ────────────────────────────────────────────────────────

hypothesis_supporting_observations = Table(
    "hypothesis_supporting_observations",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("observation_id", UUID(as_uuid=True), ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
)

hypothesis_anomalous_observations = Table(
    "hypothesis_anomalous_observations",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("observation_id", UUID(as_uuid=True), ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
)

hypothesis_competitors = Table(
    "hypothesis_competitors",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("competitor_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
)

framework_core_hypotheses = Table(
    "framework_core_hypotheses",
    Base.metadata,
    Column("framework_id", UUID(as_uuid=True), ForeignKey("theoretical_frameworks.id", ondelete="CASCADE"), primary_key=True),
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
)

framework_anomalous_hypotheses = Table(
    "framework_anomalous_hypotheses",
    Base.metadata,
    Column("framework_id", UUID(as_uuid=True), ForeignKey("theoretical_frameworks.id", ondelete="CASCADE"), primary_key=True),
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
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


class Hypothesis(Base, TimestampMixin):
    __tablename__ = "hypotheses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    hypothesis_type: Mapped[HypothesisType] = mapped_column(
        Enum(HypothesisType, name="hypothesis_type_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    falsification_condition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    framework: Mapped[HypothesisFramework] = mapped_column(
        Enum(HypothesisFramework, name="hypothesis_framework_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, index=True,
    )
    assumed_ontologies: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    status: Mapped[HypothesisStatus] = mapped_column(
        Enum(HypothesisStatus, name="hypothesis_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="active", index=True,
    )
    confidence_level: Mapped[ConfidenceLevel] = mapped_column(
        Enum(ConfidenceLevel, name="confidence_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="speculative",
    )

    parent_hypothesis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hypotheses.id"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    supporting_observations: Mapped[List[Observation]] = relationship(
        "Observation", secondary=hypothesis_supporting_observations
    )
    anomalous_observations: Mapped[List[Observation]] = relationship(
        "Observation", secondary=hypothesis_anomalous_observations
    )
    competing_hypotheses: Mapped[List["Hypothesis"]] = relationship(
        "Hypothesis",
        secondary=hypothesis_competitors,
        primaryjoin=lambda: Hypothesis.id == hypothesis_competitors.c.hypothesis_id,
        secondaryjoin=lambda: Hypothesis.id == hypothesis_competitors.c.competitor_id,
    )
    parent: Mapped[Optional["Hypothesis"]] = relationship(
        "Hypothesis",
        foreign_keys=[parent_hypothesis_id],
        back_populates="children",
        remote_side=[id],
    )
    children: Mapped[List["Hypothesis"]] = relationship(
        "Hypothesis",
        foreign_keys=[parent_hypothesis_id],
        back_populates="parent",
    )


class TheoreticalFramework(Base, TimestampMixin):
    __tablename__ = "theoretical_frameworks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    framework_type: Mapped[HypothesisFramework] = mapped_column(
        Enum(HypothesisFramework, name="hypothesis_framework_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    assumed_ontologies: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    status: Mapped[FrameworkStatus] = mapped_column(
        Enum(FrameworkStatus, name="framework_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="active",
    )
    confidence_level: Mapped[ConfidenceLevel] = mapped_column(
        Enum(ConfidenceLevel, name="confidence_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False, server_default="speculative",
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    core_hypotheses: Mapped[List[Hypothesis]] = relationship(
        "Hypothesis", secondary=framework_core_hypotheses
    )
    anomalous_hypotheses: Mapped[List[Hypothesis]] = relationship(
        "Hypothesis", secondary=framework_anomalous_hypotheses
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


class ConceptUpdate(BaseModel):
    label: Optional[str] = None
    concept_type: Optional[ConceptType] = None
    description: Optional[str] = None
    epistemic_status: Optional[EpistemicStatus] = None


class ConceptRead(BaseModel):
    id: uuid.UUID
    label: str
    concept_type: ConceptType
    description: Optional[str] = None
    epistemic_status: EpistemicStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── ConceptRelationship ───────────────────────────────────────────────────────

class ConceptRelationshipCreate(BaseModel):
    source_concept_id: uuid.UUID
    target_concept_id: uuid.UUID
    relationship_type: RelationshipType
    strength: RelationshipStrength = RelationshipStrength.MODERATE
    notes: Optional[str] = None


class ConceptRelationshipUpdate(BaseModel):
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[RelationshipStrength] = None
    notes: Optional[str] = None


class ConceptRelationshipRead(BaseModel):
    id: uuid.UUID
    source_concept_id: uuid.UUID
    target_concept_id: uuid.UUID
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
    hypothesis_type: HypothesisType
    falsification_condition: Optional[str] = None
    scope: Optional[str] = None
    framework: HypothesisFramework
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    status: HypothesisStatus = HypothesisStatus.ACTIVE
    confidence_level: ConfidenceLevel = ConfidenceLevel.SPECULATIVE
    parent_hypothesis_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    supporting_observation_ids: List[uuid.UUID] = []
    anomalous_observation_ids: List[uuid.UUID] = []
    competing_hypothesis_ids: List[uuid.UUID] = []

    @model_validator(mode="after")
    def check_warnings(self) -> "HypothesisCreate":
        self._anomalous_empty = len(self.anomalous_observation_ids) == 0
        self._falsification_empty = not self.falsification_condition
        return self


class HypothesisUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    hypothesis_type: Optional[HypothesisType] = None
    falsification_condition: Optional[str] = None
    scope: Optional[str] = None
    framework: Optional[HypothesisFramework] = None
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    status: Optional[HypothesisStatus] = None
    confidence_level: Optional[ConfidenceLevel] = None
    parent_hypothesis_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    supporting_observation_ids: Optional[List[uuid.UUID]] = None
    anomalous_observation_ids: Optional[List[uuid.UUID]] = None
    competing_hypothesis_ids: Optional[List[uuid.UUID]] = None


class HypothesisList(BaseModel):
    """Lightweight list view with counts instead of full observation lists."""
    id: uuid.UUID
    label: str
    hypothesis_type: HypothesisType
    framework: HypothesisFramework
    status: HypothesisStatus
    confidence_level: ConfidenceLevel
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    supporting_observation_count: int = 0
    anomalous_observation_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HypothesisRead(HypothesisList):
    """Full detail view — includes all observation lists."""
    description: Optional[str] = None
    falsification_condition: Optional[str] = None
    scope: Optional[str] = None
    parent_hypothesis_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    supporting_observations: List[ObservationRead] = []
    anomalous_observations: List[ObservationRead] = []
    competing_hypotheses: List[HypothesisList] = []


# ── TheoreticalFramework ──────────────────────────────────────────────────────

class TheoreticalFrameworkCreate(BaseModel):
    label: str
    description: Optional[str] = None
    framework_type: HypothesisFramework
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    status: FrameworkStatus = FrameworkStatus.ACTIVE
    confidence_level: ConfidenceLevel = ConfidenceLevel.SPECULATIVE
    notes: Optional[str] = None
    core_hypothesis_ids: List[uuid.UUID] = []
    anomalous_hypothesis_ids: List[uuid.UUID] = []

    @model_validator(mode="after")
    def check_warnings(self) -> "TheoreticalFrameworkCreate":
        self._anomalous_empty = len(self.anomalous_hypothesis_ids) == 0
        return self


class TheoreticalFrameworkUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    framework_type: Optional[HypothesisFramework] = None
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    status: Optional[FrameworkStatus] = None
    confidence_level: Optional[ConfidenceLevel] = None
    notes: Optional[str] = None
    core_hypothesis_ids: Optional[List[uuid.UUID]] = None
    anomalous_hypothesis_ids: Optional[List[uuid.UUID]] = None


class TheoreticalFrameworkList(BaseModel):
    """Lightweight list view."""
    id: uuid.UUID
    label: str
    framework_type: HypothesisFramework
    status: FrameworkStatus
    confidence_level: ConfidenceLevel
    assumed_ontologies: Optional[List[AssumedOntology]] = None
    core_hypothesis_count: int = 0
    anomalous_hypothesis_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TheoreticalFrameworkRead(TheoreticalFrameworkList):
    """Full detail view."""
    description: Optional[str] = None
    notes: Optional[str] = None
    core_hypotheses: List[HypothesisList] = []
    anomalous_hypotheses: List[HypothesisList] = []


# ── EpistemicNote ─────────────────────────────────────────────────────────────

class EpistemicNoteCreate(BaseModel):
    attached_to_type: AttachableEntityType
    attached_to_id: uuid.UUID
    note_type: EpistemicNoteType
    text: str


class EpistemicNoteRead(BaseModel):
    id: uuid.UUID
    attached_to_type: AttachableEntityType
    attached_to_id: uuid.UUID
    note_type: EpistemicNoteType
    text: str
    author: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
