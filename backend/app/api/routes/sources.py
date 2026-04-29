import os
import shutil
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.corpus import Source, Account, Observation
from app.models.enums import SourceType, DisciplinaryFrame, ProvenanceQuality
from app.models.user import User
from app.models.corpus import (
    SourceCreate, SourceUpdate, SourceList, SourceRead, ObservationRead,
)
from app.models.common import Page
from app.core.security import get_current_user
from app.core.config import get_settings

router = APIRouter(prefix="/sources", tags=["sources"])
settings = get_settings()

ALLOWED_UPLOAD_TYPES = {
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _get_or_404(source_id: uuid.UUID, db: Session) -> Source:
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


def _observation_count(source_id: uuid.UUID, db: Session) -> int:
    return db.query(func.count(Observation.id)).filter(Observation.source_id == source_id).scalar() or 0


def _to_source_list(source: Source, db: Session) -> SourceList:
    d = SourceList.model_validate(source)
    d.observation_count = _observation_count(source.id, db)
    return d


def _to_source_read(source: Source, db: Session) -> SourceRead:
    d = SourceRead.model_validate(source)
    d.observation_count = _observation_count(source.id, db)
    return d


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=Page[SourceList])
def list_sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    source_type: Optional[SourceType] = None,
    disciplinary_frame: Optional[DisciplinaryFrame] = None,
    provenance_quality: Optional[ProvenanceQuality] = None,
    search: Optional[str] = Query(None, description="Full-text search on title and authors"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Source)

    if source_type:
        q = q.filter(Source.source_type == source_type)
    if disciplinary_frame:
        q = q.filter(Source.disciplinary_frame == disciplinary_frame)
    if provenance_quality:
        q = q.filter(Source.provenance_quality == provenance_quality)
    if search:
        q = q.filter(
            func.to_tsvector("english", func.coalesce(Source.title, "") + " " + func.coalesce(Source.raw_text, ""))
            .op("@@")(func.plainto_tsquery("english", search))
        )

    total = q.count()
    sources = (
        q.order_by(Source.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return Page.create(
        items=[_to_source_list(s, db) for s in sources],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(
    source_in: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = Source(
        source_type=source_in.source_type,
        title=source_in.title,
        authors=source_in.authors,
        publication_date=source_in.publication_date,
        url=source_in.url,
        doi=source_in.doi,
        disciplinary_frame=source_in.disciplinary_frame,
        provenance_quality=source_in.provenance_quality,
        notes=source_in.notes,
    )
    db.add(source)
    db.flush()

    if source_in.source_type == SourceType.ACCOUNT and source_in.account_detail:
        acct_data = source_in.account_detail.model_dump()
        acct = Account(id=source.id, **acct_data)
        db.add(acct)

    db.commit()
    db.refresh(source)
    return _to_source_read(source, db)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/{source_id}", response_model=SourceRead)
def get_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_source_read(_get_or_404(source_id, db), db)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{source_id}", response_model=SourceRead)
def update_source(
    source_id: uuid.UUID,
    source_in: SourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = _get_or_404(source_id, db)
    for field, value in source_in.model_dump(exclude_unset=True).items():
        setattr(source, field, value)
    db.commit()
    db.refresh(source)
    return _to_source_read(source, db)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = _get_or_404(source_id, db)
    if source.file_ref:
        path = os.path.join(settings.storage_path, source.file_ref)
        if os.path.exists(path):
            os.remove(path)
    db.delete(source)
    db.commit()


# ── File upload ───────────────────────────────────────────────────────────────

@router.post("/{source_id}/upload", response_model=dict)
def upload_file(
    source_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach an original file to a source for the ingestion pipeline."""
    source = _get_or_404(source_id, db)

    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Accepted: PDF, plain text, Word.",
        )

    os.makedirs(settings.storage_path, exist_ok=True)
    filename = f"{source_id}_{file.filename}"
    dest = os.path.join(settings.storage_path, filename)

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    source.file_ref = filename
    db.commit()

    return {"file_ref": filename}


# ── Observations sub-resource ─────────────────────────────────────────────────

@router.get("/{source_id}/observations", response_model=list[ObservationRead])
def get_source_observations(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All observations for a given source, ordered by page_ref."""
    _get_or_404(source_id, db)
    observations = (
        db.query(Observation)
        .filter(Observation.source_id == source_id)
        .order_by(Observation.page_ref)
        .all()
    )
    from app.api.routes.observations import _to_observation_read
    return [_to_observation_read(o) for o in observations]
