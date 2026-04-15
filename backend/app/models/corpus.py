"""
Pydantic schemas for the corpus layer (Sources, Accounts, Tags, Claims).

Naming convention:
  *Create  — request body for POST
  *Update  — request body for PATCH (all fields optional)
  *Read    — response body (includes id, timestamps)
  *List    — lightweight list-view response (omits heavy fields like raw_text)
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel

from app.models.enums import (
    SourceType, DisciplinaryFrame, ProvenanceQuality,
    AccountContext, CorroborationLevel,
    EpistemicStatus, ClaimType,
    TagCategory,
)


# ── PhenomenonTag ─────────────────────────────────────────────────────────────

class PhenomenonTagCreate(BaseModel):
    label: str
    category: TagCategory
    definition: Optional[str] = None
    aliases: Optional[List[str]] = None
    parent_tag_id: Optional[int] = None


class PhenomenonTagUpdate(BaseModel):
    label: Optional[str] = None
    category: Optional[TagCategory] = None
    definition: Optional[str] = None
    aliases: Optional[List[str]] = None
    parent_tag_id: Optional[int] = None


class PhenomenonTagRead(BaseModel):
    id: int
    label: str
    category: TagCategory
    definition: Optional[str] = None
    aliases: Optional[List[str]] = None
    parent_tag_id: Optional[int] = None

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
    id: int
    source_type: SourceType
    title: str
    authors: Optional[List[str]] = None
    publication_date: Optional[str] = None
    disciplinary_frame: Optional[DisciplinaryFrame] = None
    provenance_quality: ProvenanceQuality
    ingestion_date: Optional[str] = None
    claim_count: int = 0

    model_config = {"from_attributes": True}


class SourceRead(SourceList):
    """Full detail view."""
    url: Optional[str] = None
    doi: Optional[str] = None
    file_ref: Optional[str] = None
    notes: Optional[str] = None
    account_detail: Optional[AccountDetailRead] = None
    created_at: datetime
    updated_at: datetime


# ── Claim ─────────────────────────────────────────────────────────────────────

class ClaimCreate(BaseModel):
    source_id: int
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
    id: int
    source_id: int
    claim_text: str
    verbatim: bool
    page_ref: Optional[str] = None
    timestamp_ref: Optional[str] = None
    epistemic_status: EpistemicStatus
    claim_type: ClaimType
    ai_extracted: bool
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
    tag_ids: Optional[List[int]] = None
