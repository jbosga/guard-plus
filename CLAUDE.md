# CLAUDE.md — Abduction Research Knowledge Management System

## Project Overview

A self-hosted web application for rigorous scientific study of the alien abduction experience (AAE). The system supports structured collection of case data, cross-disciplinary literature management, and hypothesis development and testing.

**Epistemological stance:** Neither credulous nor dismissive. First-person accounts are treated as primary empirical data. Anomalies are signals, not noise. Confirmation bias is countered at the schema level.

---

## Architecture

### Four-layer data model

```
CASE LAYER              OBSERVATION LAYER         SYNTHESIS LAYER
Case                    Observation               Hypothesis
  (structured             (literature-sourced   →   TheoreticalFramework
   case report)            or corpus-derived)        Concept / ConceptRelationship
       ↓
   CSV export
       ↓
   external analysis (R, Python, etc.)
       ↓
   re-entry as corpus-derived Observation
```

**Cases are not observations.** A case is a structured empirical record of a single AAE account, linked to a `case_report` source. An observation is a derived claim about a pattern — either extracted from a literature source (empirical study, review, theoretical paper) or computed externally from the case corpus and re-entered with provenance metadata. The observation → hypothesis → framework layer operates entirely above the case layer.

### Source types

| Source type | Feeds | Extraction method |
|---|---|---|
| `case_report` | Case layer | PDF → AI extraction → `Case` draft → review queue |
| `empirical_study` | Observation layer | PDF → AI extraction → `Observation` drafts → review queue |
| `review_paper` | Observation layer | PDF → AI extraction → `Observation` drafts → review queue |
| `theoretical` | Observation layer | PDF → AI extraction → `Observation` drafts → review queue |

### Corpus-derived observations

When a researcher exports case data, runs external analysis, and wants to register the result as an observation, they re-enter it manually with `observation_source_type = corpus_derived`. These observations carry: `query_definition` (the code or procedure used), `analysis_tool`, `corpus_snapshot_date`, `case_count_at_snapshot`, and `cases_included`. A `staleness_flag` is automatically set when the current case count exceeds `case_count_at_snapshot` by >20%.

### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL 16 | Relational model; JSONB for multi-select fields; full-text search |
| Backend | Python + FastAPI | Clean REST API, Pydantic validation, Python AI ecosystem |
| Frontend | React + Vite + TypeScript | Mature ecosystem for graph viz and complex UI |
| Graph viz | Cytoscape.js | Analytical filtering and programmatic graph analysis |
| AI assistance | Anthropic Claude API | Case and observation extraction, hypothesis stress-testing |
| Infrastructure | Docker Compose | One-command startup; VPS deployment |
| File storage | Local filesystem (MVP) → S3 | PDFs stored as files; raw text stored in DB |

### Deployment

Self-hosted VPS (Hostnet.nl), domain: guardproject.nl, HTTPS via Let's Encrypt/Certbot. Initially single-user, designed for multi-user.

---

## Data Model

### Case (case layer — primary empirical unit)

Structured record of a single AAE account. All fields optional except `source_id` and `case_label`; empty = unknown. Enum fields with explicit `none` value distinguish confirmed absence from unknown.

Sections: Identification & Provenance · Context & Demographics · Background History · Onset Conditions · Phenomenological Content · Physical & Physiological Evidence · Psychological Profile · Memory & Retrieval · Aftermath & Long-Term Effects · Corroboration Quality.

Multi-select enum fields stored as JSONB arrays (e.g. `entity_types`, `physiological_symptoms`, `memory_retrieval_method`, `emotional_valence_during_event`).

Key fields: `source_id`, `case_label`, `extraction_method`, `experiencer_nationality`, `experiencer_age_at_event`, `sleep_wake_state_at_onset`, `entity_presence`, `entity_types[]`, `paralysis_reported`, `hypnosis_used`, `memory_retrieval_method[]`, `corroboration_level`, `fantasy_proneness_score`, `dissociation_score`, `positive_transformation_reported`, `ongoing_contact_reported`.

### Source (corpus layer)

```
Source
├── id (UUID)
├── source_type: [case_report | empirical_study | review_paper | theoretical]  ← required; gates extraction schema
├── title, author(s), date, url/doi
├── disciplinary_frame
├── provenance_quality
├── ingestion_date, ingestion_status, ingestion_error
├── raw_text          ← stored in DB for re-analysis
├── file_ref          ← path to original file
└── notes
```

Note: `Account` model removed in v2. Case records replace its function.

### Observation (observation layer)

```
Observation
├── id (UUID)
├── source_id                    (FK → Source; null for corpus_derived)
├── observation_source_type: [literature | corpus_derived]
├── content                      (the claim text)
├── epistemic_status: [reported | corroborated | contested | artefactual | retracted]
├── authored_by                  (researcher name; corpus_derived only)
│
│   ── corpus-derived fields (null when literature) ──
├── query_definition             (code or procedure used)
├── analysis_tool                (e.g. "Python/pandas", "R")
├── corpus_snapshot_date
├── case_count_at_snapshot
├── cases_included: [all | filtered_subset]
├── case_filter_description
├── staleness_flag               (system-derived: true when case count drifts >20%)
│
├── ai_extracted: boolean
├── reviewed_by / reviewed_at
└── tags[]                       (FK → PhenomenonTag)
```

### PhenomenonTag (controlled vocabulary)

```
PhenomenonTag
├── id (UUID)
├── label, category, definition, aliases[]
└── parent_tag_id     ← hierarchy
```

### Concept + ConceptRelationship (knowledge graph)

```
Concept
├── id (UUID), label, concept_type, description, epistemic_status

ConceptRelationship
├── source_concept_id, target_concept_id
├── relationship_type: [..., anomalous_given]    ← flags unexplained tensions
├── strength: [weak | moderate | strong]
└── notes
```

### Hypothesis (synthesis layer)

```
Hypothesis
├── id (UUID), label, description
├── hypothesis_type
├── framework: [neurological | psychological | sociocultural | physical |
│               interdimensional | information_theoretic | psychospiritual | unknown]
├── assumed_ontologies[]: [physicalism | dualism | panpsychism | idealism | unknown | novel]
├── falsification_condition      ← required for epistemic integrity
├── confidence_level: [speculative | low | moderate | high]
├── supporting_observations[]    ← evidence in favour
├── anomalous_observations[]     ← REQUIRED: evidence it cannot explain
├── competing_hypotheses[]
├── parent_hypothesis_id         ← sub-hypothesis support
└── status: [active | dormant | abandoned | merged | refuted]
```

**`anomalous_observations` is structurally enforced** — API emits `X-Warning-Anomalous` and UI shows a red warning when empty.

### TheoreticalFramework (synthesis layer)

