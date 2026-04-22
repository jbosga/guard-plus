"""
Ingestion service — Abduction Research KMS
Phase 4 of build order.

Responsibilities:
  1. Text extraction from stored files (pymupdf → Tesseract OCR fallback)
  2. Claude API claim extraction with AAE-specific prompt
  3. Bulk insertion of draft claims (ai_extracted=True, awaiting review queue)
  4. Source ingestion_status lifecycle management

Design principles:
  - Text extraction runs for BOTH ai and manual paths (populates source.raw_text)
  - Claude extraction runs only for ai path
  - All errors are caught and written to source.ingestion_error; never silently swallowed
  - Claims are inserted atomically per source — partial ingestion doesn't happen
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
from app.models.corpus import Claim, Source
from app.models.enums import (
    ClaimType,
    EpistemicStatus,
    IngestionMethod,
    IngestionStatus,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Constants ─────────────────────────────────────────────────────────────────

# Minimum character yield from pymupdf before we assume the page is scanned
_OCR_FALLBACK_THRESHOLD = 100

# Tesseract DPI for rasterisation — 300 is standard for academic text
_OCR_DPI = 300

# Hard cap on characters sent to Claude — avoids runaway token costs on
# very large PDFs. ~120k chars ≈ ~30k tokens, well within claude-3-5-sonnet context.
_MAX_TEXT_CHARS = 120_000

# Claude model used for extraction
_EXTRACTION_MODEL = "claude-sonnet-4-6"

# Max claims we'll accept per source from the AI pass — a safety valve;
# a paper with >100 extracted claims is almost certainly over-segmented.
_MAX_CLAIMS_PER_SOURCE = 100


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class ExtractionResult:
    """Outcome of text extraction step (shared by ai and manual paths)."""
    raw_text: str
    page_count: int
    ocr_pages: int = 0        # how many pages fell back to Tesseract
    extraction_notes: str = ""


@dataclass
class ClaimDraft:
    """A single claim proposed by Claude, before DB insertion."""
    claim_text: str
    claim_type: ClaimType
    epistemic_status: EpistemicStatus
    page_ref: Optional[str] = None
    verbatim: bool = False


@dataclass
class IngestionResult:
    """Final outcome returned to the route handler."""
    source_id: str
    method: IngestionMethod
    status: IngestionStatus
    raw_text: Optional[str] = None
    claims_inserted: int = 0
    ocr_pages: int = 0
    error: Optional[str] = None


# ── Text extraction ───────────────────────────────────────────────────────────

def _extract_text_from_pdf(path: str) -> ExtractionResult:
    """
    Extract full text from a PDF file.

    Strategy per page:
      1. pymupdf text extraction (fast, lossless for text-layer PDFs)
      2. If yield < threshold → rasterise page → Tesseract OCR

    Returns concatenated text across all pages with page separators.
    """
    doc = fitz.open(path)
    page_texts: list[str] = []
    ocr_pages = 0

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()

        if len(text) >= _OCR_FALLBACK_THRESHOLD:
            page_texts.append(f"[Page {page_num}]\n{text}")
        else:
            # Scanned page — rasterise and OCR
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
    """Plain text files — read directly."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if len(text) > _MAX_TEXT_CHARS:
        text = text[:_MAX_TEXT_CHARS]
    return ExtractionResult(raw_text=text, page_count=1)


def extract_text(source: Source, storage_path: str) -> ExtractionResult:
    """
    Dispatch to the right extractor based on file extension.
    Raises FileNotFoundError if source.file_ref is missing.
    """
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
        # For docx and other formats, attempt plain text read as best-effort
        # Full docx support can be added in a later pass with python-docx
        logger.warning("Unsupported extension %s — attempting plain text read", ext)
        return _extract_text_from_txt(path)


# ── Claude extraction prompt ──────────────────────────────────────────────────

