"""
Ingestion service — Abduction Research KMS
Phase 4 (updated for Observation model in Phase A refactor).

Responsibilities:
  1. Text extraction from stored files (pymupdf → Tesseract OCR fallback)
  2. Claude API observation extraction with AAE-specific prompt
  3. Bulk insertion of draft observations (ai_extracted=True, awaiting review queue)
  4. Source ingestion_status lifecycle management

Design principles:
  - Text extraction runs for BOTH ai and manual paths (populates source.raw_text)
  - Claude extraction runs only for ai path
  - All errors are caught and written to source.ingestion_error; never silently swallowed
  - Observations are inserted atomically per source — partial ingestion doesn't happen
  - Prompt encodes the epistemological stance: neither credulous nor dismissive
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import anthropic
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.corpus import Observation, Source
from app.models.enums import (
    ContentType,
    SourceModality,
    EpistemicDistance,
    CollectionMethod,
    ObservationEpistemicStatus,
    IngestionMethod,
    IngestionStatus,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Constants ─────────────────────────────────────────────────────────────────

_OCR_FALLBACK_THRESHOLD = 100
_OCR_DPI = 300
_MAX_TEXT_CHARS = 120_000
_EXTRACTION_MODEL = "claude-sonnet-4-6"
_MAX_OBSERVATIONS_PER_SOURCE = 100


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class ExtractionResult:
    """Outcome of text extraction step (shared by ai and manual paths)."""
    raw_text: str
    page_count: int
    ocr_pages: int = 0
    extraction_notes: str = ""


@dataclass
class ObservationDraft:
    """A single observation proposed by Claude, before DB insertion."""
    content: str
    content_type: ContentType
    source_modality: SourceModality
    epistemic_distance: EpistemicDistance
    collection_method: CollectionMethod
    epistemic_status: ObservationEpistemicStatus = ObservationEpistemicStatus.REPORTED
    page_ref: Optional[str] = None
    verbatim: bool = False


@dataclass
class IngestionResult:
    """Final outcome returned to the route handler."""
    source_id: str
    method: IngestionMethod
    status: IngestionStatus
    raw_text: Optional[str] = None
    observations_inserted: int = 0
    ocr_pages: int = 0
    error: Optional[str] = None


# ── Text extraction ───────────────────────────────────────────────────────────

def _extract_text_from_pdf(path: str) -> ExtractionResult:
    doc = fitz.open(path)
    page_texts: list[str] = []
    ocr_pages = 0

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()

        if len(text) >= _OCR_FALLBACK_THRESHOLD:
            page_texts.append(f"[Page {page_num}]\n{text}")
        else:
            logger.debug("Page %d: pymupdf yield %d chars, falling back to OCR", page_num, len(text))
            pix = page.get_pixmap(dpi=_OCR_DPI)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img, lang="eng").strip()
            page_texts.append(f"[Page {page_num} — OCR]\n{ocr_text}")
            ocr_pages += 1

    full_text = "\n\n".join(page_texts)
    notes = []
    if ocr_pages:
        notes.append(f"{ocr_pages}/{len(doc)} pages required OCR")
    if len(full_text) > _MAX_TEXT_CHARS:
        notes.append(f"Text truncated from {len(full_text):,} to {_MAX_TEXT_CHARS:,} chars for AI extraction")
        full_text = full_text[:_MAX_TEXT_CHARS]

    return ExtractionResult(
        raw_text=full_text,
        page_count=len(doc),
        ocr_pages=ocr_pages,
        extraction_notes="; ".join(notes),
    )


def _extract_text_from_txt(path: str) -> ExtractionResult:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if len(text) > _MAX_TEXT_CHARS:
        text = text[:_MAX_TEXT_CHARS]
    return ExtractionResult(raw_text=text, page_count=1)


def extract_text(source: Source, storage_path: str) -> ExtractionResult:
    if not source.file_ref:
        raise FileNotFoundError(f"Source {source.id} has no file_ref — upload a file first")

    path = os.path.join(storage_path, source.file_ref)
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found on disk: {path}")

    ext = os.path.splitext(source.file_ref)[1].lower()

    if ext == ".pdf":
        return _extract_text_from_pdf(path)
    elif ext in (".txt", ".md"):
        return _extract_text_from_txt(path)
    else:
        logger.warning("Unsupported extension %s — attempting plain text read", ext)
        return _extract_text_from_txt(path)


# ── Claude extraction prompt ──────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a rigorous research assistant supporting a scientific study of the \
anomalous abduction experience (AAE). Your task is to extract discrete, \
atomic observations from the provided source text.

EPISTEMOLOGICAL STANCE
The research program is neither credulous nor dismissive. First-person \
accounts are treated as empirical data. Your job is to extract what the \
source actually says — not to validate or debunk it.

SCOPE: NOVEL OBSERVATIONS ONLY
Extract only observations that the authors of this source make in their own \
voice. Do not extract observations attributed to other works (e.g. "Smith \
(1994) found that...", "According to Jones..."). Literature review sections \
and reference lists are out of scope.

EXTRACTION RULES
1. Each observation must be a single, atomic, self-contained proposition.
2. Preserve the source's own epistemic framing.
3. Do NOT extract bibliographic metadata.
4. Include page references where the text provides [Page N] markers.
5. Extract between 5 and 50 observations per source.

FIELD DEFINITIONS

content_type — what kind of phenomenon the observation records:
  experiential       — subjective experience reported by the subject
  behavioral         — observed or reported behaviour
  physiological      — bodily/physical measurements or symptoms
  environmental      — physical environment conditions or traces
  testimonial        — witness accounts or third-party reports
  documentary_trace  — physical documents, recordings, or artefacts

source_modality — how the data reached the record:
  first_person_verbal    — direct verbal report from the experiencer
  investigator_summary   — investigator paraphrase or summary
  physiological          — physiological instrument reading
  behavioral             — direct behavioural observation
  documentary            — documentary artefact
  aggregate_statistical  — statistical summary across multiple cases

epistemic_distance — how far the record is from the original event:
  direct       — author reporting their own data directly
  summarized   — author summarising another's report
  aggregated   — statistical aggregation across multiple reports
  derived      — inferred or computed from primary data

collection_method — how the data was collected:
  spontaneous_report     — unprompted self-report
  structured_interview   — formal interview with protocol
  hypnotic_regression    — report obtained under hypnosis
  questionnaire          — written survey instrument
  clinical_assessment    — clinical/psychological evaluation
  passive_recording      — audio/video/instrument recording
  investigator_inference — investigator's own inference or judgement

epistemic_status — confidence level of the observation:
  reported      — stated by the source without independent verification
  corroborated  — independently confirmed
  contested     — disputed in the literature or by investigators
  artefactual   — likely an artifact of the collection method
  retracted     — subsequently withdrawn

OUTPUT FORMAT
Return ONLY a valid JSON array. No preamble, no markdown fences. Each element:
  content           (string, required)
  content_type      (string, required, one of the values above)
  source_modality   (string, required, one of the values above)
  epistemic_distance (string, required, one of the values above)
  collection_method (string, required, one of the values above)
  epistemic_status  (string, required, one of the values above)
  page_ref          (string or null)
  verbatim          (boolean)

Example:
[
  {
    "content": "Fourteen of 19 participants reported a sensation of paralysis \
at the onset of the experience.",
    "content_type": "experiential",
    "source_modality": "investigator_summary",
    "epistemic_distance": "direct",
    "collection_method": "structured_interview",
    "epistemic_status": "reported",
    "page_ref": "47",
    "verbatim": false
  }
]
"""


