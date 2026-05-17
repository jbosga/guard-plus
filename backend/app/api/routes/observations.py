from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.corpus import Case, Observation, Source, PhenomenonTag
from app.models.enums import ObservationEpistemicStatus, ObservationSourceType, SourceType
from app.models.user import User
from app.models.corpus import ObservationCreate, ObservationUpdate, ObservationRead, ObservationReview
from app.models.common import Page
from app.core.security import get_current_user, get_current_superuser

router = APIRouter(prefix="/observations", tags=["observations"])


def _compute_staleness(obs: Observation, db: Session) -> bool:
    if obs.observation_source_type != ObservationSourceType.CORPUS_DERIVED:
        return False
    if obs.case_count_at_snapshot is None:
        return False
    current_count = db.query(func.count(Case.id)).scalar() or 0
    return current_count > obs.case_count_at_snapshot * 1.2


def _to_observation_read(obs: Observation, db: Session) -> ObservationRead:
    r = ObservationRead.model_validate(obs)
    r.source_title = obs.source.title if obs.source else None
    r.staleness_flag = _compute_staleness(obs, db)
    return r


def _get_or_404(observation_id: UUID, db: Session) -> Observation:
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return obs


def _resolve_tags(tag_ids: list[UUID], db: Session) -> list[PhenomenonTag]:
    if not tag_ids:
        return []
    tags = db.query(PhenomenonTag).filter(PhenomenonTag.id.in_(tag_ids)).all()
    found = {t.id for t in tags}
    missing = set(tag_ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Tag IDs not found: {sorted(str(m) for m in missing)}")
    return tags


# ── List / filter ─────────────────────────────────────────────────────────────

@router.get("", response_model=Page[ObservationRead])
def list_observations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    source_id: Optional[UUID] = None,
    observation_source_type: Optional[ObservationSourceType] = None,
    epistemic_status: Optional[List[ObservationEpistemicStatus]] = Query(None),
    tag_id: Optional[UUID] = Query(None, description="Filter to observations that carry this tag"),
    ai_extracted: Optional[bool] = None,
    unreviewed: Optional[bool] = Query(None, description="If true, return only unreviewed AI observations"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Observation)

    if source_id is not None:
        q = q.filter(Observation.source_id == source_id)
    if observation_source_type is not None:
        q = q.filter(Observation.observation_source_type == observation_source_type)
    if epistemic_status:
        q = q.filter(Observation.epistemic_status.in_(epistemic_status))
    if tag_id is not None:
        q = q.filter(Observation.tags.any(PhenomenonTag.id == tag_id))
    if ai_extracted is not None:
        q = q.filter(Observation.ai_extracted == ai_extracted)
    if unreviewed:
        q = q.filter(Observation.ai_extracted == True, Observation.reviewed_at.is_(None))
    if search:
        q = q.filter(Observation.content.ilike(f"%{search}%"))

    total = q.count()
    items = (
        q.order_by(Observation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return Page.create(
        items=[_to_observation_read(o, db) for o in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Review queue ──────────────────────────────────────────────────────────────

@router.get("/review-queue", response_model=Page[ObservationRead])
def review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_id: Optional[UUID] = None,
    source_type: Optional[SourceType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unreviewed AI-extracted observations, oldest-first."""
    q = (
        db.query(Observation)
        .filter(Observation.ai_extracted == True)
        .filter(Observation.reviewed_at.is_(None))
    )
    if source_id:
        q = q.filter(Observation.source_id == source_id)
    if source_type:
        q = q.join(Source).filter(Source.source_type == source_type)

    total = q.count()
    items = q.order_by(Observation.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return Page.create(
        items=[_to_observation_read(o, db) for o in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ObservationRead, status_code=status.HTTP_201_CREATED)
def create_observation(
    obs_in: ObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate corpus-derived requirements
    if obs_in.observation_source_type == ObservationSourceType.CORPUS_DERIVED:
        if obs_in.source_id is not None:
            raise HTTPException(status_code=400, detail="corpus_derived observations must not have a source_id")
        missing = [f for f in ("query_definition", "corpus_snapshot_date", "case_count_at_snapshot")
                   if getattr(obs_in, f) is None]
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"corpus_derived observations require: {', '.join(missing)}",
            )
    elif obs_in.source_id is not None:
        if not db.query(Source).filter(Source.id == obs_in.source_id).first():
            raise HTTPException(status_code=400, detail=f"Source {obs_in.source_id} not found")

    tags = _resolve_tags(obs_in.tag_ids, db)

    obs = Observation(
        source_id=obs_in.source_id,
        observation_source_type=obs_in.observation_source_type,
        content=obs_in.content,
        epistemic_status=obs_in.epistemic_status,
        authored_by=obs_in.authored_by,
        query_definition=obs_in.query_definition,
        analysis_tool=obs_in.analysis_tool,
        corpus_snapshot_date=obs_in.corpus_snapshot_date,
        case_count_at_snapshot=obs_in.case_count_at_snapshot,
        cases_included=obs_in.cases_included,
        case_filter_description=obs_in.case_filter_description,
        verbatim=obs_in.verbatim,
        page_ref=obs_in.page_ref,
        ai_extracted=obs_in.ai_extracted,
        created_by=current_user.username,
        tags=tags,
    )

    if not obs_in.ai_extracted:
        obs.reviewed_by = current_user.username
        obs.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.add(obs)
    db.commit()
    db.refresh(obs)
    return _to_observation_read(obs, db)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{observation_id}", response_model=ObservationRead)
def get_observation(
    observation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_observation_read(_get_or_404(observation_id, db), db)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{observation_id}", response_model=ObservationRead)
def update_observation(
    observation_id: UUID,
    obs_in: ObservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obs = _get_or_404(observation_id, db)
    update_data = obs_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    for field, value in update_data.items():
        setattr(obs, field, value)

    if tag_ids is not None:
        obs.tags = _resolve_tags(tag_ids, db)

    db.commit()
    db.refresh(obs)
    return _to_observation_read(obs, db)


# ── Review (accept/edit/reject from queue) ────────────────────────────────────

@router.post("/{observation_id}/review", response_model=ObservationRead)
def review_observation(
    observation_id: UUID,
    review: ObservationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obs = _get_or_404(observation_id, db)

    if not review.accepted:
        db.delete(obs)
        db.commit()
        raise HTTPException(status_code=200, detail="Observation rejected and deleted")

    if review.edited_content:
        obs.content = review.edited_content
        obs.verbatim = False

    if review.epistemic_status:
        obs.epistemic_status = review.epistemic_status

    if review.tag_ids is not None:
        obs.tags = _resolve_tags(review.tag_ids, db)

    obs.reviewed_by = current_user.username
    obs.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    db.refresh(obs)
    return _to_observation_read(obs, db)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_observation(
    observation_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    db.delete(_get_or_404(observation_id, db))
    db.commit()
