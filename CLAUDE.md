# CLAUDE.md — Abduction Research Knowledge Management System

## Project Overview

A self-hosted web application for rigorous scientific study of the alien abduction experience. The system supports systematic phenomenological mapping of first-person accounts, cross-disciplinary literature management, and structured hypothesis development.

**Epistemological stance:** Neither credulous nor dismissive. First-person accounts are treated as empirical data requiring explanation. Anomalies are signals, not noise. The system is designed to counteract confirmation bias structurally.

---

## Architecture

### Three-layer data model

```
CORPUS LAYER          CLAIM LAYER           SYNTHESIS LAYER
(raw sources)    →    (extracted atoms)  →  (built knowledge)
```

The Claim layer is the critical intermediary — most tools collapse this, losing epistemic traceability. Every claim is attributed to a source, carries an epistemic status, and is tagged at the atom level.

### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL 16 | Relational model required; full-text search, JSONB, recursive queries for tag hierarchy |
| Backend | Python + FastAPI | Clean REST API, Pydantic validation, Python AI/NLP ecosystem |
| Frontend | React | Mature ecosystem for graph viz and complex UI |
| Graph viz | Cytoscape.js | Better than vis.js for analytical filtering and programmatic graph analysis |
| AI assistance | Anthropic Claude API | Claim extraction, pattern detection, hypothesis stress-testing |
| Infrastructure | Docker Compose | One-command startup; clean path to VPS deployment |
| File storage | Local filesystem (MVP) → S3 | PDFs/originals stored as files; raw text stored in DB |

### Deployment target

Web app (not desktop). Initially single-user, designed for multi-user from the start. Auth layer added in Phase 1 even if unused, to avoid painful retrofit.

---

## Data Model

### Source (Corpus layer)

```
Source
├── id
├── type: [account | paper | book | interview | media | field_report]
├── title, author(s), date, url/doi
├── disciplinary_frame: [neuroscience | psychology | folklore | physics | 
│                         parapsychology | sociology | ...]
├── provenance_quality: [peer_reviewed | grey_literature | anecdotal | 
│                        investigator_report | ...]
├── ingestion_date
├── raw_text          ← stored in DB for re-analysis
├── file_ref          ← path to original file
└── notes

Account (extends Source)
├── account_date      ← when event occurred (vs. when reported)
├── reporter_demographics: [age, location, background]
├── reporting_lag     ← time between event and account
├── context: [sleep | wake | hypnagogic | altered_state | ...]
└── corroboration: [none | witness | physical_trace | investigator]
```

### Claim (middle tier — do not collapse into Source)

```
Claim
├── id
├── source_id         (FK → Source)
├── claim_text
├── verbatim: boolean
├── page_ref / timestamp
├── epistemic_status: [asserted | observed | inferred | speculative | 
│                      contested | retracted]
├── claim_type: [phenomenological | causal | correlational | 
│                definitional | methodological]
└── tags[]            (FK → PhenomenonTag)
```

### PhenomenonTag (controlled vocabulary)

```
PhenomenonTag
├── id
├── label             (e.g. "missing_time", "entity_contact")
├── category: [perceptual | somatic | cognitive | narrative | 
│              environmental | emotional]
├── definition
├── aliases[]
└── parent_tag        (FK → PhenomenonTag)  ← hierarchy
```

Hierarchy example: `entity_contact` → `entity_communication` → `entity_medical_procedure`

### Concept (knowledge graph node)

```
Concept
├── id
├── label
├── concept_type: [phenomenon | mechanism | entity | location | 
│                  process | theoretical_construct]
├── description
├── epistemic_status
└── supporting_claims[] (FK → Claim)

ConceptRelationship
├── source_concept_id
├── target_concept_id
├── relationship_type: [correlates_with | precedes | causes | contradicts | 
│                       is_instance_of | co-occurs_with | is_explained_by | 
│                       anomalous_given]    ← key type: flags unexplained tensions
├── strength: [weak | moderate | strong]
├── supporting_claims[]
└── notes
```

### Hypothesis (synthesis workspace)

```
Hypothesis
├── id
├── label
├── description
├── framework: [neurological | psychological | sociocultural | physical | 
│               interdimensional | information-theoretic | ...]
├── assumed_ontology[]: [physicalism | dualism | panpsychism | idealism | 
│                        unknown | novel]   ← makes paradigm assumptions explicit
├── scope_claims[]        ← what it purports to explain
├── supporting_claims[]   ← evidence in favor
├── anomalous_claims[]    ← REQUIRED: evidence it cannot explain (anti-bias mechanism)
├── required_assumptions[]
├── competing_hypotheses[] (FK → Hypothesis)
├── status: [active | abandoned | merged | speculative]
└── notes
```

**Note:** `anomalous_claims` is structurally enforced — every hypothesis must account for what it fails to explain.

### EpistemicNote (global annotation layer)

```
EpistemicNote
├── attached_to_type  (Claim | Concept | Hypothesis | ConceptRelationship)
├── attached_to_id
├── note_type: [methodological_concern | replication | contradiction | 
│               update | personal_observation]
├── text
└── author + date
```

