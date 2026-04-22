from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.synthesis import Concept, ConceptRelationship
from app.models.corpus import Claim
from app.models.enums import ConceptType, RelationshipType
from app.models.user import User
from app.models.synthesis import (
    ConceptCreate, ConceptUpdate, ConceptRead,
    ConceptRelationshipCreate, ConceptRelationshipUpdate, ConceptRelationshipRead,
)
from app.models.common import Page
from app.core.security import get_current_user

router = APIRouter(prefix="/concepts", tags=["concepts"])


def _get_concept_or_404(concept_id: UUID, db: Session) -> Concept:
    c = db.query(Concept).filter(Concept.id == concept_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Concept not found")
    return c


def _resolve_claims(claim_ids: list[int], db: Session) -> list[Claim]:
    if not claim_ids:
        return []
    claims = db.query(Claim).filter(Claim.id.in_(claim_ids)).all()
    found = {c.id for c in claims}
    missing = set(claim_ids) - found
    if missing:
        raise HTTPException(status_code=400, detail=f"Claim IDs not found: {sorted(missing)}")
    return claims


# ── Concepts ──────────────────────────────────────────────────────────────────

@router.get("", response_model=Page[ConceptRead])
def list_concepts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    concept_type: Optional[ConceptType] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Concept)
    if concept_type:
        q = q.filter(Concept.concept_type == concept_type)
    if search:
        q = q.filter(Concept.label.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(Concept.label).offset((page - 1) * page_size).limit(page_size).all()
    return Page.create(
        items=[ConceptRead.model_validate(c) for c in items],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=ConceptRead, status_code=status.HTTP_201_CREATED)
def create_concept(
    concept_in: ConceptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    claims = _resolve_claims(concept_in.supporting_claim_ids, db)
    concept = Concept(
        label=concept_in.label,
        concept_type=concept_in.concept_type,
        description=concept_in.description,
        epistemic_status=concept_in.epistemic_status,
        supporting_claims=claims,
    )
    db.add(concept)
    db.commit()
    db.refresh(concept)
    return ConceptRead.model_validate(concept)


@router.get("/{concept_id}", response_model=ConceptRead)
def get_concept(
    concept_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ConceptRead.model_validate(_get_concept_or_404(concept_id, db))


@router.patch("/{concept_id}", response_model=ConceptRead)
def update_concept(
    concept_id: UUID,
    concept_in: ConceptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    concept = _get_concept_or_404(concept_id, db)
    update_data = concept_in.model_dump(exclude_unset=True)
    claim_ids = update_data.pop("supporting_claim_ids", None)

    for field, value in update_data.items():
        setattr(concept, field, value)
    if claim_ids is not None:
        concept.supporting_claims = _resolve_claims(claim_ids, db)

    db.commit()
    db.refresh(concept)
    return ConceptRead.model_validate(concept)


@router.delete("/{concept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_concept(
    concept_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(_get_concept_or_404(concept_id, db))
    db.commit()


# ── Concept relationships ─────────────────────────────────────────────────────

@router.get("/relationships/", response_model=Page[ConceptRelationshipRead])
def list_relationships(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    relationship_type: Optional[RelationshipType] = None,
    concept_id: Optional[UUID] = Query(None, description="Filter to relationships involving this concept"),
    anomalous_only: bool = Query(False, description="Return only anomalous_given edges"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    anomalous_only=true is the primary query for surfacing unexplained tensions
    in the knowledge graph — these edges are treated as signals, not noise.
    """
    q = db.query(ConceptRelationship)

    if anomalous_only:
        q = q.filter(ConceptRelationship.relationship_type == RelationshipType.ANOMALOUS_GIVEN)
    elif relationship_type:
        q = q.filter(ConceptRelationship.relationship_type == relationship_type)

    if concept_id is not None:
        q = q.filter(
            (ConceptRelationship.source_concept_id == concept_id) |
            (ConceptRelationship.target_concept_id == concept_id)
        )

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return Page.create(
        items=[ConceptRelationshipRead.model_validate(r) for r in items],
        total=total, page=page, page_size=page_size,
    )


@router.post("/relationships/", response_model=ConceptRelationshipRead, status_code=status.HTTP_201_CREATED)
def create_relationship(
    rel_in: ConceptRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify both concepts exist
    _get_concept_or_404(rel_in.source_concept_id, db)
    _get_concept_or_404(rel_in.target_concept_id, db)

    claims = _resolve_claims(rel_in.supporting_claim_ids, db)
    rel = ConceptRelationship(
        source_concept_id=rel_in.source_concept_id,
        target_concept_id=rel_in.target_concept_id,
        relationship_type=rel_in.relationship_type,
        strength=rel_in.strength,
        notes=rel_in.notes,
        supporting_claims=claims,
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return ConceptRelationshipRead.model_validate(rel)


@router.patch("/relationships/{rel_id}", response_model=ConceptRelationshipRead)
def update_relationship(
    rel_id: UUID,
    rel_in: ConceptRelationshipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rel = db.query(ConceptRelationship).filter(ConceptRelationship.id == rel_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    update_data = rel_in.model_dump(exclude_unset=True)
    claim_ids = update_data.pop("supporting_claim_ids", None)
    for field, value in update_data.items():
        setattr(rel, field, value)
    if claim_ids is not None:
        rel.supporting_claims = _resolve_claims(claim_ids, db)

    db.commit()
    db.refresh(rel)
    return ConceptRelationshipRead.model_validate(rel)


@router.delete("/relationships/{rel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    rel_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rel = db.query(ConceptRelationship).filter(ConceptRelationship.id == rel_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    db.delete(rel)
    db.commit()
