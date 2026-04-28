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
| Frontend | React + Vite + TypeScript | Mature ecosystem for graph viz and complex UI |
| Graph viz | Cytoscape.js | Better than vis.js for analytical filtering and programmatic graph analysis |
| AI assistance | Anthropic Claude API | Claim extraction, pattern detection, hypothesis stress-testing |
| Infrastructure | Docker Compose | One-command startup; clean path to VPS deployment |
| File storage | Local filesystem (MVP) → S3 | PDFs/originals stored as files; raw text stored in DB |

### Deployment target

Web app (not desktop). Initially single-user, designed for multi-user from the start.

---

## Data Model

### Source (Corpus layer)

```
Source
├── id (UUID)
├── type: [account | paper | book | interview | media | field_report]
├── title, author(s), date, url/doi
├── disciplinary_frame: [neuroscience | psychology | folklore | physics | 
│                         parapsychology | sociology | anthropology | psychiatry | ufology | philosophy | other]
├── provenance_quality: [peer_reviewed | grey_literature | anecdotal | 
│                        investigator_report | self_reported | unknown]
├── ingestion_date, ingestion_status, ingestion_error
├── raw_text          ← stored in DB for re-analysis
├── file_ref          ← path to original file
└── notes

Account (extends Source, 1:1)
├── account_date
├── reporter_demographics (JSONB)
├── reporting_lag_days
├── context: [sleep | wake | hypnagogic | hypnopompic | altered_state | full_consciousness | unknown]
└── corroboration: [none | witness | physical_trace | investigator | multiple]
```

### Claim (middle tier — do not collapse into Source)

```
Claim
├── id (UUID)
├── source_id         (FK → Source)
├── claim_text
├── verbatim: boolean
├── page_ref / timestamp_ref
├── epistemic_status: [asserted | observed | inferred | speculative | contested | retracted]
├── claim_type: [phenomenological | causal | correlational | definitional | methodological]
├── ai_extracted: boolean
├── ingestion_method: [ai | manual | bulk_import]
├── reviewed_by / reviewed_at
└── tags[]            (FK → PhenomenonTag)
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
└── supporting_claims[]

ConceptRelationship
├── source_concept_id, target_concept_id
├── relationship_type: [..., anomalous_given]    ← key: flags unexplained tensions
├── strength: [weak | moderate | strong]
└── supporting_claims[]
```

### Hypothesis (synthesis workspace)

```
Hypothesis
├── id (UUID), label, description
├── framework: [neurological | psychological | sociocultural | physical | 
│               interdimensional | information_theoretic | psychospiritual | unknown]
├── assumed_ontologies[]: [physicalism | dualism | panpsychism | idealism | unknown | novel]
├── scope_claims[]        ← what it purports to explain
├── supporting_claims[]   ← evidence in favor
├── anomalous_claims[]    ← REQUIRED: evidence it cannot explain (anti-bias mechanism)
├── competing_hypotheses[]
└── status: [active | abandoned | merged | speculative]
```

**`anomalous_claims` is structurally enforced** — the API emits `X-Warning` and the UI shows a red warning when this list is empty.

### EpistemicNote (global annotation layer)

Attaches to any entity (Claim | Concept | Hypothesis | ConceptRelationship | Source) without polluting primary records.

---

## Data Ingestion Pipeline

### Principles

- **AI-assisted human curation**, not full automation
- Silent errors are worse than slow throughput
- Claude API suggests; human reviewer confirms before claims enter the corpus

### Source types and approach

| Source type | Extraction method |
|---|---|
| Modern PDFs (text-selectable) | `pymupdf` → Claude API claim extraction |
| Scanned PDFs | Tesseract OCR fallback → same pipeline |
| Excel (existing data) | `import_excel.py` one-time migration script |

### Ingestion flow

```
Upload file → POST /{source_id}/upload
    ↓
Trigger AI extraction → POST /{source_id}/ingest  { method: "ai" }
    ↓  (returns 202, runs as BackgroundTask)
Poll GET /sources/{source_id} for ingestion_status
    ↓  (complete)
Review queue: GET /claims/review-queue
    ↓
POST /claims/{id}/review  { accepted: true/false, edited_text?, epistemic_status? }
```

---

## Build Order

| Phase | Scope | Status |
|---|---|---|
| **Chat 1** | Project scaffolding, Docker Compose, PostgreSQL schema, SQLAlchemy models, Alembic migrations | ✅ Done |
| **Chat 2** | FastAPI CRUD endpoints, Pydantic schemas, JWT auth | ✅ Done |
| **Chat 3** | Excel import script (`import_excel.py`) | ✅ Done |
| **Chat 4** | PDF ingestion pipeline (pymupdf, OCR, Claude API claim extraction) | ✅ Done |
| **Chat 5** | React frontend core (source list, source detail, claims list, review queue skeleton, hypotheses list) | ✅ Done |
| **Chat 6** | Ingestion review queue UI (full reviewer UX) | ✅ Done |
| **Chat 7** | Knowledge graph view (Cytoscape.js) | ✅ Done |
| **Chat 8** | Hypothesis workspace (synthesis layer) | ✅ Done |

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
- `frontend/` — Vite + React 18 + TypeScript, zero CRA remnants
- **Design system:** IBM Plex Mono/Sans/Serif, dark instrument aesthetic, CSS custom properties
- **`src/types/index.ts`** — full TypeScript types mirroring all backend schemas
- **`src/api/`** — Axios client with JWT injection + 401 redirect; typed API functions
- **`src/components/Shell.tsx`** — sidebar nav (`SRC / CLM / RVW / HYP`), `Page` wrapper
- **`src/components/ui.tsx`** — `Badge`, `EpistemicBadge`, `ClaimTypeBadge`, `IngestionDot`, `ProvenanceBadge`, `Button`, `Input`, `Select`, `Card`, `Stat`, `Pagination`, `Spinner`, `EmptyState`, `ErrorState`
- **`src/components/AddSourceModal.tsx`** — full source creation form
- **`src/pages/Login.tsx`** — JWT auth form
- **`src/pages/SourceList.tsx`** — table with type/discipline/provenance/full-text filters, pagination
- **`src/pages/SourceDetail.tsx`** — metadata panel, claims list, ingest trigger button, ingestion status
- **`src/pages/ClaimList.tsx`** — filter bar: epistemic status, claim type, origin, unreviewed toggle
- **`src/pages/ReviewQueue.tsx`** — functional accept/reject cards with epistemic override (expanded in Chat 6)
- **`src/pages/HypothesisList.tsx`** — framework cards, supporting/anomalous counts, red warning on empty anomalous_claims