Annotate anything without polluting primary records.

---

## Data Ingestion Pipeline

### Principles

- **AI-assisted human curation**, not full automation
- Silent errors are worse than slow throughput for a project where epistemic integrity is foundational
- Claude API suggests; human reviewer confirms before claims enter the database

### Source types and approach

| Source type | Extraction method |
|---|---|
| Modern PDFs (text-selectable) | `pymupdf` → Claude API claim extraction |
| Scanned/old PDFs | Tesseract OCR (MVP) or Google Document AI (hard cases) → same pipeline |
| Excel (existing data) | pandas one-time migration script → map to schema |
| Narrative witness accounts | Claude API with phenomenology-specific prompt; expect more review time |

### Ingestion review queue (UI flow)

```
Upload file
    ↓
Automated extraction (OCR if needed → Claude API JSON output)
    ↓
Review queue: extracted claims presented one by one
  [Accept] [Edit] [Reject] [Flag for later]
    ↓
Accepted claims → DB with reviewer + timestamp
```

### Storage

- Raw text: stored in PostgreSQL (enables re-analysis as prompts improve)
- Original files: stored in `storage/` directory (filesystem for MVP, S3 later)
- At projected scale (100–10,000 documents), total storage well under 1GB — no scaling concerns

---

## Build Order

| Phase | Scope | Status |
|---|---|---|
| **Chat 1** | Project scaffolding, Docker Compose, PostgreSQL schema, SQLAlchemy models, Alembic migrations | **Done** |
| **Chat 2** | FastAPI CRUD endpoints (Sources + Claims first), Pydantic schemas, JWT auth | **Done** |
| **Chat 3** | Excel import script (pandas migration), schema validation against real data | **Done** |
| **Chat 4** | PDF ingestion pipeline backend (pymupdf, OCR, Claude API claim extraction) | — |
| **Chat 5** | React frontend core (source list, source detail, claims list with filtering) | — |
| **Chat 6** | Ingestion review queue UI (frontend for Chat 4 backend) | — |
| **Chat 7** | Knowledge graph view (Cytoscape.js) | — |
| **Chat 8** | Hypothesis workspace (synthesis layer) | — |

### What was built

**Chat 1 — Scaffolding**
- `docker-compose.yml`: `db` (postgres:16-alpine) + `backend` (FastAPI) + `frontend` (profile-gated)
- `backend/` directory: Dockerfile, `requirements.txt`, `app/` package
- `app/db/base.py`: `Base` + `TimestampMixin`; `app/db/session.py`: async engine + `get_db` dependency
- `app/core/config.py`: `Settings` via pydantic-settings
- `app/models/enums.py`, `corpus.py`, `synthesis.py`: full SQLAlchemy model set (all layers)
- `alembic/`: async env, `0001_initial_schema.py` (all tables, enums, FTS indexes, updated_at trigger)

**Chat 2 — CRUD + Auth**
- `app/models/user.py`: `User` model; `0002_add_users_table.py` migration
- `app/core/security.py`: JWT creation/verification, bcrypt password hashing
- `app/api/routes/auth.py`: register + login endpoints
- `app/api/routes/sources.py`, `claims.py`, `tags.py`, `concepts.py`, `hypotheses.py`, `epistemic_notes.py`: full CRUD for all entities
- `app/models/common.py`: shared Pydantic base schemas

**Chat 3 — Excel Import**
- `backend/import_excel.py`: pandas-based idempotent import script; reads `data_sheet.xlsx` (four sheets) and populates `sources`, `claims`, and `phenomenon_tags`; supports `--dry-run` and `--file` flags; skips rows whose `study_id` already exists
- Bugfixes across models (`corpus.py`, `synthesis.py`, `user.py`), all CRUD routes, `security.py`, and `0001_initial_schema.py` to get the full stack running end-to-end

---

## Key Design Principles

1. **Claims layer is non-negotiable.** Never collapse source → synthesis. The claim is where epistemic status lives and where traceability is maintained.

2. **Anomalies are signals.** The system surfaces unexplained residue rather than suppressing it. The `anomalous_given` relationship type and required `anomalous_claims` field are the structural mechanisms for this.

3. **Confirmation bias is a structural risk.** Counter it at the schema level, not just in practice. `anomalous_claims` on Hypothesis is required, not optional.

4. **Epistemic transparency throughout.** Every claim carries provenance, epistemic status, and reviewer attribution. Mixed-quality sources should never silently intermingle.

5. **Ontological agnosticism at the infrastructure level.** The system doesn't privilege materialist explanations. It makes ontological assumptions *visible* (via `assumed_ontology` field) rather than encoding them into the schema.

6. **Disciplinary lens separation.** Claims and sources are tagged by disciplinary frame so the neuroscience literature can be queried independently of the anomalist literature.

---

## Open Decisions / Future Work

- Multi-user auth: JWT scaffolded in Phase 1, full multi-tenancy deferred
- Collaborative features: post-MVP
- Direct academic database integration (PubMed, JSTOR): post-MVP
- Automated account ingestion from online sources: raises methodological questions, deferred
- Upgrade file storage to S3: when scale requires it
