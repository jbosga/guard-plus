# Abduction Research KMS

A rigorous knowledge management system for the scientific study of the alien abduction experience.

**Epistemological stance:** Neither credulous nor dismissive. First-person accounts are treated as empirical data. Anomalies are signals. Confirmation bias is countered at the schema level.

---

## First run

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD, SECRET_KEY, ANTHROPIC_API_KEY

# 2. Start the database
docker compose up db -d

# 3. Run migrations
docker compose run --rm backend alembic upgrade head

# 4. Start the backend
docker compose up backend

# API docs at: http://localhost:8000/api/docs
```

## Project structure

```
abduction-research/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint
│   │   ├── core/config.py        # Settings (pydantic-settings)
│   │   ├── db/
│   │   │   ├── base.py           # DeclarativeBase + TimestampMixin
│   │   │   └── session.py        # Async engine + get_db() dependency
│   │   └── models/
│   │       ├── enums.py          # All controlled vocabularies
│   │       ├── corpus.py         # Source, Account, PhenomenonTag, Claim
│   │       └── synthesis.py      # Concept, ConceptRelationship, Hypothesis, EpistemicNote
│   ├── alembic/
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
└── storage/
    └── uploads/                  # Source file storage (→ S3 post-MVP)
```

## Data model (three layers)

```
CORPUS                  CLAIM                     SYNTHESIS
Source                  Claim                     Concept
  └── Account             ├── epistemic_status      ├── ConceptRelationship
                          ├── claim_type            │     (incl. anomalous_given)
PhenomenonTag             ├── tags[]                └── Hypothesis
  (hierarchical)          └── source_id                   ├── scope_claims[]
                                                           ├── supporting_claims[]
EpistemicNote                                             └── anomalous_claims[] ← REQUIRED
  (attaches to anything)
```

## Build order

| Phase | Status |
|-------|--------|
| Chat 1: Scaffolding, Docker, schema, models, migrations | ✅ Done |
| Chat 2: FastAPI CRUD endpoints, Pydantic schemas, JWT auth | ⬜ |
| Chat 3: Excel import script | ⬜ |
| Chat 4: PDF ingestion pipeline + Claude API claim extraction | ⬜ |
| Chat 5: React frontend core | ⬜ |
| Chat 6: Ingestion review queue UI | ⬜ |
| Chat 7: Knowledge graph view (Cytoscape.js) | ⬜ |
| Chat 8: Hypothesis workspace | ⬜ |
