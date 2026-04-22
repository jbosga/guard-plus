from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.corpus import Claim, Source, PhenomenonTag
from app.models.enums import EpistemicStatus, ClaimType
from app.models.user import User
from app.models.corpus import ClaimCreate, ClaimUpdate, ClaimRead, ClaimReview
from app.models.common import Page
from app.core.security import get_current_user

router = APIRouter(prefix="/claims", tags=["claims"])


def _get_or_404(claim_id: UUID, db: Session) -> Claim:
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


def _resolve_tags(tag_ids: list[int], db: Session) -> list[PhenomenonTag]:
    if not tag_ids:
        return []
    tags = db.query(PhenomenonTag).filter(PhenomenonTag.id.in_(tag_ids)).all()
    found = {t.id for t in tags}
    missing = set(tag_ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Tag IDs not found: {sorted(missing)}")
    return tags


# ── List / filter ─────────────────────────────────────────────────────────────

@router.get("", response_model=Page[ClaimRead])
def list_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    source_id: Optional[int] = None,
    epistemic_status: Optional[EpistemicStatus] = None,
    claim_type: Optional[ClaimType] = None,
    tag_id: Optional[int] = Query(None, description="Filter to claims that carry this tag"),
    ai_extracted: Optional[bool] = None,
    unreviewed: Optional[bool] = Query(None, description="If true, return only unreviewed AI claims"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Claim)

    if source_id is not None:
        q = q.filter(Claim.source_id == source_id)
    if epistemic_status:
        q = q.filter(Claim.epistemic_status == epistemic_status)
    if claim_type:
        q = q.filter(Claim.claim_type == claim_type)
    if tag_id is not None:
        q = q.filter(Claim.tags.any(PhenomenonTag.id == tag_id))
    if ai_extracted is not None:
        q = q.filter(Claim.ai_extracted == ai_extracted)
    if unreviewed:
        q = q.filter(Claim.ai_extracted == True, Claim.reviewed_at.is_(None))
    if search:
        # Simple ilike for now; Chat 4 will wire up tsvector properly
        q = q.filter(Claim.claim_text.ilike(f"%{search}%"))

    total = q.count()
    claims = (
        q.order_by(Claim.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return Page.create(
        items=[ClaimRead.model_validate(c) for c in claims],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Review queue ──────────────────────────────────────────────────────────────

@router.get("/review-queue", response_model=Page[ClaimRead])
def review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unreviewed AI-extracted claims, oldest-first.
    This is the primary feed for the ingestion review UI (Chat 6).
    """
    q = (
        db.query(Claim)
        .filter(Claim.ai_extracted == True)
        .filter(Claim.reviewed_at.is_(None))
    )
    if source_id:
        q = q.filter(Claim.source_id == source_id)

    total = q.count()
    claims = q.order_by(Claim.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return Page.create(
        items=[ClaimRead.model_validate(c) for c in claims],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ClaimRead, status_code=status.HTTP_201_CREATED)
def create_claim(
    claim_in: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Source).filter(Source.id == claim_in.source_id).first():
        raise HTTPException(status_code=400, detail=f"Source {claim_in.source_id} not found")

    tags = _resolve_tags(claim_in.tag_ids, db)

    claim = Claim(
        source_id=claim_in.source_id,
        claim_text=claim_in.claim_text,
        verbatim=claim_in.verbatim,
        page_ref=claim_in.page_ref,
        timestamp_ref=claim_in.timestamp_ref,
        epistemic_status=claim_in.epistemic_status,
        claim_type=claim_in.claim_type,
        ai_extracted=claim_in.ai_extracted,
        tags=tags,
    )

    # Manually entered claims are pre-reviewed
    if not claim_in.ai_extracted:
        claim.reviewed_by = current_user.username
        claim.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.add(claim)
    db.commit()
    db.refresh(claim)
    return ClaimRead.model_validate(claim)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{claim_id}", response_model=ClaimRead)
def get_claim(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ClaimRead.model_validate(_get_or_404(claim_id, db))


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{claim_id}", response_model=ClaimRead)
def update_claim(
    claim_id: UUID,
    claim_in: ClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    claim = _get_or_404(claim_id, db)
    update_data = claim_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    for field, value in update_data.items():
        setattr(claim, field, value)

    if tag_ids is not None:
        claim.tags = _resolve_tags(tag_ids, db)

    db.commit()
    db.refresh(claim)
    return ClaimRead.model_validate(claim)


# ── Review (accept/edit/reject from queue) ────────────────────────────────────

@router.post("/{claim_id}/review", response_model=ClaimRead)
def review_claim(
    claim_id: UUID,
    review: ClaimReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept, edit, or reject an AI-extracted claim from the review queue.
    Rejection deletes the claim entirely — it never enters the corpus.
    """
    claim = _get_or_404(claim_id, db)

    if not review.accepted:
        db.delete(claim)
        db.commit()
        # Return 200 with a message rather than 204 so the UI gets confirmation
        raise HTTPException(status_code=200, detail="Claim rejected and deleted")

    if review.edited_text:
        claim.claim_text = review.edited_text
        claim.verbatim = False  # editing breaks verbatim status

    if review.epistemic_status:
        claim.epistemic_status = review.epistemic_status

    if review.claim_type:
        claim.claim_type = review.claim_type

    if review.tag_ids is not None:
        claim.tags = _resolve_tags(review.tag_ids, db)

    claim.reviewed_by = current_user.username
    claim.reviewed_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    db.refresh(claim)
    return ClaimRead.model_validate(claim)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{claim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_claim(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(_get_or_404(claim_id, db))
    db.commit()
