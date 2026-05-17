from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.corpus import Case, Source, CaseCreate, CaseUpdate, CaseRead, CaseList, CaseReview
from app.models.enums import (
    PresenceAbsenceUnknown, SleepWakeState, ParalysisExtent,
    PsychometricPresence, CorroborationLevelV2, RepeatExperiencer,
    ExtractionMethod,
)
from app.models.user import User
from app.models.common import Page
from app.core.security import get_current_user, get_current_superuser

router = APIRouter(prefix="/cases", tags=["cases"])


def _get_or_404(case_id: UUID, db: Session) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


def _to_case_list(case: Case) -> CaseList:
    d = CaseList.model_validate(case)
    d.source_title = case.source.title if case.source else None
    return d


def _to_case_read(case: Case) -> CaseRead:
    d = CaseRead.model_validate(case)
    d.source_title = case.source.title if case.source else None
    return d


def _apply_filters(
    q,
    source_id: Optional[UUID],
    entity_presence: Optional[PresenceAbsenceUnknown],
    sleep_wake_state_at_onset: Optional[SleepWakeState],
    paralysis_reported: Optional[ParalysisExtent],
    hypnosis_used: Optional[PsychometricPresence],
    corroboration_level: Optional[CorroborationLevelV2],
    repeat_experiencer: Optional[RepeatExperiencer],
    search: Optional[str],
):
    if source_id is not None:
        q = q.filter(Case.source_id == source_id)
    if entity_presence is not None:
        q = q.filter(Case.entity_presence == entity_presence)
    if sleep_wake_state_at_onset is not None:
        q = q.filter(Case.sleep_wake_state_at_onset == sleep_wake_state_at_onset)
    if paralysis_reported is not None:
        q = q.filter(Case.paralysis_reported == paralysis_reported)
    if hypnosis_used is not None:
        q = q.filter(Case.hypnosis_used == hypnosis_used)
    if corroboration_level is not None:
        q = q.filter(Case.corroboration_level == corroboration_level)
    if repeat_experiencer is not None:
        q = q.filter(Case.repeat_experiencer == repeat_experiencer)
    if search:
        q = q.filter(
            or_(
                Case.case_label.ilike(f"%{search}%"),
                Case.notes.ilike(f"%{search}%"),
            )
        )
    return q


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=Page[CaseList])
def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    source_id: Optional[UUID] = None,
    entity_presence: Optional[PresenceAbsenceUnknown] = None,
    sleep_wake_state_at_onset: Optional[SleepWakeState] = None,
    paralysis_reported: Optional[ParalysisExtent] = None,
    hypnosis_used: Optional[PsychometricPresence] = None,
    corroboration_level: Optional[CorroborationLevelV2] = None,
    repeat_experiencer: Optional[RepeatExperiencer] = None,
    q: Optional[str] = Query(None, description="Full-text search on case_label and notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Case)
    query = _apply_filters(
        query, source_id, entity_presence, sleep_wake_state_at_onset,
        paralysis_reported, hypnosis_used, corroboration_level, repeat_experiencer, q,
    )
    total = query.count()
    items = (
        query.order_by(Case.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        items=[_to_case_list(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Review queue ──────────────────────────────────────────────────────────────

@router.get("/review-queue", response_model=List[CaseRead])
def get_case_review_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cases = (
        db.query(Case)
        .filter(
            Case.reviewed == False,  # noqa: E712
            Case.extraction_method == ExtractionMethod.AI_ASSISTED,
        )
        .order_by(Case.created_at.asc())
        .all()
    )
    return [_to_case_read(c) for c in cases]


@router.post("/{case_id}/review")
def review_case(
    case_id: UUID,
    review: CaseReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_or_404(case_id, db)

    if not review.accepted:
        db.delete(case)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if review.edits:
        for field_name, value in review.edits.model_dump(exclude_unset=True).items():
            setattr(case, field_name, value)

    case.reviewed = True
    case.reviewed_by = current_user.username
    case.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)
    return _to_case_read(case)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{case_id}", response_model=CaseRead)
def get_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_case_read(_get_or_404(case_id, db))


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Source).filter(Source.id == case_in.source_id).first():
        raise HTTPException(status_code=400, detail=f"Source {case_in.source_id} not found")

    case = Case(**case_in.model_dump(), created_by=current_user.username)
    db.add(case)
    db.commit()
    db.refresh(case)
    return _to_case_read(case)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{case_id}", response_model=CaseRead)
def update_case(
    case_id: UUID,
    case_in: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_or_404(case_id, db)
    for field, value in case_in.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return _to_case_read(case)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    db.delete(_get_or_404(case_id, db))
    db.commit()