_SYSTEM_PROMPT = _SYSTEM_PROMPT = """\
You are a rigorous research assistant supporting a scientific study of the \
anomalous abduction experience (AAE). Your task is to extract discrete, \
atomic claims from the provided source text.

EPISTEMOLOGICAL STANCE
The research program is neither credulous nor dismissive. First-person \
accounts are treated as empirical data. Your job is to extract what the \
source actually says — not to validate or debunk it. You must preserve the \
epistemic status of each claim as the source presents it.

SCOPE: NOVEL CLAIMS ONLY
Extract only claims that the authors of this source make in their own voice. \
Do not extract claims attributed to other works (e.g. "Smith (1994) found \
that...", "According to Jones...", "Previous research has shown..."). \
Literature review sections and reference lists are out of scope.

Exception: if a cited finding is load-bearing in the authors' own argument, \
you may extract the authors' endorsement of it as a single claim, typed as \
INFERRED and noting the dependency. Example: "The authors adopt Spanos's \
(1996) sociocultural model as their explanatory framework" is extractable; \
the contents of Spanos's model are not.

CLAIM EXTRACTION RULES
1. Each claim must be a single, atomic, self-contained proposition. Do not \
   combine multiple assertions into one claim.
2. Preserve the source's own epistemic framing. If the author says \
   "subjects reported..." that is OBSERVED. If the author concludes from \
   data, that is INFERRED. If the author speculates, that is SPECULATIVE.
3. Extract claims across all relevant types:
   - phenomenological: descriptions of experienced phenomena (what happened)
   - causal: proposed cause-effect relationships
   - correlational: co-occurrence patterns without causal claim
   - definitional: how terms or categories are defined or bounded
   - methodological: claims about the study design, sample, or method
4. Do NOT extract bibliographic metadata (author, year, journal) — these are \
   handled separately.
5. Do NOT paraphrase in a way that changes the epistemic status. If the \
   source is uncertain, your claim must reflect that uncertainty.
6. Include page references where the text provides [Page N] markers.
7. Extract between 5 and 50 claims per source. Prefer depth over breadth: \
   a precise claim about missing time is more valuable than a vague claim \
   about "unusual experiences."

EPISTEMIC STATUS: DECISION RULES
Apply exactly one of these values to each claim. Read carefully — the \
surface grammar of a sentence does not determine its epistemic status; \
the source of the claim does.

  observed
    The claim is directly grounded in data the authors of THIS study \
collected themselves: counts, measurements, test scores, coded interview \
responses, survey answers. A claim can be OBSERVED even when stated without \
hedging language.
    ✓ "Fourteen of 19 participants reported a sensation of paralysis."
    ✓ "Only six of the 20 subjects in the sexually abused group chose to \
fill out the data sheets, and those six indicated they were women between \
the ages of 21 and 33."
    ✗ "Sleep paralysis affects an estimated 8% of the general population." \
(background fact, not measured in this study → use asserted)

  asserted
    The claim is stated as fact but is NOT derived from this study's own \
data. Includes background facts, epidemiological figures, theoretical \
claims, and definitional statements drawn from general knowledge or prior \
literature.
    ✓ "Sleep paralysis affects an estimated 8% of the general population."
    ✓ "The abduction narrative typically includes four phases."
    ✗ "Mean fantasy-proneness score was 2.3 (SD 0.8)." (from study data → \
use observed)

  inferred
    The authors' conclusion drawn from their own data or analysis. The claim \
goes beyond directly reporting the data — it interprets or generalises.
    ✓ "The elevated fantasy-proneness scores suggest a relationship between \
imaginative absorption and AAE reporting."
    ✓ "These findings are consistent with a sleep-state misattribution account."

  speculative
    The author explicitly hedges: "may", "might", "could suggest", \
"perhaps", "it is possible that". The claim is conjecture, not conclusion.
    ✓ "Missing time may reflect dissociative episodes triggered by trauma."

  contested
    The author explicitly acknowledges significant disagreement about this \
claim in the literature, or presents it as one position among competing ones.
    ✓ "Whether AAE reports reflect literal events or psychogenic elaboration \
remains contested."

CLAIM TYPES (use exactly these values)
  phenomenological, causal, correlational, definitional, methodological

OUTPUT FORMAT
Return ONLY a valid JSON array. No preamble, no explanation, no markdown \
fences. Each element must be an object with these fields:
  claim_text       (string, required)
  claim_type       (string, required, one of the values above)
  epistemic_status (string, required, one of the values above)
  page_ref         (string or null — e.g. "42" or "12-13" or null)
  verbatim         (boolean — true only if claim_text is a direct quote)

Example of valid output:
[
  {
    "claim_text": "Fourteen of 19 participants reported a sensation of \
paralysis at the onset of the experience.",
    "claim_type": "phenomenological",
    "epistemic_status": "observed",
    "page_ref": "47",
    "verbatim": false
  },
  {
    "claim_text": "The authors adopt Spanos's sociocultural model as their \
primary explanatory framework, treating AAE reports as culturally scripted \
narratives rather than veridical memories.",
    "claim_type": "causal",
    "epistemic_status": "inferred",
    "page_ref": "32",
    "verbatim": false
  }
]
"""


def _call_claude(raw_text: str, source_title: str) -> list[ClaimDraft]:
    """
    Call Claude API to extract claims from source text.
    Returns a list of ClaimDraft objects.
    Raises on API error or malformed response.
    """
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

    # Strip accidental markdown fences if Claude adds them despite instructions
    raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
    raw_content = re.sub(r"\s*```$", "", raw_content)

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned non-JSON response: {e}\nRaw: {raw_content[:500]}")

    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array, got {type(data).__name__}")

    drafts: list[ClaimDraft] = []
    for i, item in enumerate(data[:_MAX_CLAIMS_PER_SOURCE]):
        try:
            drafts.append(ClaimDraft(
                claim_text=str(item["claim_text"]).strip(),
                claim_type=ClaimType(item["claim_type"]),
                epistemic_status=EpistemicStatus(item["epistemic_status"]),
                page_ref=str(item["page_ref"]) if item.get("page_ref") else None,
                verbatim=bool(item.get("verbatim", False)),
            ))
        except (KeyError, ValueError) as e:
            # Log bad items but don't abort the whole extraction
            logger.warning("Skipping malformed claim at index %d: %s — %s", i, item, e)

    return drafts


