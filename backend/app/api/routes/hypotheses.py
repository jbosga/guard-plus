import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.synthesis import Hypothesis
from app.models.corpus import Observation
from app.models.enums import HypothesisFramework, HypothesisStatus
from app.models.user import User
from app.models.synthesis import (
    HypothesisCreate, HypothesisUpdate, HypothesisList, HypothesisRead, HypothesisReview,
)
from app.models.common import Page
from app.core.security import get_current_user

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])


def _get_or_404(hypothesis_id: UUID, db: Session) -> Hypothesis:
    h = db.query(Hypothesis).filter(Hypothesis.id == hypothesis_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h


def _resolve_observations(obs_ids: list[UUID], db: Session) -> list[Observation]:
    if not obs_ids:
        return []
    items = db.query(Observation).filter(Observation.id.in_(obs_ids)).all()
    found = {o.id for o in items}
    missing = set(obs_ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Observation IDs not found: {sorted(str(m) for m in missing)}")
    return items


def _resolve_hypotheses(ids: list[UUID], db: Session) -> list[Hypothesis]:
    if not ids:
        return []
    items = db.query(Hypothesis).filter(Hypothesis.id.in_(ids)).all()
    found = {h.id for h in items}
    missing = set(ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Hypothesis IDs not found: {sorted(str(m) for m in missing)}")
    return items


def _to_list(h: Hypothesis) -> HypothesisList:
    d = HypothesisList.model_validate(h)
    d.supporting_observation_count = len(h.supporting_observations)
    d.anomalous_observation_count = len(h.anomalous_observations)
    d.source_title = h.source.title if h.source else None
    if h.assumed_ontologies:
        d.assumed_ontologies = json.loads(h.assumed_ontologies) if isinstance(h.assumed_ontologies, str) else h.assumed_ontologies
    return d


def _to_read(h: Hypothesis) -> HypothesisRead:
    from app.models.corpus import ObservationRead
    d = HypothesisRead.model_validate(h)
    d.supporting_observation_count = len(h.supporting_observations)
    d.anomalous_observation_count = len(h.anomalous_observations)
    d.supporting_observations = [ObservationRead.model_validate(o) for o in h.supporting_observations]
    d.anomalous_observations = [ObservationRead.model_validate(o) for o in h.anomalous_observations]
    d.competing_hypotheses = [_to_list(c) for c in h.competing_hypotheses]
    if h.assumed_ontologies:
        d.assumed_ontologies = json.loads(h.assumed_ontologies) if isinstance(h.assumed_ontologies, str) else h.assumed_ontologies
    return d


def _set_warning_headers(response: Response, h: Hypothesis) -> None:
    if len(h.anomalous_observations) == 0:
        response.headers["X-Warning-Anomalous"] = (
            "Hypothesis has no anomalous_observations. "
            "Every hypothesis should declare what it cannot explain."
        )
    if not h.falsification_condition:
        response.headers["X-Warning-Falsification"] = (
            "Hypothesis has no falsification_condition. "
            "Every hypothesis should state what evidence would refute it."
        )


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=Page[HypothesisList])
def list_hypotheses(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
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
    hyp = Hypothesis(
        label=hyp_in.label,
        description=hyp_in.description,
        hypothesis_type=hyp_in.hypothesis_type,
        falsification_condition=hyp_in.falsification_condition,
        scope=hyp_in.scope,
        framework=hyp_in.framework,
        assumed_ontologies=hyp_in.assumed_ontologies,
        status=hyp_in.status,
        confidence_level=hyp_in.confidence_level,
        parent_hypothesis_id=hyp_in.parent_hypothesis_id,
        notes=hyp_in.notes,
        supporting_observations=_resolve_observations(hyp_in.supporting_observation_ids, db),
        anomalous_observations=_resolve_observations(hyp_in.anomalous_observation_ids, db),
        competing_hypotheses=_resolve_hypotheses(hyp_in.competing_hypothesis_ids, db),
    )
    db.add(hyp)
    db.commit()
    db.refresh(hyp)
    _set_warning_headers(response, hyp)
    return _to_read(hyp)


# ── Review queue ─────────────────────────────────────────────────────────────

@router.get("/review-queue", response_model=Page[HypothesisList])
def hypothesis_review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unreviewed AI-extracted hypotheses, oldest-first."""
    q = (
        db.query(Hypothesis)
        .filter(Hypothesis.ai_extracted == True)
        .filter(Hypothesis.reviewed_at.is_(None))
    )
    if source_id:
        q = q.filter(Hypothesis.source_id == source_id)
    total = q.count()
    items = q.order_by(Hypothesis.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return Page.create(items=[_to_list(h) for h in items], total=total, page=page, page_size=page_size)


@router.post("/{hypothesis_id}/review", response_model=HypothesisList)
def review_hypothesis(
    hypothesis_id: UUID,
    review: HypothesisReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept (with optional edits) or reject an AI-extracted hypothesis."""
    hyp = _get_or_404(hypothesis_id, db)

    if not review.accepted:
        db.delete(hyp)
        db.commit()
        raise HTTPException(status_code=200, detail="Hypothesis rejected and deleted")

    if review.edited_label:
        hyp.label = review.edited_label
    if review.edited_description is not None:
        hyp.description = review.edited_description
    if review.hypothesis_type:
        hyp.hypothesis_type = review.hypothesis_type
    if review.framework:
        hyp.framework = review.framework
    if review.confidence_level:
        hyp.confidence_level = review.confidence_level

    hyp.reviewed_by = current_user.username
    hyp.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    db.refresh(hyp)
    return _to_list(hyp)


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

    supporting_ids = update_data.pop("supporting_observation_ids", None)
    anomalous_ids = update_data.pop("anomalous_observation_ids", None)
    competitor_ids = update_data.pop("competing_hypothesis_ids", None)

    for field, value in update_data.items():
        setattr(hyp, field, value)

    if supporting_ids is not None:
        hyp.supporting_observations = _resolve_observations(supporting_ids, db)
    if anomalous_ids is not None:
        hyp.anomalous_observations = _resolve_observations(anomalous_ids, db)
    if competitor_ids is not None:
        hyp.competing_hypotheses = _resolve_hypotheses(competitor_ids, db)

    db.commit()
    db.refresh(hyp)
    _set_warning_headers(response, hyp)
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
