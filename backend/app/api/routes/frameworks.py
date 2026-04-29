import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.synthesis import TheoreticalFramework, Hypothesis
from app.models.enums import HypothesisFramework, FrameworkStatus
from app.models.user import User
from app.models.synthesis import (
    TheoreticalFrameworkCreate, TheoreticalFrameworkUpdate,
    TheoreticalFrameworkList, TheoreticalFrameworkRead,
    HypothesisList,
)
from app.models.common import Page
from app.core.security import get_current_user

router = APIRouter(prefix="/frameworks", tags=["frameworks"])


def _get_or_404(framework_id: UUID, db: Session) -> TheoreticalFramework:
    fw = db.query(TheoreticalFramework).filter(TheoreticalFramework.id == framework_id).first()
    if not fw:
        raise HTTPException(status_code=404, detail="TheoreticalFramework not found")
    return fw


def _resolve_hypotheses(ids: list[UUID], db: Session) -> list[Hypothesis]:
    if not ids:
        return []
    items = db.query(Hypothesis).filter(Hypothesis.id.in_(ids)).all()
    found = {h.id for h in items}
    missing = set(ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Hypothesis IDs not found: {sorted(str(m) for m in missing)}")
    return items


def _hyp_to_list(h: Hypothesis) -> HypothesisList:
    d = HypothesisList.model_validate(h)
    d.supporting_observation_count = len(h.supporting_observations)
    d.anomalous_observation_count = len(h.anomalous_observations)
    if h.assumed_ontologies:
        d.assumed_ontologies = json.loads(h.assumed_ontologies) if isinstance(h.assumed_ontologies, str) else h.assumed_ontologies
    return d


def _to_list(fw: TheoreticalFramework) -> TheoreticalFrameworkList:
    d = TheoreticalFrameworkList.model_validate(fw)
    d.core_hypothesis_count = len(fw.core_hypotheses)
    d.anomalous_hypothesis_count = len(fw.anomalous_hypotheses)
    if fw.assumed_ontologies:
        d.assumed_ontologies = json.loads(fw.assumed_ontologies) if isinstance(fw.assumed_ontologies, str) else fw.assumed_ontologies
    return d


def _to_read(fw: TheoreticalFramework) -> TheoreticalFrameworkRead:
    d = TheoreticalFrameworkRead.model_validate(fw)
    d.core_hypothesis_count = len(fw.core_hypotheses)
    d.anomalous_hypothesis_count = len(fw.anomalous_hypotheses)
    d.core_hypotheses = [_hyp_to_list(h) for h in fw.core_hypotheses]
    d.anomalous_hypotheses = [_hyp_to_list(h) for h in fw.anomalous_hypotheses]
    if fw.assumed_ontologies:
        d.assumed_ontologies = json.loads(fw.assumed_ontologies) if isinstance(fw.assumed_ontologies, str) else fw.assumed_ontologies
    return d


def _set_warning_headers(response: Response, fw: TheoreticalFramework) -> None:
    if len(fw.anomalous_hypotheses) == 0:
        response.headers["X-Warning"] = (
            "TheoreticalFramework has no anomalous_hypotheses. "
            "Every framework should declare hypotheses it cannot accommodate."
        )


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=Page[TheoreticalFrameworkList])
def list_frameworks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    framework_type: Optional[HypothesisFramework] = None,
    status_filter: Optional[FrameworkStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TheoreticalFramework)
    if framework_type:
        q = q.filter(TheoreticalFramework.framework_type == framework_type)
    if status_filter:
        q = q.filter(TheoreticalFramework.status == status_filter)
    if search:
        q = q.filter(TheoreticalFramework.label.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(TheoreticalFramework.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return Page.create(
        items=[_to_list(fw) for fw in items],
        total=total, page=page, page_size=page_size,
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=TheoreticalFrameworkRead, status_code=status.HTTP_201_CREATED)
def create_framework(
    fw_in: TheoreticalFrameworkCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fw = TheoreticalFramework(
        label=fw_in.label,
        description=fw_in.description,
        framework_type=fw_in.framework_type,
        assumed_ontologies=fw_in.assumed_ontologies,
        status=fw_in.status,
        confidence_level=fw_in.confidence_level,
        notes=fw_in.notes,
        core_hypotheses=_resolve_hypotheses(fw_in.core_hypothesis_ids, db),
        anomalous_hypotheses=_resolve_hypotheses(fw_in.anomalous_hypothesis_ids, db),
    )
    db.add(fw)
    db.commit()
    db.refresh(fw)
    _set_warning_headers(response, fw)
    return _to_read(fw)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{framework_id}", response_model=TheoreticalFrameworkRead)
def get_framework(
    framework_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_read(_get_or_404(framework_id, db))


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{framework_id}", response_model=TheoreticalFrameworkRead)
def update_framework(
    framework_id: UUID,
    fw_in: TheoreticalFrameworkUpdate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fw = _get_or_404(framework_id, db)
    update_data = fw_in.model_dump(exclude_unset=True)

    core_ids = update_data.pop("core_hypothesis_ids", None)
    anomalous_ids = update_data.pop("anomalous_hypothesis_ids", None)

    for field, value in update_data.items():
        setattr(fw, field, value)

    if core_ids is not None:
        fw.core_hypotheses = _resolve_hypotheses(core_ids, db)
    if anomalous_ids is not None:
        fw.anomalous_hypotheses = _resolve_hypotheses(anomalous_ids, db)

    db.commit()
    db.refresh(fw)
    _set_warning_headers(response, fw)
    return _to_read(fw)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{framework_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_framework(
    framework_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(_get_or_404(framework_id, db))
    db.commit()
