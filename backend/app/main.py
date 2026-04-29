from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import auth, sources, observations, tags, concepts, hypotheses, epistemic_notes, frameworks
from app.api.routes import ingest

settings = get_settings()

app = FastAPI(
    redirect_slashes=False,
    title="Abduction Research KMS",
    description=(
        "Knowledge management system for the scientific study of the alien abduction experience. "
        "Epistemological stance: neither credulous nor dismissive. "
        "Anomalies are signals. Confirmation bias is countered at the schema level."
    ),
    version="0.4.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = (
    ["*"]
    if settings.environment == "development"
    else ["http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Warning", "X-Warning-Anomalous", "X-Warning-Falsification"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX)
app.include_router(sources.router, prefix=PREFIX)
app.include_router(observations.router, prefix=PREFIX)
app.include_router(tags.router, prefix=PREFIX)
app.include_router(concepts.router, prefix=PREFIX)
app.include_router(hypotheses.router, prefix=PREFIX)
app.include_router(frameworks.router, prefix=PREFIX)
app.include_router(epistemic_notes.router, prefix=PREFIX)
app.include_router(ingest.router, prefix=PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": app.version}
