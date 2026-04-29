"""
Ingestion endpoint — Phase 4 (updated for Observation model in Phase A refactor).

POST /api/v1/sources/{source_id}/ingest

AI path:
  - Accepts immediately (202), runs pipeline in a BackgroundTask
  - Poll GET /api/v1/sources/{source_id} for ingestion_status
  - Draft observations appear in GET /api/v1/observations/review-queue

Manual path:
  - If request includes observations[], inserts them immediately and returns 201
  - If no observations[], returns 200 with source metadata for the frontend form
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.corpus import Observation, Source
from app.models.enums import (
    ContentType, SourceModality, EpistemicDistance, CollectionMethod,
    ObservationEpistemicStatus, IngestionMethod, IngestionStatus,
)
from app.models.user import User
from app.services.ingestion import ObservationDraft, IngestionResult, run_ingestion

router = APIRouter(prefix="/sources", tags=["ingestion"])


# ── Request / response schemas ────────────────────────────────────────────────

class ManualObservationIn(BaseModel):
    """A single manually-entered observation submitted alongside the ingest request."""
    content: str
    content_type: ContentType
    source_modality: SourceModality
    epistemic_distance: EpistemicDistance
    collection_method: CollectionMethod
    epistemic_status: ObservationEpistemicStatus = ObservationEpistemicStatus.REPORTED
    page_ref: Optional[str] = None
    verbatim: bool = False


class IngestRequest(BaseModel):
    method: IngestionMethod = IngestionMethod.AI
    observations: Optional[list[ManualObservationIn]] = None


class IngestResponse(BaseModel):
    source_id: UUID
    method: IngestionMethod
    status: IngestionStatus
    message: str
    observations_inserted: int = 0
    ocr_pages: int = 0
    source_title: Optional[str] = None
    has_raw_text: bool = False


# ── Background task wrapper ───────────────────────────────────────────────────

def _run_ai_ingestion_background(source_id: UUID, db_url: str) -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            return

        run_ingestion(
            source=source,
            method=IngestionMethod.AI,
            db=db,
        )
    finally:
        db.close()
        engine.dispose()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/{source_id}/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger ingestion pipeline for a source",
    description="""
Trigger text extraction and optional observation extraction for an uploaded source.

**AI path** (`method: "ai"`):
- Requires a file to have been uploaded via `POST /{source_id}/upload`
- Returns 202 immediately; pipeline runs as a background task
- Poll `GET /sources/{source_id}` for `ingestion_status`
- Extracted observations appear in `GET /observations/review-queue`

**Manual path** (`method: "manual"`):
- File upload is optional (text extraction runs if a file exists)
- If `observations` array is provided: inserted immediately, returns 201
- If `observations` is omitted: returns 200 with source metadata
""",
)
def ingest_source(
    source_id: UUID,
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if source.ingestion_status == IngestionStatus.PROCESSING:
        raise HTTPException(
            status_code=409,
            detail="Ingestion already in progress for this source. Poll ingestion_status.",
        )

    # ── AI path ───────────────────────────────────────────────────────────────
    if request.method == IngestionMethod.AI:
        if not source.file_ref:
            raise HTTPException(
                status_code=422,
                detail=(
                    "AI ingestion requires an uploaded file. "
                    "Use POST /{source_id}/upload first."
                ),
            )

        source.ingestion_status = IngestionStatus.PENDING
        db.commit()

        from app.core.config import get_settings
        db_url = get_settings().database_url

        background_tasks.add_task(_run_ai_ingestion_background, source_id, db_url)

        return IngestResponse(
            source_id=source_id,
            method=IngestionMethod.AI,
            status=IngestionStatus.PENDING,
            message=(
                "Ingestion queued. Pipeline is running in the background. "
                "Poll GET /sources/{source_id} for status updates. "
                "Extracted observations will appear in GET /observations/review-queue."
            ),
            source_title=source.title,
            has_raw_text=bool(source.raw_text),
        )

    # ── Manual path ───────────────────────────────────────────────────────────
    if request.method == IngestionMethod.MANUAL:
        manual_dicts = (
            [o.model_dump() for o in request.observations]
            if request.observations else None
        )

        result: IngestionResult = run_ingestion(
            source=source,
            method=IngestionMethod.MANUAL,
            db=db,
            reviewer_username=current_user.username,
            manual_observations=manual_dicts,
        )

        if result.status == IngestionStatus.FAILED:
            raise HTTPException(status_code=500, detail=result.error)

        no_obs_submitted = not request.observations

        return IngestResponse(
            source_id=source_id,
            method=IngestionMethod.MANUAL,
            status=result.status,
            message=(
                "Text extracted. Open the manual entry form to add observations."
                if no_obs_submitted
                else f"{result.observations_inserted} observation(s) recorded."
            ),
            observations_inserted=result.observations_inserted,
            ocr_pages=result.ocr_pages,
            source_title=source.title,
            has_raw_text=bool(source.raw_text),
        )

    raise HTTPException(status_code=400, detail="Unknown ingestion method")
