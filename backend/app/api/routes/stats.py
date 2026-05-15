from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.corpus import Source, Case, Observation
from app.models.synthesis import Hypothesis, TheoreticalFramework
from app.models.enums import SourceType

router = APIRouter(prefix="/stats", tags=["stats"])


class CorpusStats(BaseModel):
    sources: int
    case_reports: int
    cases: int
    observations: int
    hypotheses: int
    frameworks: int


@router.get("", response_model=CorpusStats)
def get_stats(db: Session = Depends(get_db)):
    return CorpusStats(
        sources=db.query(func.count(Source.id)).scalar() or 0,
        case_reports=db.query(func.count(Source.id)).filter(
            Source.source_type == SourceType.CASE_REPORT
        ).scalar() or 0,
        cases=db.query(func.count(Case.id)).scalar() or 0,
        observations=db.query(func.count(Observation.id)).scalar() or 0,
        hypotheses=db.query(func.count(Hypothesis.id)).scalar() or 0,
        frameworks=db.query(func.count(TheoreticalFramework.id)).scalar() or 0,
    )