```
TheoreticalFramework
├── id (UUID), label, description
├── framework_type
├── assumed_ontologies[]
├── confidence_level
├── status: [active | dormant | abandoned]
├── core_hypotheses[]
└── anomalous_hypotheses[]       ← REQUIRED: API emits X-Warning when empty
```

### EpistemicNote (global annotation layer)

Attaches to any entity without polluting primary records.

---

## Ingestion Pipeline

### Principles

- **AI-assisted human curation**, not full automation
- Silent errors are worse than slow throughput
- Claude API suggests; human reviewer confirms before records enter the corpus

### Dispatch logic

`source.source_type` gates which extraction path runs:

```
Upload PDF → POST /sources/{id}/upload
    ↓
POST /sources/{id}/ingest  { method: "ai" }
    ↓  (202, BackgroundTask)
    ├── source_type == case_report  →  extract_case_from_pdf()  →  CaseDraft
    └── source_type == other        →  extract_observations_from_pdf()  →  ObservationDraft[]
    ↓
Poll GET /sources/{id} for ingestion_status
    ↓  (complete)
Review queue:
    ├── cases:        GET /api/v1/cases/review-queue
    └── observations: GET /api/v1/observations/review-queue
    ↓
Accept / reject with optional field edits
```

### Case extraction prompt principles

- Populate only fields explicitly stated in the source text
- Leave all other fields null (empty = unknown, not absent)
- Flag ambiguous values in `notes`
- Do not infer or interpolate beyond what is written

---

## Application Workflow

1. Add a source (+ PDF) — source type declared upfront, gates downstream schema
2. Extract records — cases for `case_report` sources; observations for all others
3. Review AI-extracted drafts — accept with optional edits, or reject
4. Browse and export cases — filter, inspect, export CSV for external analysis
5. Re-enter computed results as corpus-derived observations
6. Build hypotheses — link supporting and anomalous observations
7. Combine hypotheses into theoretical frameworks
8. Visualise concept relationships in the knowledge graph

---

## Build Order

| Phase | Scope | Status |
|---|---|---|
| **Chat 1** | Project scaffolding, Docker Compose, PostgreSQL schema, SQLAlchemy models, Alembic migrations | ✅ Done |
| **Chat 2** | FastAPI CRUD endpoints, Pydantic schemas, JWT auth | ✅ Done |
| **Chat 3** | Excel import script (`import_excel.py`) | ✅ Done |
| **Chat 4** | PDF ingestion pipeline (pymupdf, OCR, Claude API claim extraction) | ✅ Done |
| **Chat 5** | React frontend core | ✅ Done |
| **Chat 6** | Ingestion review queue UI | ✅ Done |
| **Chat 7** | Knowledge graph view (Cytoscape.js) | ✅ Done |
| **Chat 8** | Hypothesis workspace (synthesis layer) | ✅ Done |
| **Phase A** | Backend data model refactor: Claim→Observation, Hypothesis→{Hypothesis,TheoreticalFramework} | ✅ Done |
| **Phase B** | Frontend refactor: Claim→Observation, new Hypothesis/Framework types, FrameworkList/FrameworkDetail | ✅ Done |
| **Phase C** | Backend: source-type schema refactor, Case model, v2 migration | ✅ Done |
| **Phase D** | Backend: Case CRUD API routes + export endpoint | ✅ Done |
| **Phase E** | Backend: AI ingestion for cases (CaseDraft, case review queue) | ✅ Done |
| **Phase F** | Frontend: CaseList, CaseDetail, CaseReviewQueue, export | ✅ Done |
| **Phase G** | Frontend: corpus-derived observation entry + staleness indicator | ✅ Done |
| **Phase H** | Cleanup: remove dead code, update design principles, smoke test | ⬜ Next |
| **Phase I** | Backend: user management hardening — lock registration behind superuser, admin routes | ✅ Done |

---

## What Was Built

### Chat 1 — Scaffolding
- `docker-compose.yml`: `db` (postgres:16-alpine) + `backend` (FastAPI) + `frontend` (profile-gated)
- `backend/app/db/base.py`: `Base` + `TimestampMixin`
- `backend/app/core/config.py`: `Settings` via pydantic-settings
- `backend/app/models/enums.py`, `corpus.py`, `synthesis.py`: full SQLAlchemy model set
- `alembic/versions/0001_initial_schema.py`: all tables, enums, FTS indexes, `updated_at` trigger

### Chat 2 — CRUD + Auth
- `backend/app/models/user.py`: `User` model; `0002_add_users_table.py`
- `backend/app/core/security.py`: JWT + bcrypt
- `backend/app/api/routes/`: auth, sources, claims, tags, concepts, hypotheses, epistemic_notes

### Chat 3 — Excel Import
- `backend/import_excel.py`: idempotent import, `--dry-run` flag, 51 sources + claims

### Chat 4 — PDF Ingestion Pipeline
- `backend/app/services/ingestion.py`: pymupdf + Tesseract OCR + Claude API extraction
- `backend/app/api/routes/ingest.py`: `POST /sources/{id}/ingest` (AI: 202+background; manual: immediate)
- `alembic/versions/0003_add_ingestion_fields.py`: `ingestion_status`, `ingestion_method`, `ingestion_error`

### Chat 5 — React Frontend
- `frontend/` — Vite + React 18 + TypeScript
- **Design system:** GitHub-style off-white (`#f6f8fa`), white cards, `#1f2328` text, `#0969da` blue accent, Inter + JetBrains Mono fonts
- `src/types/index.ts` — full TypeScript types mirroring backend schemas
- `src/api/` — Axios client with JWT injection + 401 redirect; typed API functions
- `src/components/Shell.tsx` — sidebar nav, `Page` wrapper
- `src/components/ui.tsx` — full shared component library
- `src/pages/`: Login, SourceList, SourceDetail, ClaimList, ReviewQueue, HypothesisList

### Chat 6 — Minor improvements
- Review queue deemed sufficient; added source title to claims; added README.md

### Chat 7 — Knowledge Graph View
- `src/pages/GraphView.tsx` — Cytoscape.js graph at `/graph`
- Node colour by concept type; edge colour/style by relationship type; `anomalous_given` edges in loud red dashed stroke
- Filter bar: concept type, relationship type, anomalous-only toggle
- Click-to-highlight neighbourhood + DetailPanel slide-in
- Cose force-directed layout

### Chat 8 — Hypothesis Workspace
- `src/components/HypothesisDetail.tsx` — inline editing, supporting/anomalous observation slots, ClaimAdder with debounced search
- `src/components/AddHypothesisModal.tsx` — creation modal
- `src/pages/HypothesisList.tsx` — wired up modal + row-click navigation