# ── DB writes ─────────────────────────────────────────────────────────────────

def _insert_claims(
    db: Session,
    source: Source,
    drafts: list[ClaimDraft],
    method: IngestionMethod,
    reviewer: Optional[str] = None,
) -> int:
    """
    Bulk-insert claim drafts for a source.

    For AI method: ai_extracted=True, no reviewer stamp → lands in review queue.
    For manual method: ai_extracted=False, reviewer stamp applied immediately.
    """
    now = datetime.now(timezone.utc).isoformat()
    inserted = 0

    for draft in drafts:
        claim = Claim(
            id=uuid4(),
            source_id=source.id,
            claim_text=draft.claim_text,
            verbatim=draft.verbatim,
            page_ref=draft.page_ref,
            epistemic_status=draft.epistemic_status,
            claim_type=draft.claim_type,
            ai_extracted=(method == IngestionMethod.AI),
            ingestion_method=method,
            # Manual claims are stamped as reviewed immediately
            reviewed_by=reviewer if method == IngestionMethod.MANUAL else None,
            reviewed_at=now if method == IngestionMethod.MANUAL else None,
        )
        db.add(claim)
        inserted += 1

    return inserted


# ── Public API ────────────────────────────────────────────────────────────────

def run_ingestion(
    *,
    source: Source,
    method: IngestionMethod,
    db: Session,
    reviewer_username: Optional[str] = None,
    manual_claims: Optional[list[dict]] = None,
) -> IngestionResult:
    """
    Entry point for the ingestion pipeline. Called by the route handler
    inside a BackgroundTask (AI path) or directly (manual path).

    AI path:
      1. Mark source as PROCESSING
      2. Extract text from file → write to source.raw_text
      3. Call Claude API → get claim drafts
      4. Insert claims (ai_extracted=True, no reviewer) → review queue
      5. Mark source as COMPLETE

    Manual path:
      1. Extract text from file if file_ref is set → write to source.raw_text
      2. If manual_claims provided, insert them as reviewed
         (If not provided, the frontend form handles insertion separately)
      3. Mark source as COMPLETE

    Errors in either path:
      - Set source.ingestion_status = FAILED
      - Write error message to source.ingestion_error
      - Re-raise so the background task logs it
    """
    source.ingestion_status = IngestionStatus.PROCESSING
    source.ingestion_error = None
    db.commit()

    try:
        # ── Step 1: Text extraction (both paths) ──────────────────────────────
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

        # ── Step 2: Claim production ──────────────────────────────────────────
        drafts: list[ClaimDraft] = []

        if method == IngestionMethod.AI:
            if not extraction or not extraction.raw_text.strip():
                raise ValueError(
                    "AI ingestion requires extractable text. "
                    "Upload a file with readable content first."
                )
            logger.info("Source %s: calling Claude for claim extraction", source.id)
            drafts = _call_claude(extraction.raw_text, source.title)
            logger.info("Source %s: Claude returned %d claim drafts", source.id, len(drafts))

        elif method == IngestionMethod.MANUAL and manual_claims:
            # Convert dicts from the request body into ClaimDraft objects
            for item in manual_claims:
                try:
                    drafts.append(ClaimDraft(
                        claim_text=str(item["claim_text"]).strip(),
                        claim_type=ClaimType(item["claim_type"]),
                        epistemic_status=EpistemicStatus(
                            item.get("epistemic_status", EpistemicStatus.ASSERTED)
                        ),
                        page_ref=item.get("page_ref"),
                        verbatim=bool(item.get("verbatim", False)),
                    ))
                except (KeyError, ValueError) as e:
                    logger.warning("Skipping malformed manual claim: %s — %s", item, e)

        # ── Step 3: DB insertion ──────────────────────────────────────────────
        inserted = 0
        if drafts:
            inserted = _insert_claims(
                db=db,
                source=source,
                drafts=drafts,
                method=method,
                reviewer=reviewer_username,
            )

        source.ingestion_status = IngestionStatus.COMPLETE
        db.commit()

        logger.info(
            "Source %s: ingestion complete — method=%s, claims=%d",
            source.id, method.value, inserted,
        )

        return IngestionResult(
            source_id=str(source.id),
            method=method,
            status=IngestionStatus.COMPLETE,
            raw_text=source.raw_text,
            claims_inserted=inserted,
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