### Chat 6 — Minor improvements
- Review queue was deemed sufficient in current state
- Added source title to claims
- Added dynamic ingestion status

### Chat 7 — Knowledge Graph View
- **`src/pages/GraphView.tsx`** — full Cytoscape.js graph view at `/graph`
- Node colour by concept type (phenomenon, mechanism, entity, location, process, theoretical_construct); node size scales with `supporting_claim_ids` count (clamped 20–48px)
- Edge colour and dashed style by relationship type; `anomalous_given` edges rendered in intentionally loud red with dashed stroke
- Edge width by strength (weak / moderate / strong)
- Filter bar: concept type dropdown, relationship type dropdown, "⚠ anomalous only" toggle (mutually exclusive with rel-type filter); Clear button
- Click-on-node → neighbourhood highlight (all other elements dimmed to 8–25% opacity) + `DetailPanel` slide-in (300px): concept type, label, description, epistemic status badge, supporting claim count, all connected edges with direction arrow and neighbour label
- Click on canvas background → deselect and remove dimming
- Toolbar: Fit (fit all) and Center (zoom to selected node or fit all)
- Collapsible Legend (bottom-left): node type colour swatches + edge type colour swatches
- Zoom hint (bottom-right): scroll / drag / click affordances
- Cose layout with physics tuning (nodeRepulsion 400k, gravity 80, 1000 iterations); re-runs on filter change without destroying the instance
- Fetches up to 200 concepts and 500 relationships via `getConcepts` / `getRelationships`
- **`src/App.tsx`** — added `/graph` route → `<GraphView />`
- **`src/components/Shell.tsx`** — added `GRF` nav entry
- **`src/api/index.ts`** — added `getRelationships()` typed API call
- **`src/types/index.ts`** — added `ConceptRelationshipRead`, `RelationshipType` types

### Chat 8 — Hypothesis Workspace
- **`src/components/HypothesisDetail.tsx`** — full hypothesis detail/edit page at `/hypotheses/:id`
  - Inline editing of label, description, notes, framework, status, assumed ontologies
  - Two claim slots: **Supporting** (evidence in favour), **Anomalous** (evidence it cannot explain)
  - `ClaimAdder` component: debounced full-text search across the claim corpus (300 ms), filters out already-linked claims, shows epistemic status + claim type badges + source title inline
  - `ClaimRow` component: anomalous claims rendered with red tint background and border to keep the anti-bias signal prominent; per-row remove button
  - Optimistic save via `updateHypothesis`; delete with navigate-back
  - `HypothesisStatusBadge` added to `ui.tsx`
- **`src/components/AddHypothesisModal.tsx`** — creation modal launched from `HypothesisList`; sets label, framework, status, assumed ontologies (multi-select toggle chips), description, notes; navigates to detail on success
- **`src/pages/HypothesisList.tsx`** — wired up `AddHypothesisModal` and row-click navigation to detail
- **`backend/app/models/synthesis.py`** — fixed `HypothesisCreate`, `HypothesisUpdate`, `HypothesisList`, `HypothesisRead`, `EpistemicNoteCreate` to use `uuid.UUID` for all ID fields (was `int`)
- **`src/api/index.ts`** — added `createHypothesis`, `updateHypothesis`, `deleteHypothesis`, `getHypothesis` typed API calls
- **`src/types/index.ts`** — added `HypothesisRead`, `HypothesisCreate`, `HypothesisUpdate`, `HypothesisStatus`, `HypothesisFramework`, `AssumedOntology` types
- **`src/App.tsx`** — added `/hypotheses/:id` route → `<HypothesisDetail />`

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

# Import Excel data
docker compose run --rm backend python import_excel.py
```

**Endpoints:**
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/api/docs

**First user:** `POST /api/v1/auth/register` with `{ email, username, password }`

---

## Key Design Principles

1. **Claims layer is non-negotiable.** Never collapse source → synthesis. The claim is where epistemic status lives.

2. **Anomalies are signals.** The `anomalous_given` relationship type and required `anomalous_claims` on Hypothesis are the structural mechanisms for this. The UI surfaces the warning prominently.

3. **Confirmation bias is a structural risk.** Counter it at the schema level. `anomalous_claims` is required, not optional — enforced by both API warning header and frontend UI.

4. **Epistemic transparency throughout.** Every claim carries provenance, epistemic status, and reviewer attribution.

5. **Ontological agnosticism at the infrastructure level.** The `assumed_ontologies` field makes paradigm assumptions explicit rather than encoding them into the schema.

6. **Disciplinary lens separation.** Claims and sources are tagged by disciplinary frame so the neuroscience literature can be queried independently of the anomalist literature.