### Phase A — Backend Data Model Refactor
- `Claim` → `Observation` with four-axis epistemic provenance (`content_type`, `source_modality`, `epistemic_distance`, `collection_method`)
- `Hypothesis` → `{Hypothesis, TheoreticalFramework}`; `TheoreticalFramework` groups hypotheses; both require anomalous entries
- New routes: `observations.py`, `frameworks.py`; rewritten `hypotheses.py`
- `alembic/versions/0004_observation_hypothesis_framework.py`: full schema replacement

### Phase B — Frontend Refactor
- All Claim → Observation references updated throughout
- New pages: `ObservationList`, `FrameworkList`, `FrameworkDetail`
- New components: `AddObservationModal`, `AddFrameworkModal`; updated `HypothesisDetail` for Observation model
- New badges: `ObservationEpistemicBadge`, `ContentTypeBadge`, `CollectionMethodBadge`, `HypothesisTypeBadge`, `FrameworkStatusBadge`, `ConfidenceBadge`

### Phase C — Backend: source-type schema refactor, Case model, v2 migration
- `backend/app/models/enums.py`: removed `SourceType` (old values), `AccountContext`, `CorroborationLevel`, `ContentType`, `SourceModality`, `EpistemicDistance`, `CollectionMethod`, `SampleSizeTier`, `SamplingMethod`; added `SourceType` v2 (`case_report`, `empirical_study`, `review_paper`, `theoretical`), `ObservationSourceType`, `CasesIncluded`, `ExtractionMethod`, and all 27 case-report field enums
- `backend/app/models/corpus.py`: removed `Account` model and all account-related Pydantic schemas; added `Case` model (10 sections, ~100 fields, JSONB multi-selects); updated `Observation` model (removed four-axis provenance fields, added corpus-derived fields, `source_id` now nullable); updated `Source` to add `cases` relationship; updated all Pydantic schemas to match (`SourceCreate` no longer takes `account_detail`; `SourceList`/`SourceRead` add `case_count`; `ObservationCreate`/`Update`/`Read`/`Review` reflect new schema)
- `backend/alembic/versions/0006_v2_schema.py`: drops old tables (`accounts`, `observations`, `observation_tags`, hypothesis observation join tables), drops old enum types (8 types), replaces `source_type_enum` with v2 values, creates 27 new case-layer enum types, creates `cases` table, recreates `observations` with corpus-derived schema, recreates `observation_tags` and hypothesis join tables
- `backend/app/api/routes/observations.py`: updated for new `Observation` schema; staleness flag computed at read time; corpus-derived validation on `POST`
- `backend/app/api/routes/sources.py`: removed `Account` import and creation logic; `_to_source_list`/`_to_source_read` now returns `case_count` for `case_report` sources, `observation_count` for others
- `backend/app/api/routes/ingest.py` + `backend/app/services/ingestion.py`: removed four deleted enum imports; `ObservationDraft` simplified to `content`, `epistemic_status`, `page_ref`, `verbatim`; AI extraction prompt updated to reflect new observation schema

### Phase D — Backend: Case CRUD API routes + export endpoint
- `backend/app/api/routes/cases.py`: `GET/POST /cases`, `GET/PATCH/DELETE /cases/{id}`, `GET /sources/{id}/cases`; filter params: `source_id`, `entity_presence`, `sleep_wake_state_at_onset`, `paralysis_reported`, `hypnosis_used`, `corroboration_level`, `repeat_experiencer`, `q`
- `backend/app/api/routes/export.py`: `GET /cases/export`; same filter params; CSV with pipe-separated JSONB arrays; `StreamingResponse`; `X-Corpus-Snapshot-Date` and `X-Case-Count` response headers
- `backend/app/main.py`: registered `cases` and `export` routers; export router mounted before cases to avoid `/{id}` shadowing `/export`

### Phase F — Frontend: Case browsing, review, and export
- `src/types/index.ts`: updated `SourceType` to v2 values (`case_report`, `empirical_study`, `review_paper`, `theoretical`); added all case-layer enum types and `CaseList`/`CaseRead`/`CaseCreate`/`CaseUpdate`/`CaseReview` interfaces; legacy observation types retained for backward compat
- `src/api/index.ts`: added `getCases`, `getCase`, `createCase`, `updateCase`, `deleteCase`, `getSourceCases`, `getCaseReviewQueue`, `reviewCase`, `exportCases` (returns blob + response headers for provenance)
- `src/components/ui.tsx`: updated `SourceTypeBadge` for v2 source types with colour coding; added `ExtractionMethodBadge`, `CorroborationBadge`, `PresenceBadge`
- `src/components/Shell.tsx`: added Cases (`/cases`) and Case Review (`/cases/review`) nav entries with correct active-state logic
- `src/App.tsx`: added routes for `/cases`, `/cases/review`, `/cases/:id`
- `src/components/AddCaseModal.tsx`: minimal creation modal (case label, source selector filtered to case_report sources, extraction method); navigates to CaseDetail on create
- `src/pages/CaseList.tsx`: paginated case table with filter bar (entity presence, sleep/wake, paralysis, corroboration, hypnosis, repeat experiencer, free text); export CSV button with confirmation modal showing case count
- `src/pages/CaseDetail.tsx`: all 10 sections (~100 fields) rendered read-only; section-level inline editing with save/cancel; multi-select enum fields as toggle chip groups; delete with confirmation; sidebar with review status, key fields, and provenance
- `src/pages/CaseReviewQueue.tsx`: full-field review cards for AI-extracted drafts; accept (marks reviewed) / reject (deletes draft); "open for editing" link to CaseDetail
- `src/components/AddSourceModal.tsx`: updated TYPE_OPTIONS to v2 source types
- `src/pages/SourceList.tsx`: updated type filter options; conditional items column (cases vs. observations)
- `src/pages/SourceDetail.tsx`: case_report sources show Cases section + Add Case + review queue link; other source types unchanged; conditional ingestion post-action links

