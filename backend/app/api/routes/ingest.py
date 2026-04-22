"""
Ingestion endpoint — Phase 4.

POST /api/v1/sources/{source_id}/ingest

AI path:
  - Accepts immediately (202), runs pipeline in a BackgroundTask
  - Poll GET /api/v1/sources/{source_id} for ingestion_status
  - Draft claims appear in GET /api/v1/claims/review-queue as they are inserted

Manual path:
  - If request includes claims[], inserts them immediately and returns 201
  - If no claims[], returns 200 with source metadata for the frontend form
    (Phase 5/6 will render the manual entry form against this response)
  - Text extraction still runs if file_ref is set (populates raw_text)
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.corpus import Claim, Source
from app.models.enums import ClaimType, EpistemicStatus, IngestionMethod, IngestionStatus
from app.models.user import User
from app.services.ingestion import ClaimDraft, IngestionResult, run_ingestion

router = APIRouter(prefix="/sources", tags=["ingestion"])


# ── Request / response schemas ────────────────────────────────────────────────

class ManualClaimIn(BaseModel):
    """A single manually-entered claim submitted alongside the ingest request."""
    claim_text: str
    claim_type: ClaimType
    epistemic_status: EpistemicStatus = EpistemicStatus.ASSERTED
    page_ref: Optional[str] = None
    verbatim: bool = False


class IngestRequest(BaseModel):
    method: IngestionMethod = IngestionMethod.AI
    # Manual claims can be submitted now, or later via the claims endpoint.
    # Omitting this field opens the manual entry form in the frontend.
    claims: Optional[list[ManualClaimIn]] = None


class IngestResponse(BaseModel):
    source_id: UUID
    method: IngestionMethod
    status: IngestionStatus
    message: str
    claims_inserted: int = 0
    ocr_pages: int = 0
    # Populated for manual/no-file case so frontend can open the entry form
    source_title: Optional[str] = None
    has_raw_text: bool = False


# ── Background task wrapper ───────────────────────────────────────────────────

def _run_ai_ingestion_background(source_id: UUID, db_url: str) -> None:
    """
    Runs in a BackgroundTask. Creates its own DB session because the
    request session will be closed by the time this executes.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            return  # source deleted between request and background run

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
Trigger text extraction and optional claim extraction for an uploaded source.

**AI path** (`method: "ai"`):
- Requires a file to have been uploaded via `POST /{source_id}/upload`
- Returns 202 immediately; pipeline runs as a background task
- Poll `GET /sources/{source_id}` for `ingestion_status`
- Extracted claims appear in `GET /claims/review-queue`

**Manual path** (`method: "manual"`):
- File upload is optional (text extraction runs if a file exists)
- If `claims` array is provided: inserted immediately, returns 201
- If `claims` is omitted: returns 200 with source metadata for the frontend entry form
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

    # Guard: don't allow re-triggering while already processing
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

        # Mark pending before background task starts so concurrent requests
        # hit the 409 guard above
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
                "Extracted claims will appear in GET /claims/review-queue."
            ),
            source_title=source.title,
            has_raw_text=bool(source.raw_text),
        )

    # ── Manual path ───────────────────────────────────────────────────────────
    if request.method == IngestionMethod.MANUAL:
        manual_dicts = (
            [c.model_dump() for c in request.claims]
            if request.claims else None
        )

        result: IngestionResult = run_ingestion(
            source=source,
            method=IngestionMethod.MANUAL,
            db=db,
            reviewer_username=current_user.username,
            manual_claims=manual_dicts,
        )

        if result.status == IngestionStatus.FAILED:
            raise HTTPException(status_code=500, detail=result.error)

        no_claims_submitted = not request.claims

        return IngestResponse(
            source_id=source_id,
            method=IngestionMethod.MANUAL,
            status=result.status,
            message=(
                "Text extracted. Open the manual entry form to add claims."
                if no_claims_submitted
                else f"{result.claims_inserted} claim(s) recorded."
            ),
            claims_inserted=result.claims_inserted,
            ocr_pages=result.ocr_pages,
            source_title=source.title,
            has_raw_text=bool(source.raw_text),
        )

    # Unreachable — pydantic validates method enum — but satisfies type checker
    raise HTTPException(status_code=400, detail="Unknown ingestion method")
