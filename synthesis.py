"""
Synthesis layer models:
  - Concept (knowledge graph node)
  - ConceptRelationship (graph edge, includes anomalous_given type)
  - Hypothesis (with structurally required anomalous_claims)
  - EpistemicNote (global annotation layer)
"""

import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import (
    String, Text, ForeignKey,
    Enum as SAEnum, Table, Column,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    EpistemicStatus,
    ConceptType,
    RelationshipType, RelationshipStrength,
    HypothesisFramework, AssumedOntology, HypothesisStatus,
    EpistemicNoteType, AttachableEntityType,
)


# ---------------------------------------------------------------------------
# Association tables
# ---------------------------------------------------------------------------

# Concept <-> supporting Claims
concept_supporting_claims = Table(
    "concept_supporting_claims",
    Base.metadata,
    Column("concept_id", UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

# ConceptRelationship <-> supporting Claims
relationship_supporting_claims = Table(
    "relationship_supporting_claims",
    Base.metadata,
    Column("relationship_id", UUID(as_uuid=True), ForeignKey("concept_relationships.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

# Hypothesis <-> scope Claims (what it purports to explain)
hypothesis_scope_claims = Table(
    "hypothesis_scope_claims",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

# Hypothesis <-> supporting Claims (evidence in favor)
hypothesis_supporting_claims = Table(
    "hypothesis_supporting_claims",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

# Hypothesis <-> anomalous Claims (evidence it cannot explain — REQUIRED)
hypothesis_anomalous_claims = Table(
    "hypothesis_anomalous_claims",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("claim_id", UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
)

# Hypothesis <-> competing Hypotheses (self-referential many-to-many)
hypothesis_competitors = Table(
    "hypothesis_competitors",
    Base.metadata,
    Column("hypothesis_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
    Column("competitor_id", UUID(as_uuid=True), ForeignKey("hypotheses.id", ondelete="CASCADE"), primary_key=True),
)


# ---------------------------------------------------------------------------
# Concept (knowledge graph node)
# ---------------------------------------------------------------------------

class Concept(Base, TimestampMixin):
    """
    A node in the knowledge graph. May represent a phenomenon (missing time),
    a proposed mechanism (REM intrusion), an entity type, a location, etc.

    Concepts are built from claims — the supporting_claims relationship
    maintains full epistemic traceability to the source layer.
    """
    __tablename__ = "concepts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    label: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    concept_type: Mapped[ConceptType] = mapped_column(
        SAEnum(ConceptType, name="concept_type_enum"), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    epistemic_status: Mapped[EpistemicStatus] = mapped_column(
        SAEnum(EpistemicStatus, name="epistemic_status_enum"),
        nullable=False,
        default=EpistemicStatus.ASSERTED,
    )

    # Traceability to claim layer
    supporting_claims: Mapped[list] = relationship(
        "Claim",
        secondary=concept_supporting_claims,
        backref="concepts",
    )

    # Graph edges (outgoing)
    outgoing_relationships: Mapped[List["ConceptRelationship"]] = relationship(
        "ConceptRelationship",
        foreign_keys="ConceptRelationship.source_concept_id",
        back_populates="source_concept",
        cascade="all, delete-orphan",
    )
    # Graph edges (incoming)
    incoming_relationships: Mapped[List["ConceptRelationship"]] = relationship(
        "ConceptRelationship",
        foreign_keys="ConceptRelationship.target_concept_id",
        back_populates="target_concept",
    )

    def __repr__(self) -> str:
        return f"<Concept {self.label!r} ({self.concept_type})>"


# ---------------------------------------------------------------------------
# ConceptRelationship (knowledge graph edge)
# ---------------------------------------------------------------------------

class ConceptRelationship(Base, TimestampMixin):
    """
    A directed edge in the knowledge graph.

    The anomalous_given relationship type is the key mechanism for
    surfacing unexplained tensions: "phenomenon X is anomalous given
    framework Y." These edges are treated as signals, not noise.
    """
    __tablename__ = "concept_relationships"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    target_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    relationship_type: Mapped[RelationshipType] = mapped_column(
        SAEnum(RelationshipType, name="relationship_type_enum"), nullable=False
    )
    strength: Mapped[Optional[RelationshipStrength]] = mapped_column(
        SAEnum(RelationshipStrength, name="relationship_strength_enum"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    source_concept: Mapped["Concept"] = relationship(
        "Concept", foreign_keys=[source_concept_id], back_populates="outgoing_relationships"
    )
    target_concept: Mapped["Concept"] = relationship(
        "Concept", foreign_keys=[target_concept_id], back_populates="incoming_relationships"
    )
    supporting_claims: Mapped[list] = relationship(
        "Claim",
        secondary=relationship_supporting_claims,
        backref="relationship_evidence",
    )

    def __repr__(self) -> str:
        return (
            f"<ConceptRelationship {self.source_concept_id} "
            f"--[{self.relationship_type}]--> {self.target_concept_id}>"
        )


# ---------------------------------------------------------------------------
# Hypothesis (synthesis workspace)
# ---------------------------------------------------------------------------

class Hypothesis(Base, TimestampMixin):
    """
    A candidate explanation for some or all of the phenomenon space.

    Key design decisions:
    - assumed_ontology[] makes paradigm assumptions explicit rather than
      encoding them invisibly into the schema
    - anomalous_claims[] is REQUIRED by convention (enforced in API layer):
      every hypothesis must declare what it fails to explain. This is
      the primary structural anti-confirmation-bias mechanism.
    - required_assumptions stored as JSONB list for flexibility
    """
    __tablename__ = "hypotheses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    framework: Mapped[HypothesisFramework] = mapped_column(
        SAEnum(HypothesisFramework, name="hypothesis_framework_enum"), nullable=False
    )

    # Makes ontological assumptions explicit — not encoded invisibly
    assumed_ontologies: Mapped[Optional[list]] = mapped_column(
        JSONB, nullable=True
    )  # List of AssumedOntology values

    # Free-text list of required assumptions (e.g. "sleep paralysis covers all cases")
    required_assumptions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    status: Mapped[HypothesisStatus] = mapped_column(
        SAEnum(HypothesisStatus, name="hypothesis_status_enum"),
        nullable=False,
        default=HypothesisStatus.ACTIVE,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # What this hypothesis purports to explain
    scope_claims: Mapped[list] = relationship(
        "Claim",
        secondary=hypothesis_scope_claims,
        backref="hypothesis_scope",
    )

    # Evidence in favor
    supporting_claims: Mapped[list] = relationship(
        "Claim",
        secondary=hypothesis_supporting_claims,
        backref="hypothesis_support",
    )

    # Evidence it cannot explain — REQUIRED (enforced in API validation)
    # A hypothesis with no anomalous_claims is epistemically incomplete.
    anomalous_claims: Mapped[list] = relationship(
        "Claim",
        secondary=hypothesis_anomalous_claims,
        backref="hypothesis_anomalous",
    )

    # Competing hypotheses (symmetric many-to-many)
    competitors: Mapped[List["Hypothesis"]] = relationship(
        "Hypothesis",
        secondary=hypothesis_competitors,
        primaryjoin="Hypothesis.id == hypothesis_competitors.c.hypothesis_id",
        secondaryjoin="Hypothesis.id == hypothesis_competitors.c.competitor_id",
    )

    def __repr__(self) -> str:
        return f"<Hypothesis {self.label!r} [{self.framework}] status={self.status}>"


# ---------------------------------------------------------------------------
# EpistemicNote (global annotation layer)
# ---------------------------------------------------------------------------

class EpistemicNote(Base, TimestampMixin):
    """
    An annotation that can be attached to any first-class entity.

    Kept as a single polymorphic table (attached_to_type + attached_to_id)
    rather than separate join tables per entity. This means no FK constraint
    enforcement at DB level — integrity is enforced at the application layer.

    Trade-off is accepted: flexibility and simplicity outweigh FK enforcement
    for an annotation layer that is inherently secondary to primary records.
    """
    __tablename__ = "epistemic_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Polymorphic attachment
    attached_to_type: Mapped[AttachableEntityType] = mapped_column(
        SAEnum(AttachableEntityType, name="attachable_entity_type_enum"), nullable=False
    )
    attached_to_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    note_type: Mapped[EpistemicNoteType] = mapped_column(
        SAEnum(EpistemicNoteType, name="epistemic_note_type_enum"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)

    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<EpistemicNote type={self.note_type} "
            f"on {self.attached_to_type}:{self.attached_to_id}>"
        )