### Phase E — Backend: AI ingestion for cases
- `backend/app/models/corpus.py`: added `reviewed` (bool, default false), `reviewed_by`, `reviewed_at` to `Case` ORM model and `CaseList`/`CaseRead` Pydantic schemas; added `CaseReview` schema (`accepted: bool`, `edits: Optional[CaseUpdate]`)
- `backend/alembic/versions/0007_case_review_fields.py`: adds three review columns to `cases` table
- `backend/app/services/ingestion.py`: added `CaseDraft` dataclass; added `_CASE_SYSTEM_PROMPT` (full case extraction prompt — 10 sections, all enum values, strict populate-only-what's-stated rules); added `_call_claude_case()` (calls Claude, strips null/empty fields, returns `CaseDraft`); added `_insert_case()` (inserts with `extraction_method=AI_ASSISTED`, `reviewed=False`); updated `run_ingestion()` dispatch — routes `case_report` sources to `_call_claude_case()`, all others to existing observation extraction path; added `cases_inserted` to `IngestionResult`
- `backend/app/api/routes/cases.py`: added `GET /cases/review-queue` (unreviewed AI-extracted cases, oldest first); added `POST /cases/{id}/review` (accept with optional field edits → sets reviewed fields; reject → deletes draft)
- `backend/app/api/routes/ingest.py`: AI path response message dynamically references `/cases/review-queue` or `/observations/review-queue` based on `source_type`

### Phase G — Frontend: corpus-derived observation entry + staleness indicator
- `src/components/AddObservationModal.tsx`: added `observation_source_type` toggle (Literature / Corpus-derived); corpus-derived mode hides source selector and shows `query_definition`, `analysis_tool`, `corpus_snapshot_date`, `case_count_at_snapshot`, `cases_included`, `case_filter_description`; `authored_by` visible in both modes
- `src/pages/ObservationList.tsx`: amber `⚠ stale` badge on corpus-derived observations where `staleness_flag === true`; hover tooltip shows snapshot case count vs. current count

### Phase I — Backend: user management hardening
- `backend/app/core/security.py`: added `get_current_superuser` dependency — raises 403 if `current_user.is_superuser` is false
- `backend/app/models/user.py`: added `Optional` import; added `UserUpdate` Pydantic schema (`is_active`, `is_superuser`)
- `backend/app/api/routes/auth.py`: `POST /auth/register` now requires `get_current_superuser` — open registration is closed; only superusers can create accounts
- `backend/app/api/routes/admin.py`: new file; `GET /admin/users` (list all accounts), `PATCH /admin/users/{user_id}` (toggle `is_active`/`is_superuser`), `DELETE /admin/users/{user_id}` (hard delete); all endpoints superuser-gated; self-modification and self-deletion guarded
- `backend/app/main.py`: registered `admin` router

---

## Phase C — Implementation Instructions

**Scope:** Replace the current broad-enum observation model with source-type-discriminated schemas. Introduce the `Case` model. Drop existing observations (no migration). Remove `Account`.

**Read this before writing any code.** The v2 schema is a breaking change at the database layer. Work top-down: enums → models → migration → routes. Do not attempt to migrate existing observation data — drop and recreate.

### Step 1 — `backend/app/models/enums.py`

**Remove** these enums (no longer used after v2):
- `ContentType`, `SourceModality`, `EpistemicDistance`, `CollectionMethod`

**Add** `SourceType`:
```python
class SourceType(str, Enum):
    CASE_REPORT = "case_report"
    EMPIRICAL_STUDY = "empirical_study"
    REVIEW_PAPER = "review_paper"
    THEORETICAL = "theoretical"
```

**Add** `ObservationSourceType`:
```python
class ObservationSourceType(str, Enum):
    LITERATURE = "literature"
    CORPUS_DERIVED = "corpus_derived"
```

**Add** all case report enums. Every enum below maps directly to the case report schema field of the same name:

```python
class ExtractionMethod(str, Enum):
    MANUAL = "manual"
    AI_ASSISTED = "ai_assisted"
    IMPORTED = "imported"

class EventDatePrecision(str, Enum):
    EXACT = "exact"
    MONTH_AND_YEAR = "month_and_year"
    YEAR_ONLY = "year_only"
    DECADE = "decade"
    UNKNOWN = "unknown"

class SleepWakeState(str, Enum):
    FULLY_AWAKE = "fully_awake"
    DROWSY = "drowsy"
    HYPNAGOGIC = "hypnagogic"
    HYPNOPOMPIC = "hypnopompic"
    ASLEEP = "asleep"
    UNKNOWN = "unknown"

class PhysicalLocationType(str, Enum):
    BEDROOM = "bedroom"
    OTHER_INDOOR = "other_indoor"
    VEHICLE = "vehicle"
    OUTDOOR_RURAL = "outdoor_rural"
    OUTDOOR_URBAN = "outdoor_urban"
    UNKNOWN = "unknown"

class AloneatOnset(str, Enum):
    ALONE = "alone"
    OTHERS_PRESENT = "others_present"
    UNKNOWN = "unknown"

class PsychologicalStateType(str, Enum):
    NORMAL = "normal"
    STRESSED = "stressed"
    ANXIOUS = "anxious"
    DEPRESSED = "depressed"
    ELATED = "elated"
    DISSOCIATED = "dissociated"
    UNKNOWN = "unknown"

class AlteredStateDepth(str, Enum):
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    DEEP = "deep"
    UNKNOWN = "unknown"

class AlteredStateType(str, Enum):  # multi-select
    DROWSINESS = "drowsiness"
    INTOXICATION = "intoxication"
    MEDITATION = "meditation"
    DISSOCIATION = "dissociation"
    FEVER = "fever"
    SENSORY_DEPRIVATION = "sensory_deprivation"
    OTHER = "other"

class EventDuration(str, Enum):
    SECONDS = "seconds"
    MINUTES = "minutes"
    UNDER_ONE_HOUR = "under_one_hour"
    ONE_TO_SEVERAL_HOURS = "one_to_several_hours"
    UNKNOWN = "unknown"

class PresenceAbsenceUnknown(str, Enum):
    NONE = "none"
    YES = "yes"
    UNKNOWN = "unknown"

class ParalysisExtent(str, Enum):
    NONE = "none"
    PARTIAL = "partial"
    FULL = "full"
    UNKNOWN = "unknown"

class EntityCount(str, Enum):
    ONE = "one"
    TWO_TO_FIVE = "two_to_five"
    MORE_THAN_FIVE = "more_than_five"
    UNKNOWN = "unknown"

class EntityType(str, Enum):  # multi-select
    GREY = "grey"
    NORDIC = "nordic"
    REPTILIAN = "reptilian"
    SHADOW = "shadow"
    ROBOTIC = "robotic"
    INSECTOID = "insectoid"
    HYBRID = "hybrid"
    LUMINOUS = "luminous"
    AMORPHOUS = "amorphous"
    OTHER = "other"
    UNKNOWN = "unknown"

class EntityCommunicationModality(str, Enum):  # multi-select
    VERBAL_AUDITORY = "verbal_auditory"
    TELEPATHIC = "telepathic"
    VISUAL = "visual"
    GESTURAL = "gestural"
    EMOTIONAL_TRANSFER = "emotional_transfer"
    OTHER = "other"

class EntityCommunicationContentType(str, Enum):  # multi-select
    EDUCATIONAL = "educational"
    WARNING = "warning"
    MISSION = "mission"
    PERSONAL = "personal"
    PROCEDURAL = "procedural"
    UNINTELLIGIBLE = "unintelligible"
    OTHER = "other"

class PhysiologicalSymptom(str, Enum):  # multi-select
    CHEST_PRESSURE = "chest_pressure"
    VISUAL_HALLUCINATIONS = "visual_hallucinations"
    AUDITORY_HALLUCINATIONS = "auditory_hallucinations"
    NAUSEA = "nausea"
    PAIN = "pain"
    VIBRATION = "vibration"
    HEAT_OR_COLD = "heat_or_cold"
    PARALYSIS = "paralysis"
    PALPITATIONS = "palpitations"
    OTHER = "other"
    NONE = "none"

class EmotionalValence(str, Enum):  # multi-select
    TERROR = "terror"
    ANXIETY = "anxiety"
    AWE = "awe"
    CALM = "calm"
    JOY = "joy"
    CONFUSION = "confusion"
    SADNESS = "sadness"
    NONE_REPORTED = "none_reported"
    UNKNOWN = "unknown"

class CorroborationLevelV2(str, Enum):
    TESTIMONY_ONLY = "testimony_only"
    CORROBORATED_BY_WITNESS = "corroborated_by_witness"
    CORROBORATED_BY_PHYSICAL_EVIDENCE = "corroborated_by_physical_evidence"
    CORROBORATED_BY_BOTH = "corroborated_by_both"
    UNKNOWN = "unknown"

class MemoryRetrievalMethod(str, Enum):  # multi-select
    SPONTANEOUS_RECALL = "spontaneous_recall"
    HYPNOTIC_REGRESSION = "hypnotic_regression"
    GUIDED_IMAGERY = "guided_imagery"
    THERAPY = "therapy"
    SELF_HYPNOSIS = "self_hypnosis"
    DREAM_RECALL = "dream_recall"
    JOURNALING = "journaling"
    INVESTIGATOR_INTERVIEW = "investigator_interview"
    UNKNOWN = "unknown"

class AccountConsistency(str, Enum):
    NOT_ASSESSED = "not_assessed"
    CONSISTENT = "consistent"
    MINOR_VARIATIONS = "minor_variations"
    SIGNIFICANT_VARIATIONS = "significant_variations"
    CONTRADICTORY = "contradictory"

class EducationLevel(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"
    POSTGRADUATE = "postgraduate"
    NOT_REPORTED = "not_reported"

class MaritalStatus(str, Enum):
    SINGLE = "single"
    MARRIED = "married"
    PARTNERED = "partnered"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    NOT_REPORTED = "not_reported"

class Religiosity(str, Enum):
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    NOT_REPORTED = "not_reported"

class PriorInterestLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    NOT_REPORTED = "not_reported"

class HistoryPresence(str, Enum):
    NONE = "none"
    SUSPECTED = "suspected"
    CONFIRMED = "confirmed"
    NOT_REPORTED = "not_reported"

class MotivationalFactors(str, Enum):
    NONE_APPARENT = "none_apparent"
    SUSPECTED = "suspected"
    CONFIRMED = "confirmed"
    NOT_ASSESSED = "not_assessed"

class RepeatExperiencer(str, Enum):
    FIRST_EXPERIENCE = "first_experience"
    REPEAT_EXPERIENCER = "repeat_experiencer"
    NOT_REPORTED = "not_reported"

class ExperiencerSex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    INTERSEX = "intersex"
    NOT_REPORTED = "not_reported"

class CasesIncluded(str, Enum):
    ALL = "all"
    FILTERED_SUBSET = "filtered_subset"

class PsychometricPresence(str, Enum):
    NO = "no"
    YES = "yes"
    UNKNOWN = "unknown"

class PsychometricLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"

class ClinicalLevel(str, Enum):
    NONE = "none"
    SUBCLINICAL = "subclinical"
    CLINICAL = "clinical"

class ClinicalPresence(str, Enum):
    NONE = "none"
    SUBCLINICAL = "subclinical"
    CLINICAL_DIAGNOSIS = "clinical_diagnosis"

class CommunityType(str, Enum):  # multi-select
    UFO_GROUP = "ufo_group"
    THERAPY = "therapy"
    RELIGION = "religion"
    ONLINE_COMMUNITY = "online_community"
    RESEARCH_PARTICIPATION = "research_participation"
    OTHER = "other"
```

### Step 2 — `backend/app/models/corpus.py`

**Remove** the `Account` model entirely.

**Add `source_type` to `Source`:**
```python
source_type: Mapped[SourceType] = mapped_column(
    Enum(SourceType, name="source_type_enum", create_type=False,
         values_callable=lambda x: [e.value for e in x]),
    nullable=False,
)
```

**Add the `Case` model** after `Source`. All fields nullable except `source_id` and `case_label`. Multi-select fields use `JSONB`. Use `Optional[str]` for free-text fields and `Optional[EnumType]` for single-select enums. Example pattern for a JSONB multi-select:

```python
entity_types: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
```

Full field list (all nullable unless noted):

```python
class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    case_label: Mapped[str] = mapped_column(String(200), nullable=False)
    extraction_method: Mapped[Optional[ExtractionMethod]] = ...
    extraction_date: Mapped[Optional[date]] = ...
    extracted_by: Mapped[Optional[str]] = mapped_column(String(200))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Section 2 — Context & Demographics
    experiencer_nationality: Mapped[Optional[str]] = mapped_column(String(100))
    experiencer_ethnicity: Mapped[Optional[str]] = mapped_column(String(100))
    experiencer_age_at_event: Mapped[Optional[int]] = ...
    experiencer_sex: Mapped[Optional[ExperiencerSex]] = ...
    experiencer_gender: Mapped[Optional[str]] = mapped_column(String(100))
    experiencer_occupation: Mapped[Optional[str]] = mapped_column(String(200))
    education_level: Mapped[Optional[EducationLevel]] = ...
    marital_status: Mapped[Optional[MaritalStatus]] = ...
    religiosity: Mapped[Optional[Religiosity]] = ...

    # Section 3 — Background History
    prior_ufo_interest: Mapped[Optional[PriorInterestLevel]] = ...
    prior_paranormal_belief: Mapped[Optional[PriorInterestLevel]] = ...
    cultural_media_exposure_to_aae: Mapped[Optional[PriorInterestLevel]] = ...
    childhood_trauma_history: Mapped[Optional[HistoryPresence]] = ...
    childhood_abuse_history: Mapped[Optional[HistoryPresence]] = ...
    surgical_history_present: Mapped[Optional[HistoryPresence]] = ...
    surgical_history_detail: Mapped[Optional[str]] = mapped_column(Text)
    neuropsychiatric_history_present: Mapped[Optional[HistoryPresence]] = ...
    neuropsychiatric_history_detail: Mapped[Optional[str]] = mapped_column(Text)
    substance_use_present: Mapped[Optional[HistoryPresence]] = ...
    substance_use_detail: Mapped[Optional[str]] = mapped_column(Text)
    motivational_factors_present: Mapped[Optional[MotivationalFactors]] = ...
    motivational_factors_detail: Mapped[Optional[str]] = mapped_column(Text)
    repeat_experiencer: Mapped[Optional[RepeatExperiencer]] = ...

    # Section 4 — Onset Conditions
    event_date: Mapped[Optional[date]] = ...
    event_date_precision: Mapped[Optional[EventDatePrecision]] = ...
    event_time_of_day: Mapped[Optional[str]] = mapped_column(String(50))  # enum: early_morning|morning|afternoon|evening|night|unknown
    sleep_wake_state_at_onset: Mapped[Optional[SleepWakeState]] = ...
    physical_location_type: Mapped[Optional[PhysicalLocationType]] = ...
    physical_location_detail: Mapped[Optional[str]] = mapped_column(Text)
    alone_at_onset: Mapped[Optional[AloneatOnset]] = ...
    witness_count: Mapped[Optional[int]] = ...
    environmental_stimuli_present: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    environmental_stimuli_detail: Mapped[Optional[str]] = mapped_column(Text)
    psychological_state_preceding: Mapped[Optional[PsychologicalStateType]] = ...
    psychological_state_detail: Mapped[Optional[str]] = mapped_column(Text)
    altered_state_at_onset: Mapped[Optional[AlteredStateDepth]] = ...
    altered_state_types: Mapped[Optional[list]] = mapped_column(JSONB)  # AlteredStateType[]

    # Section 5 — Phenomenological Content
    duration_of_experience: Mapped[Optional[EventDuration]] = ...
    missing_time_reported: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    missing_time_duration: Mapped[Optional[str]] = mapped_column(String(200))
    paralysis_reported: Mapped[Optional[ParalysisExtent]] = ...
    perceived_physical_transport: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    out_of_body_sensation: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    floating_sensation: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    tunnel_or_passage_sensation: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    entity_presence: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    entity_count: Mapped[Optional[EntityCount]] = ...
    entity_types: Mapped[Optional[list]] = mapped_column(JSONB)  # EntityType[]
    entity_types_detail: Mapped[Optional[str]] = mapped_column(Text)
    entity_communication_present: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    entity_communication_modality: Mapped[Optional[list]] = mapped_column(JSONB)  # EntityCommunicationModality[]
    entity_communication_content_type: Mapped[Optional[list]] = mapped_column(JSONB)  # EntityCommunicationContentType[]
    educational_or_mission_messaging: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    medical_procedure_motif: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    medical_procedure_detail: Mapped[Optional[str]] = mapped_column(Text)
    reproductive_or_sexual_motif: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    reproductive_motif_detail: Mapped[Optional[str]] = mapped_column(Text)
    craft_or_vehicle_reported: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    craft_description: Mapped[Optional[str]] = mapped_column(Text)
    physical_environment_changes: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    physical_environment_changes_detail: Mapped[Optional[str]] = mapped_column(Text)
    event_sequence_described: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    event_sequence_detail: Mapped[Optional[str]] = mapped_column(Text)
    physiological_symptoms: Mapped[Optional[list]] = mapped_column(JSONB)  # PhysiologicalSymptom[]
    physiological_symptoms_detail: Mapped[Optional[str]] = mapped_column(Text)
    emotional_valence_during_event: Mapped[Optional[list]] = mapped_column(JSONB)  # EmotionalValence[]
    emotional_valence_detail: Mapped[Optional[str]] = mapped_column(Text)

    # Section 6 — Physical & Physiological Evidence
    physical_marks_present: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    physical_marks_detail: Mapped[Optional[str]] = mapped_column(Text)
    physical_marks_medically_examined: Mapped[Optional[PsychometricPresence]] = ...
    environmental_physical_evidence: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    environmental_physical_evidence_detail: Mapped[Optional[str]] = mapped_column(Text)
    independent_corroboration_present: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    independent_corroboration_detail: Mapped[Optional[str]] = mapped_column(Text)
    eeg_or_neurological_data_available: Mapped[Optional[PsychometricPresence]] = ...
    eeg_data_detail: Mapped[Optional[str]] = mapped_column(Text)
    blood_or_toxicology_data_available: Mapped[Optional[PsychometricPresence]] = ...
    blood_data_detail: Mapped[Optional[str]] = mapped_column(Text)

    # Section 7 — Psychological Profile
    fantasy_proneness_assessed: Mapped[Optional[PsychometricPresence]] = ...
    fantasy_proneness_score: Mapped[Optional[float]] = ...
    fantasy_proneness_instrument: Mapped[Optional[str]] = mapped_column(String(200))
    hypnotic_suggestibility_assessed: Mapped[Optional[PsychometricPresence]] = ...
    hypnotic_suggestibility_score: Mapped[Optional[float]] = ...
    hypnotic_suggestibility_instrument: Mapped[Optional[str]] = mapped_column(String(200))
    boundary_thinness_assessed: Mapped[Optional[PsychometricPresence]] = ...
    boundary_thinness_score: Mapped[Optional[float]] = ...
    boundary_thinness_instrument: Mapped[Optional[str]] = mapped_column(String(200))
    dissociation_assessed: Mapped[Optional[PsychometricPresence]] = ...
    dissociation_score: Mapped[Optional[float]] = ...
    dissociation_instrument: Mapped[Optional[str]] = mapped_column(String(200))
    ptsd_symptoms_assessed: Mapped[Optional[PsychometricPresence]] = ...
    ptsd_symptoms_present: Mapped[Optional[ClinicalLevel]] = ...
    ptsd_instrument: Mapped[Optional[str]] = mapped_column(String(200))
    psychopathology_screened: Mapped[Optional[PsychometricPresence]] = ...
    psychopathology_findings: Mapped[Optional[ClinicalPresence]] = ...
    psychopathology_detail: Mapped[Optional[str]] = mapped_column(Text)
    need_for_meaning_assessed: Mapped[Optional[PsychometricPresence]] = ...
    need_for_meaning_level: Mapped[Optional[PsychometricLevel]] = ...
    self_escape_motivation_assessed: Mapped[Optional[PsychometricPresence]] = ...
    self_escape_motivation_level: Mapped[Optional[PsychometricLevel]] = ...

    # Section 8 — Memory & Retrieval
    memory_retrieval_method: Mapped[Optional[list]] = mapped_column(JSONB)  # MemoryRetrievalMethod[]
    hypnosis_used: Mapped[Optional[PsychometricPresence]] = ...
    hypnotist_identity: Mapped[Optional[str]] = mapped_column(String(200))
    investigator_or_therapist_involved: Mapped[Optional[PsychometricPresence]] = ...
    investigator_detail: Mapped[Optional[str]] = mapped_column(Text)
    account_consistency_over_time: Mapped[Optional[AccountConsistency]] = ...
    number_of_accounts_on_record: Mapped[Optional[int]] = ...

    # Section 9 — Aftermath
    positive_transformation_reported: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    positive_transformation_detail: Mapped[Optional[str]] = mapped_column(Text)
    negative_psychological_aftermath: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    negative_aftermath_detail: Mapped[Optional[str]] = mapped_column(Text)
    ongoing_contact_reported: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    ongoing_contact_detail: Mapped[Optional[str]] = mapped_column(Text)
    changed_worldview_reported: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    worldview_change_detail: Mapped[Optional[str]] = mapped_column(Text)
    sought_community_or_support: Mapped[Optional[PresenceAbsenceUnknown]] = ...
    community_type: Mapped[Optional[list]] = mapped_column(JSONB)  # CommunityType[]

    # Section 10 — Corroboration Quality
    corroboration_level: Mapped[Optional[CorroborationLevelV2]] = ...
    case_quality_notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="cases")
```

Add `cases` back-populates to `Source`:
```python
cases: Mapped[List["Case"]] = relationship("Case", back_populates="source", cascade="all, delete-orphan")
```

### Step 3 — `backend/app/models/synthesis.py`

**Update `Observation` model** — remove four-axis provenance fields, add corpus-derived fields:

Remove: `content_type`, `source_modality`, `epistemic_distance`, `collection_method`, `sample_n`, `sample_size_tier`, `sampling_method`, `inclusion_criteria_documented`.

Add:
```python
observation_source_type: Mapped[ObservationSourceType] = mapped_column(
    Enum(ObservationSourceType, name="observation_source_type_enum", create_type=False,
         values_callable=lambda x: [e.value for e in x]),
    nullable=False, server_default="literature",
)
authored_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
query_definition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
analysis_tool: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
corpus_snapshot_date: Mapped[Optional[date]] = mapped_column(nullable=True)
case_count_at_snapshot: Mapped[Optional[int]] = mapped_column(nullable=True)
cases_included: Mapped[Optional[CasesIncluded]] = mapped_column(
    Enum(CasesIncluded, name="cases_included_enum", create_type=False,
         values_callable=lambda x: [e.value for e in x]),
    nullable=True,
)
case_filter_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

`staleness_flag` is computed at read time in the API route (not stored); see Phase D.

All other synthesis models (`Hypothesis`, `TheoreticalFramework`, `Concept`, `ConceptRelationship`, `EpistemicNote`) are unchanged.

### Step 4 — `alembic/versions/0005_v2_schema.py`

Operations in order:

1. Drop tables: `observations`, `observation_tags`, `observation_review`, `accounts`
2. Drop enum types: `content_type_enum`, `source_modality_enum`, `epistemic_distance_enum`, `collection_method_enum`, `sample_size_tier_enum`, `sampling_method_enum`, `corroboration_level_enum`
3. Create new enum types for all enums added in Step 1 (use `CREATE TYPE ... AS ENUM`)
4. Add column `source_type` (type `source_type_enum`) to `sources` table, `NOT NULL` with a default of `'empirical_study'` for existing rows; then remove the default
5. Create `cases` table with all columns from the `Case` model
6. Recreate `observations` table with new schema (remove four-axis provenance columns, add corpus-derived columns)
7. Recreate `observation_tags` table
8. Recreate `observation_review` table

Do not touch any synthesis tables (`hypotheses`, `theoretical_frameworks`, `concepts`, `concept_relationships`, `epistemic_notes`, or their join tables).

---

## Phase D — Implementation Instructions

**Scope:** Case CRUD API routes and CSV export endpoint.

### `backend/app/api/routes/cases.py`

Pydantic schemas needed: `CaseCreate`, `CaseUpdate`, `CaseRead`, `CaseList` (lightweight, for list view).

Routes:
- `GET /api/v1/cases` — paginated list; filter params: `source_id`, `entity_presence`, `sleep_wake_state_at_onset`, `paralysis_reported`, `hypnosis_used`, `corroboration_level`, `repeat_experiencer`, `q` (full-text on `case_label` + `notes`)
- `GET /api/v1/cases/{id}` — full `CaseRead`
- `POST /api/v1/cases` — create; returns `CaseRead`
- `PATCH /api/v1/cases/{id}` — partial update; returns `CaseRead`
- `DELETE /api/v1/cases/{id}` — 204
- `GET /api/v1/sources/{id}/cases` — cases for a source; returns paginated `CaseList`

### `backend/app/api/routes/export.py`

- `GET /api/v1/cases/export`
- Accepts same filter params as case list
- Returns CSV with `Content-Disposition: attachment; filename="cases_export_{date}.csv"`
- Response headers include `X-Corpus-Snapshot-Date` (today's date) and `X-Case-Count` (number of rows exported)
- All columns included; JSONB arrays serialised as pipe-separated strings (e.g. `"grey|nordic"`)
- Streamed response using `StreamingResponse` with a CSV generator

### `backend/app/api/routes/observations.py`

Add staleness flag logic to the observation read path:
```python
# After fetching observation from DB:
staleness_flag = False
if obs.observation_source_type == ObservationSourceType.CORPUS_DERIVED:
    if obs.case_count_at_snapshot is not None:
        current_count = db.query(func.count(Case.id)).scalar()
        staleness_flag = current_count > obs.case_count_at_snapshot * 1.2
```

Include `staleness_flag` in `ObservationRead` as a computed field (not stored).

Update `POST /api/v1/observations` to validate corpus-derived fields: when `observation_source_type = corpus_derived`, require `query_definition`, `corpus_snapshot_date`, `case_count_at_snapshot`; `source_id` must be null.

### `backend/app/api/routes/sources.py`

- `POST /api/v1/sources`: `source_type` is now required
- `GET /api/v1/sources/{id}`: response includes `case_count` (count of linked cases) when `source_type == case_report`, `observation_count` otherwise

### `backend/app/main.py`

Register new routers:
```python
from app.api.routes import cases, export
app.include_router(cases.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
```

---

## Phase E — Implementation Instructions

**Scope:** AI ingestion pipeline for case report sources.

### `backend/app/services/ingestion.py`

Add `CaseDraft` dataclass mirroring `Case` with all fields `Optional`.

Add `extract_case_from_pdf(source: Source, raw_text: str, db: Session) -> IngestionResult`:
- Sends raw text to Claude API with the case extraction prompt (see below)
- Parses JSON response into a `CaseDraft`
- Inserts a `Case` record with `extraction_method = ai_assisted`, all fields from draft, `reviewed = False`
- Returns `IngestionResult`

**Case extraction prompt principles** (encode in the prompt string):
- You are extracting structured data from a case report of an alien abduction experience
- Populate ONLY fields that are explicitly stated in the source text
- Leave all other fields as null — do not infer, interpolate, or assume
- For multi-select fields, return a JSON array of valid enum values
- For enum fields, return the exact enum value string or null
- If a value is ambiguous, set the field to null and add a note to the `notes` field
- Do not add any information not present in the source text
- Return a single JSON object matching the CaseDraft schema

Update dispatch logic in `run_ingestion()`:
```python
if source.source_type == SourceType.CASE_REPORT:
    return extract_case_from_pdf(source, raw_text, db)
else:
    return extract_observations_from_pdf(source, raw_text, db)
```

### `backend/app/api/routes/cases.py`

Add review queue endpoints:
- `GET /api/v1/cases/review-queue` — cases where `reviewed = False` and `extraction_method = ai_assisted`; ordered by `created_at` asc
- `POST /api/v1/cases/{id}/review` — body: `{ accepted: bool, edits?: Partial<CaseUpdate> }`; if accepted, apply edits and set `reviewed = True`; if rejected, delete the case record

Add `reviewed: bool` and `reviewed_by: Optional[str]` and `reviewed_at: Optional[datetime]` fields to the `Case` model and migration.

---

## Phase F — Implementation Instructions

**Scope:** Frontend case browsing, entry, review, and export.

### New files

`src/pages/CaseList.tsx` — route `/cases`
- Table: case label, source title, entity presence badge, sleep/wake state badge, corroboration level badge, created date
- Filter bar: source (select), entity presence (select), sleep/wake state (select), hypnosis used (select), corroboration level (select), repeat experiencer (select), free-text search
- Export button: calls `exportCases()` with active filters; shows confirmation modal with case count and snapshot date before downloading
- Pagination

`src/pages/CaseDetail.tsx` — route `/cases/:id`
- Rendered in sections matching the schema (use section headings from the schema)
- Each field: label, current value (rendered appropriately for type), inline edit on click
- Multi-select enum fields: toggle chip groups
- Single-select enum fields: dropdowns including explicit `unknown` / `none` options
- Free-text fields: inline textarea
- Score fields: number input with instrument name field alongside
- Delete button with confirmation dialog
- Back link to source

`src/pages/CaseReviewQueue.tsx` — route `/cases/review`
- Review cards for AI-extracted case drafts
- Each card: case label, source title, all non-null extracted fields rendered in sections
- Reviewer can edit any field before accepting
- Accept / Reject buttons

`src/components/AddCaseModal.tsx`
- Minimal: case label (required), source selector (required, filtered to case_report sources only), extraction method (default: manual)
- On create: navigate to `CaseDetail` for full field entry

### Updated files

`src/pages/SourceDetail.tsx`
- When `source.source_type === 'case_report'`: show Cases tab (case list for this source, Add Case button, AI Ingest button); hide Observations tab
- When other source types: unchanged

`src/components/Shell.tsx`
- Add nav entry: `CAS` → `/cases`
- Add nav entry: `CRV` → `/cases/review` (case review queue)

`src/App.tsx`
- Add routes: `/cases` → `CaseList`, `/cases/review` → `CaseReviewQueue`, `/cases/:id` → `CaseDetail`

`src/api/index.ts`
- Add: `getCases(filters)`, `getCase(id)`, `createCase(data)`, `updateCase(id, data)`, `deleteCase(id)`, `getSourceCases(sourceId)`, `getCaseReviewQueue()`, `reviewCase(id, data)`, `exportCases(filters)` (returns blob, triggers download)

`src/types/index.ts`
- Add: `CaseRead`, `CaseCreate`, `CaseUpdate`, `CaseList` and all new case-layer enum types

---

## Phase G — Implementation Instructions

**Scope:** Corpus-derived observation entry and staleness indicator.

### `src/components/AddObservationModal.tsx`

Add `observation_source_type` toggle at the top: `Literature` (default) | `Corpus-derived`.

When `corpus_derived` is selected:
- Hide: source selector, PDF-related fields
- Show: `query_definition` (textarea, required), `analysis_tool` (text input), `corpus_snapshot_date` (date picker, required), `case_count_at_snapshot` (number, required), `cases_included` (select: all / filtered_subset), `case_filter_description` (textarea, shown when filtered_subset)
- `authored_by` field (text input) visible for both modes

### `src/pages/ObservationList.tsx`

For corpus-derived observations where `staleness_flag === true`, show an amber `⚠ stale` badge alongside the observation. Tooltip on hover: "Computed against {case_count_at_snapshot} cases; corpus now has {current_count} cases."

---

## Phase H — Implementation Instructions

**Scope:** Cleanup and smoke test.

- Delete `backend/import_excel.py` (superseded; data dropped in migration)
- Remove any remaining `Account` references in frontend (types, API calls, UI)
- Remove four-axis provenance badge components from `src/components/ui.tsx` if unused: `ContentTypeBadge`, `CollectionMethodBadge`
- Update CLAUDE.md architecture section if any details changed during implementation
- Smoke test sequence:
  1. Add a `case_report` source with PDF
  2. Trigger AI ingestion → verify `CaseDraft` created
  3. Review and accept in case review queue
  4. Browse case in CaseList, open CaseDetail, edit a field
  5. Export CSV with no filters; verify headers include snapshot date and case count
  6. Add a `corpus_derived` observation manually, referencing the export
  7. Link observation to a hypothesis as supporting evidence
  8. Verify staleness flag appears after adding another case

---

## Running

```bash
# First run
cp .env.example .env      # set DB_PASSWORD, SECRET_KEY, ANTHROPIC_API_KEY

docker compose up db -d
docker compose run --rm backend alembic upgrade head

# Backend only
docker compose up backend

# Backend + frontend
docker compose --profile frontend up
```

**Endpoints:**
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/api/docs

**First user:** `POST /api/v1/auth/register` with `{ email, username, password }`

---

## Key Design Principles

1. **Cases are not observations.** A case is a datum about a single experiencer. An observation is a derived claim about a pattern across cases. Never link cases directly to hypotheses — the aggregation step is required and epistemically meaningful.

2. **Anomalies are structurally required.** `anomalous_observations` on `Hypothesis` and `anomalous_hypotheses` on `TheoreticalFramework` are not optional. The API emits `X-Warning` headers and the UI surfaces red/amber warnings when these are empty.

3. **Confirmation bias is countered at the schema level.** Not by user discipline. The schema enforces it.

4. **Empty means unknown, not absent.** All case fields are nullable. Absence of a value means the information was not available in the source, not that the feature was absent. Confirmed absence is encoded as an explicit enum value (`none`, `not_reported`, etc.).

5. **The analysis layer lives outside the system.** The KMS collects and curates; external tools (R, Python) analyse. The export endpoint is the formal boundary. Corpus-derived observations re-enter the system with full provenance so the analytical step is auditable.

6. **Epistemic transparency throughout.** Every observation carries its source type and provenance. Every corpus-derived observation carries the query that produced it and the snapshot it was computed against. Staleness is surfaced, not hidden.

7. **Ontological agnosticism at the infrastructure level.** `assumed_ontologies` makes paradigm assumptions explicit and queryable rather than encoding them into the schema.