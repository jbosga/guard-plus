import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.synthesis import Hypothesis
from app.models.corpus import Claim
from app.models.enums import HypothesisFramework, HypothesisStatus
from app.models.user import User
from app.models.synthesis import (
    HypothesisCreate, HypothesisUpdate, HypothesisList, HypothesisRead,
)
from app.models.common import Page
from app.core.security import get_current_user

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])

ANOMALOUS_EMPTY_WARNING = (
    "X-Warning: hypothesis created without anomalous_claims. "
    "Every hypothesis should declare what it cannot explain."
)


def _get_or_404(hypothesis_id: UUID, db: Session) -> Hypothesis:
    h = db.query(Hypothesis).filter(Hypothesis.id == hypothesis_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h


def _resolve_claims(claim_ids: list[UUID], db: Session) -> list[Claim]:
    if not claim_ids:
        return []
    claims = db.query(Claim).filter(Claim.id.in_(claim_ids)).all()
    found = {c.id for c in claims}
    missing = set(claim_ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Claim IDs not found: {sorted(missing)}")
    return claims


def _resolve_hypotheses(ids: list[UUID], db: Session) -> list[Hypothesis]:
    if not ids:
        return []
    items = db.query(Hypothesis).filter(Hypothesis.id.in_(ids)).all()
    found = {h.id for h in items}
    missing = set(ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Hypothesis IDs not found: {sorted(missing)}")
    return items


def _to_list(h: Hypothesis) -> HypothesisList:
    d = HypothesisList.model_validate(h)
    d.supporting_claim_count = len(h.supporting_claims)
    d.anomalous_claim_count = len(h.anomalous_claims)
    if h.assumed_ontologies:
        d.assumed_ontologies = json.loads(h.assumed_ontologies) if isinstance(h.assumed_ontologies, str) else h.assumed_ontologies
    return d


def _to_read(h: Hypothesis) -> HypothesisRead:
    from app.models.corpus import ClaimRead
    d = HypothesisRead.model_validate(h)
    d.supporting_claim_count = len(h.supporting_claims)
    d.anomalous_claim_count = len(h.anomalous_claims)
    d.scope_claims = [ClaimRead.model_validate(c) for c in h.scope_claims]
    d.supporting_claims = [ClaimRead.model_validate(c) for c in h.supporting_claims]
    d.anomalous_claims = [ClaimRead.model_validate(c) for c in h.anomalous_claims]
    d.required_assumptions = [ClaimRead.model_validate(c) for c in h.required_assumptions] if h.required_assumptions else []
    if h.assumed_ontologies:
        d.assumed_ontologies = json.loads(h.assumed_ontologies) if isinstance(h.assumed_ontologies, str) else h.assumed_ontologies
    return d


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=Page[HypothesisList])
def list_hypotheses(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    framework: Optional[HypothesisFramework] = None,
    status_filter: Optional[HypothesisStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Hypothesis)
    if framework:
        q = q.filter(Hypothesis.framework == framework)
    if status_filter:
        q = q.filter(Hypothesis.status == status_filter)
    if search:
        q = q.filter(Hypothesis.label.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(Hypothesis.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return Page.create(
        items=[_to_list(h) for h in items],
        total=total, page=page, page_size=page_size,
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=HypothesisRead, status_code=status.HTTP_201_CREATED)
def create_hypothesis(
    hyp_in: HypothesisCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Soft enforcement: warn if anomalous_claims is empty
    if not hyp_in.anomalous_claim_ids:
        response.headers["X-Warning"] = (
            "Hypothesis created without anomalous_claims. "
            "Every hypothesis should declare what it cannot explain."
        )

    hyp = Hypothesis(
        label=hyp_in.label,
        description=hyp_in.description,
        framework=hyp_in.framework,
        assumed_ontologies=hyp_in.assumed_ontologies,
        required_assumptions=hyp_in.required_assumptions,
        status=hyp_in.status,
        notes=hyp_in.notes,
        scope_claims=_resolve_claims(hyp_in.scope_claim_ids, db),
        supporting_claims=_resolve_claims(hyp_in.supporting_claim_ids, db),
        anomalous_claims=_resolve_claims(hyp_in.anomalous_claim_ids, db),
        competing_hypotheses=_resolve_hypotheses(hyp_in.competing_hypothesis_ids, db),
    )
    db.add(hyp)
    db.commit()
    db.refresh(hyp)
    return _to_read(hyp)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{hypothesis_id}", response_model=HypothesisRead)
def get_hypothesis(
    hypothesis_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_read(_get_or_404(hypothesis_id, db))


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{hypothesis_id}", response_model=HypothesisRead)
def update_hypothesis(
    hypothesis_id: UUID,
    hyp_in: HypothesisUpdate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hyp = _get_or_404(hypothesis_id, db)
    update_data = hyp_in.model_dump(exclude_unset=True)

    # Pop relationship fields before scalar update
    scope_ids = update_data.pop("scope_claim_ids", None)
    supporting_ids = update_data.pop("supporting_claim_ids", None)
    anomalous_ids = update_data.pop("anomalous_claim_ids", None)
    assumption_ids = update_data.pop("required_assumption_ids", None)
    competitor_ids = update_data.pop("competing_hypothesis_ids", None)

    for field, value in update_data.items():
        setattr(hyp, field, value)

    if scope_ids is not None:
        hyp.scope_claims = _resolve_claims(scope_ids, db)
    if supporting_ids is not None:
        hyp.supporting_claims = _resolve_claims(supporting_ids, db)
    if anomalous_ids is not None:
        hyp.anomalous_claims = _resolve_claims(anomalous_ids, db)
    if assumption_ids is not None:
        hyp.required_assumptions = _resolve_claims(assumption_ids, db)
    if competitor_ids is not None:
        hyp.competing_hypotheses = _resolve_hypotheses(competitor_ids, db)

    # Warn if anomalous_claims ends up empty
    if len(hyp.anomalous_claims) == 0:
        response.headers["X-Warning"] = (
            "Hypothesis now has no anomalous_claims. "
            "Every hypothesis should declare what it cannot explain."
        )

    db.commit()
    db.refresh(hyp)
    return _to_read(hyp)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{hypothesis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hypothesis(
    hypothesis_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(_get_or_404(hypothesis_id, db))
    db.commit()
