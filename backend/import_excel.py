"""
Excel import script — Abduction Research KMS
Chat 3 of build order.

Reads data_sheet.xlsx (four sheets) and populates:
  - sources          (one row per study)
  - claims           (one claim per meaningful text field)
  - phenomenon_tags  (AAE features, explanatory frameworks)

Usage:
  python import_excel.py [--db-url postgresql://...] [--dry-run] [--file path/to/data_sheet.xlsx]

Idempotent: re-running skips rows whose study_id already exists as a source title.
"""

import argparse
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import psycopg2
from psycopg2.extras import Json, register_uuid

# ── Helpers ───────────────────────────────────────────────────────────────────

def uid() -> uuid.UUID:
    return uuid.uuid4()

def now_str() -> str:
    return datetime.now(timezone.utc).isoformat()

def clean(val) -> Optional[str]:
    """Return stripped string or None for NaN/empty."""
    if pd.isna(val) or str(val).strip() in ("", "nan", "NaN"):
        return None
    return str(val).strip()

def split_authors(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    # Handle "et al.", "&", commas
    raw = raw.replace(" et al.", "").replace(" et al", "")
    parts = []
    for sep in [";", "&"]:
        if sep in raw:
            parts = [p.strip() for p in raw.split(sep) if p.strip()]
            return parts
    # Single author or comma-separated
    return [p.strip() for p in raw.split(",") if p.strip()] or [raw.strip()]

def parse_n(val) -> Optional[int]:
    if pd.isna(val):
        return None
    try:
        return int(str(val).split()[0].replace("N=","").replace("n=",""))
    except (ValueError, IndexError):
        return None

# Map study designs to our source_type_enum
def infer_source_type(study_design: Optional[str], study_id: str) -> str:
    if not study_design:
        return "paper"
    sd = study_design.lower()
    if "interview" in sd:
        return "interview"
    if "case study" in sd:
        return "field_report"
    if "narrative review" in sd or "historical overview" in sd or "conceptual" in sd:
        return "paper"
    return "paper"

# Map disciplinary frame from journal name heuristics
def infer_disciplinary_frame(journal: Optional[str], framework: Optional[str]) -> Optional[str]:
    if not journal:
        return None
    j = journal.lower()
    f = (framework or "").lower()
    if "abnormal psychology" in j or "social and clinical" in j or "personality" in j:
        return "psychology"
    if "psychiatry" in j or "psychiatric" in j or "nervous" in j:
        return "psychiatry"
    if "neuroscience" in j or "cortex" in j or "neuropsychiatry" in j or "eeg" in f:
        return "neuroscience"
    if "ufo" in j or "scientific exploration" in j:
        return "ufology"
    if "folklore" in j or "preternatural" in j or "fabula" in j:
        return "folklore"
    if "anthropology" in j or "transcultural" in j:
        return "anthropology"
    if "social work" in j or "sociology" in j or "scientific study of religion" in j:
        return "sociology"
    if "philosophy" in j:
        return "philosophy"
    if "parapsychology" in j:
        return "parapsychology"
    return "other"

# Map provenance quality from journal name
def infer_provenance(journal: Optional[str]) -> str:
    if not journal:
        return "unknown"
    j = journal.lower()
    peer_reviewed_signals = [
        "abnormal psychology", "scientific study of religion",
        "professional psychology", "perceptual and motor", "cortex",
        "psychological science", "psychiatry", "imagination cognition",
        "transcultural", "american academy", "journal of contemporary",
        "british journal", "american academy of psychoanalysis",
        "fabula", "preternatural", "philosophical psychology",
        "social and clinical", "near-death studies", "communication quarterly",
        "international journal of clinical", "cognitive neuropsychiatry",
        "nervous and mental", "ufo studies", "scientific exploration"
    ]
    for signal in peer_reviewed_signals:
        if signal in j:
            return "peer_reviewed"
    return "grey_literature"

# ── Database helpers ──────────────────────────────────────────────────────────

class DB:
    def __init__(self, url: str, dry_run: bool):
        self.dry_run = dry_run
        if not dry_run:
            self.conn = psycopg2.connect(url)
            self.conn.autocommit = False
            register_uuid(self.conn)
        self.counts = {
            "sources": 0,
            "claims": 0,
            "tags": 0,
            "skipped": 0,
        }

    def execute(self, sql: str, params=None):
        if self.dry_run:
            return
        with self.conn.cursor() as cur:
            cur.execute(sql, params)

    def fetchone(self, sql: str, params=None):
        if self.dry_run:
            return None
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()

    def fetchall(self, sql: str, params=None):
        if self.dry_run:
            return []
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    def commit(self):
        if not self.dry_run:
            self.conn.commit()

    def rollback(self):
        if not self.dry_run:
            self.conn.rollback()

    def close(self):
        if not self.dry_run:
            self.conn.close()


# ── Import logic ──────────────────────────────────────────────────────────────

def get_or_create_tag(db: DB, label: str, category: str) -> Optional[uuid.UUID]:
    """Return existing tag UUID or create and return new one."""
    label = label.strip()[:199]
    row = db.fetchone("SELECT id FROM phenomenon_tags WHERE label = %s", (label,))
    if row:
        return row[0]
    tag_id = uid()
    db.execute(
        """INSERT INTO phenomenon_tags (id, label, category, created_at, updated_at)
           VALUES (%s, %s, %s, now(), now())""",
        (tag_id, label, category)
    )
    db.counts["tags"] += 1
    return tag_id


def source_exists(db: DB, study_id: str) -> bool:
    row = db.fetchone("SELECT id FROM sources WHERE title LIKE %s", (f"{study_id}%",))
    return row is not None


def insert_source(db: DB, row: pd.Series) -> uuid.UUID:
    study_id = str(row["Study ID"])
    title = f"{study_id}: {clean(row['Title']) or 'Untitled'}"
    authors = split_authors(clean(row["Authors"]))
    pub_year = clean(str(row["Year of Publication"])) if pd.notna(row["Year of Publication"]) else None
    journal = clean(row["Journal Name"])
    # Strip embedded researcher annotation notes (e.g. "Moet zijn: ..." Dutch notes)
    raw_sd = clean(row["Study Design"])
    study_design = raw_sd.split("\n")[0].strip() if raw_sd else None
    framework = clean(row["Explanatory Framework"])

    source_type = infer_source_type(study_design, study_id)
    disc_frame = infer_disciplinary_frame(journal, framework)
    provenance = infer_provenance(journal)

    # Build notes from metadata fields
    notes_parts = []
    if journal:
        notes_parts.append(f"Journal: {journal}")
    if study_design:
        notes_parts.append(f"Study design: {study_design}")
    rqs = []
    if row.get("RQ1") == 1: rqs.append("RQ1: phenomenological description")
    if row.get("RQ2") == 1: rqs.append("RQ2: psychological profile")
    if row.get("RQ3") == 1: rqs.append("RQ3: explanatory framework")
    if rqs:
        notes_parts.append("Research questions addressed: " + "; ".join(rqs))
    n_aaers = parse_n(row.get("N (AAErs)"))
    if n_aaers:
        notes_parts.append(f"N (AAEers): {n_aaers}")
    sample_text = clean(row.get("Sample"))
    if sample_text:
        notes_parts.append(f"Sample: {sample_text[:500]}")

    source_id = uid()
    db.execute(
        """INSERT INTO sources
           (id, source_type, title, authors, publication_date,
            disciplinary_frame, provenance_quality, ingestion_date,
            notes, created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())""",
        (
            source_id,
            source_type,
            title,
            Json(authors),
            pub_year,
            disc_frame,
            provenance,
            now_str()[:10],
            "\n\n".join(notes_parts) or None,
        )
    )
    db.counts["sources"] += 1
    return source_id


def insert_claim(
    db: DB,
    source_id: uuid.UUID,
    claim_text: str,
    claim_type: str,
    epistemic_status: str = "asserted",
    tag_ids: Optional[list] = None,
) -> uuid.UUID:
    claim_id = uid()
    db.execute(
        """INSERT INTO claims
           (id, source_id, claim_text, verbatim, epistemic_status,
            claim_type, ai_extracted, created_at, updated_at)
           VALUES (%s, %s, %s, false, %s, %s, false, now(), now())""",
        (claim_id, source_id, claim_text[:5000], epistemic_status, claim_type)
    )
    if tag_ids:
        for tag_id in tag_ids:
            db.execute(
                "INSERT INTO claim_tags (claim_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (claim_id, tag_id)
            )
    db.counts["claims"] += 1
    return claim_id


def process_datasheet(db: DB, df: pd.DataFrame):
    """Process main DataSheet — one source + claims per study row."""
    for _, row in df.iterrows():
        study_id = str(row["Study ID"])

        if source_exists(db, study_id):
            print(f"  SKIP (exists): {study_id}")
            db.counts["skipped"] += 1
            continue

        print(f"  Importing: {study_id}")
        source_id = insert_source(db, row)

        # --- Claim: conclusions ---
        conclusions = clean(row.get("Conclusions"))
        if conclusions:
            insert_claim(db, source_id, conclusions, "causal", "inferred")

        # --- Claim: outcomes/findings ---
        outcomes = clean(row.get("Outcomes"))
        if outcomes:
            insert_claim(db, source_id, outcomes[:5000], "correlational", "observed")

        # # --- Claims: AAE features as phenomenological claims with tags ---
        # features_raw = clean(row.get("Features of AAE listed"))
        # if features_raw:
        #     # Split on newline or numbered list items
        #     import re
        #     items = re.split(r'\n|\d+[\)\.]\s+', features_raw)
        #     items = [i.strip() for i in items if i.strip() and len(i.strip()) > 10]
        #     for item in items[:20]:  # cap at 20 per source
        #         # Create/get a tag for this feature
        #         tag_id = get_or_create_tag(
        #             db,
        #             label=item[:199],
        #             category="narrative"
        #         )
        #         insert_claim(
        #             db, source_id,
        #             f"AAE feature reported: {item}",
        #             "phenomenological",
        #             "observed",
        #             tag_ids=[tag_id] if tag_id else []
        #         )

        # --- Claim: demographic findings ---
        demo_fields = ["Ethnicity", "Marital status", "Education", "Occupation", "Gender", "Age, average", "Country"]
        demo_parts = []
        for field in demo_fields:
            val = clean(row.get(field))
            if val:
                demo_parts.append(f"{field}: {val}")
        if demo_parts:
            insert_claim(
                db, source_id,
                "Demographic profile: " + "; ".join(demo_parts),
                "correlational",
                "observed"
            )

        # --- Claim: explanatory framework attribution ---
        framework = clean(row.get("Explanatory Framework"))
        if framework:
            insert_claim(
                db, source_id,
                f"Study engages with explanatory framework(s): {framework}",
                "causal",
                "inferred"
            )




# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import data_sheet.xlsx into the Abduction Research KMS database")
    parser.add_argument("--db-url", default="postgresql://researcher:changeme@localhost:5432/abduction_research",
                        help="PostgreSQL connection URL")
    parser.add_argument("--file", default="data_sheet.xlsx",
                        help="Path to the Excel file")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and validate without writing to DB")
    args = parser.parse_args()

    print(f"\n{'DRY RUN — ' if args.dry_run else ''}Loading: {args.file}")

    sheets = pd.read_excel(args.file, sheet_name=None)
    if "DataSheet" not in sheets:
        print("ERROR: 'DataSheet' tab not found", file=sys.stderr)
        sys.exit(1)

    df_main = sheets["DataSheet"]
    print(f"DataSheet: {len(df_main)} rows")

    db = DB(args.db_url, args.dry_run)

    try:
        print("\n── Importing sources + claims ───────────────────────────────────────")
        process_datasheet(db, df_main)

        if not args.dry_run:
            db.commit()
            print("\n✓ Committed.")
        else:
            print("\n✓ Dry run complete — no changes written.")

    except Exception as e:
        db.rollback()
        print(f"\n✗ Error: {e}", file=sys.stderr)
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

    print("\n── Summary ──────────────────────────────────────────────────────────")
    for key, val in db.counts.items():
        print(f"  {key:<15} {val}")


if __name__ == "__main__":
    main()