def _call_claude(raw_text: str, source_title: str) -> list[ObservationDraft]:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_message = (
        f"SOURCE: {source_title}\n\n"
        f"TEXT:\n{raw_text}"
    )

    response = client.messages.create(
        model=_EXTRACTION_MODEL,
        max_tokens=8192,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_content = response.content[0].text.strip()
    raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
    raw_content = re.sub(r"\s*```$", "", raw_content)

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned non-JSON response: {e}\nRaw: {raw_content[:500]}")

    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array, got {type(data).__name__}")

    drafts: list[ObservationDraft] = []
    for i, item in enumerate(data[:_MAX_OBSERVATIONS_PER_SOURCE]):
        try:
            drafts.append(ObservationDraft(
                content=str(item["content"]).strip(),
                content_type=ContentType(item["content_type"]),
                source_modality=SourceModality(item["source_modality"]),
                epistemic_distance=EpistemicDistance(item["epistemic_distance"]),
                collection_method=CollectionMethod(item["collection_method"]),
                epistemic_status=ObservationEpistemicStatus(
                    item.get("epistemic_status", ObservationEpistemicStatus.REPORTED)
                ),
                page_ref=str(item["page_ref"]) if item.get("page_ref") else None,
                verbatim=bool(item.get("verbatim", False)),
            ))
        except (KeyError, ValueError) as e:
            logger.warning("Skipping malformed observation at index %d: %s — %s", i, item, e)

    return drafts


# ── DB writes ─────────────────────────────────────────────────────────────────

def _insert_observations(
    db: Session,
    source: Source,
    drafts: list[ObservationDraft],
    method: IngestionMethod,
    reviewer: Optional[str] = None,
) -> int:
    now = datetime.now(timezone.utc).isoformat()
    inserted = 0

    for draft in drafts:
        obs = Observation(
            id=uuid4(),
            source_id=source.id,
            content=draft.content,
            content_type=draft.content_type,
            source_modality=draft.source_modality,
            epistemic_distance=draft.epistemic_distance,
            collection_method=draft.collection_method,
            epistemic_status=draft.epistemic_status,
            verbatim=draft.verbatim,
            page_ref=draft.page_ref,
            ai_extracted=(method == IngestionMethod.AI),
            ingestion_method=method,
            reviewed_by=reviewer if method == IngestionMethod.MANUAL else None,
            reviewed_at=now if method == IngestionMethod.MANUAL else None,
        )
        db.add(obs)
        inserted += 1

    return inserted


# ── Public API ────────────────────────────────────────────────────────────────

def run_ingestion(
    *,
    source: Source,
    method: IngestionMethod,
    db: Session,
    reviewer_username: Optional[str] = None,
    manual_observations: Optional[list[dict]] = None,
) -> IngestionResult:
    """
    Entry point for the ingestion pipeline.

    AI path:
      1. Mark source as PROCESSING
      2. Extract text from file → write to source.raw_text
      3. Call Claude API → get observation drafts
      4. Insert observations (ai_extracted=True, no reviewer) → review queue
      5. Mark source as COMPLETE

    Manual path:
      1. Extract text from file if file_ref is set → write to source.raw_text
      2. If manual_observations provided, insert them as reviewed
      3. Mark source as COMPLETE
    """
    source.ingestion_status = IngestionStatus.PROCESSING
    source.ingestion_error = None
    db.commit()

    try:
        extraction: Optional[ExtractionResult] = None

        if source.file_ref:
            extraction = extract_text(source, settings.storage_path)
            source.raw_text = extraction.raw_text
            db.commit()
            logger.info(
                "Source %s: extracted %d chars from %d pages (%d OCR)",
                source.id, len(extraction.raw_text),
                extraction.page_count, extraction.ocr_pages,
            )
        else:
            logger.info("Source %s: no file_ref, skipping text extraction", source.id)

        drafts: list[ObservationDraft] = []

        if method == IngestionMethod.AI:
            if not extraction or not extraction.raw_text.strip():
                raise ValueError(
                    "AI ingestion requires extractable text. "
                    "Upload a file with readable content first."
                )
            logger.info("Source %s: calling Claude for observation extraction", source.id)
            drafts = _call_claude(extraction.raw_text, source.title)
            logger.info("Source %s: Claude returned %d observation drafts", source.id, len(drafts))

        elif method == IngestionMethod.MANUAL and manual_observations:
            for item in manual_observations:
                try:
                    drafts.append(ObservationDraft(
                        content=str(item["content"]).strip(),
                        content_type=ContentType(item["content_type"]),
                        source_modality=SourceModality(item["source_modality"]),
                        epistemic_distance=EpistemicDistance(item["epistemic_distance"]),
                        collection_method=CollectionMethod(item["collection_method"]),
                        epistemic_status=ObservationEpistemicStatus(
                            item.get("epistemic_status", ObservationEpistemicStatus.REPORTED)
                        ),
                        page_ref=item.get("page_ref"),
                        verbatim=bool(item.get("verbatim", False)),
                    ))
                except (KeyError, ValueError) as e:
                    logger.warning("Skipping malformed manual observation: %s — %s", item, e)

        inserted = 0
        if drafts:
            inserted = _insert_observations(
                db=db,
                source=source,
                drafts=drafts,
                method=method,
                reviewer=reviewer_username,
            )

        source.ingestion_status = IngestionStatus.COMPLETE
        db.commit()

        logger.info(
            "Source %s: ingestion complete — method=%s, observations=%d",
            source.id, method.value, inserted,
        )

        return IngestionResult(
            source_id=str(source.id),
            method=method,
            status=IngestionStatus.COMPLETE,
            raw_text=source.raw_text,
            observations_inserted=inserted,
            ocr_pages=extraction.ocr_pages if extraction else 0,
        )

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Source %s ingestion failed: %s", source.id, error_msg, exc_info=True)
        source.ingestion_status = IngestionStatus.FAILED
        source.ingestion_error = error_msg
        db.commit()

        return IngestionResult(
            source_id=str(source.id),
            method=method,
            status=IngestionStatus.FAILED,
            error=error_msg,
        )
