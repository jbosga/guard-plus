from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.corpus import Observation, Source, PhenomenonTag
from app.models.enums import ObservationEpistemicStatus, ContentType, SourceModality, EpistemicDistance, CollectionMethod
from app.models.user import User
from app.models.corpus import ObservationCreate, ObservationUpdate, ObservationRead, ObservationReview
from app.models.common import Page
from app.core.security import get_current_user

router = APIRouter(prefix="/observations", tags=["observations"])


def _to_observation_read(obs: Observation) -> ObservationRead:
    r = ObservationRead.model_validate(obs)
    r.source_title = obs.source.title if obs.source else None
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
    epistemic_status: Optional[List[ObservationEpistemicStatus]] = Query(None),
    content_type: Optional[List[ContentType]] = Query(None),
    epistemic_distance: Optional[EpistemicDistance] = None,
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
    if epistemic_status:
        q = q.filter(Observation.epistemic_status.in_(epistemic_status))
    if content_type:
        q = q.filter(Observation.content_type.in_(content_type))
    if epistemic_distance is not None:
        q = q.filter(Observation.epistemic_distance == epistemic_distance)
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
        items=[_to_observation_read(o) for o in items],
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

    total = q.count()
    items = q.order_by(Observation.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return Page.create(
        items=[_to_observation_read(o) for o in items],
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
    if not db.query(Source).filter(Source.id == obs_in.source_id).first():
        raise HTTPException(status_code=400, detail=f"Source {obs_in.source_id} not found")

    tags = _resolve_tags(obs_in.tag_ids, db)

    obs = Observation(
        source_id=obs_in.source_id,
        content=obs_in.content,
        content_type=obs_in.content_type,
        source_modality=obs_in.source_modality,
        epistemic_distance=obs_in.epistemic_distance,
        collection_method=obs_in.collection_method,
        epistemic_status=obs_in.epistemic_status,
        corroboration_level=obs_in.corroboration_level,
        sample_n=obs_in.sample_n,
        sample_size_tier=obs_in.sample_size_tier,
        sampling_method=obs_in.sampling_method,
        inclusion_criteria_documented=obs_in.inclusion_criteria_documented,
        verbatim=obs_in.verbatim,
        page_ref=obs_in.page_ref,
        ai_extracted=obs_in.ai_extracted,
        tags=tags,
    )

    if not obs_in.ai_extracted:
        obs.reviewed_by = current_user.username
        obs.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.add(obs)
    db.commit()
    db.refresh(obs)
    return _to_observation_read(obs)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{observation_id}", response_model=ObservationRead)
def get_observation(
    observation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_observation_read(_get_or_404(observation_id, db))


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
    return _to_observation_read(obs)


# ── Review (accept/edit/reject from queue) ────────────────────────────────────

@router.post("/{observation_id}/review", response_model=ObservationRead)
def review_observation(
    observation_id: UUID,
    review: ObservationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept, edit, or reject an AI-extracted observation from the review queue.
    Rejection deletes the observation — it never enters the corpus.
    """
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

    if review.content_type:
        obs.content_type = review.content_type

    if review.tag_ids is not None:
        obs.tags = _resolve_tags(review.tag_ids, db)

    obs.reviewed_by = current_user.username
    obs.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    db.refresh(obs)
    return _to_observation_read(obs)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_observation(
    observation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(_get_or_404(observation_id, db))
    db.commit()
