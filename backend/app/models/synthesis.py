"""
Pydantic schemas for the synthesis layer.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, model_validator

from app.models.enums import (
    EpistemicStatus,
    ConceptType,
    RelationshipType, RelationshipStrength,
    HypothesisFramework, AssumedOntology, HypothesisStatus,
    EpistemicNoteType, AttachableEntityType,
)
from app.schemas.corpus import ClaimRead


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
