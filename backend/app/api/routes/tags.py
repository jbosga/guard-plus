from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.corpus import PhenomenonTag
from app.models.enums import TagCategory
from app.models.user import User
from app.schemas.corpus import PhenomenonTagCreate, PhenomenonTagUpdate, PhenomenonTagRead, PhenomenonTagTree
from app.core.security import get_current_user

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=list[PhenomenonTagRead])
def list_tags(
    category: Optional[TagCategory] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PhenomenonTag)
    if category:
        q = q.filter(PhenomenonTag.category == category)
    return [PhenomenonTagRead.model_validate(t) for t in q.order_by(PhenomenonTag.label).all()]


@router.get("/tree", response_model=list[PhenomenonTagTree])
def tag_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns root-level tags with child_tags populated recursively."""
    roots = (
        db.query(PhenomenonTag)
        .filter(PhenomenonTag.parent_tag_id.is_(None))
        .order_by(PhenomenonTag.label)
        .all()
    )
    return [PhenomenonTagTree.model_validate(r) for r in roots]


@router.post("/", response_model=PhenomenonTagRead, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_in: PhenomenonTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(PhenomenonTag).filter(PhenomenonTag.label == tag_in.label).first():
        raise HTTPException(status_code=400, detail=f"Tag '{tag_in.label}' already exists")

    tag = PhenomenonTag(**tag_in.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return PhenomenonTagRead.model_validate(tag)


@router.patch("/{tag_id}", response_model=PhenomenonTagRead)
def update_tag(
    tag_id: int,
    tag_in: PhenomenonTagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = db.query(PhenomenonTag).filter(PhenomenonTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    for field, value in tag_in.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    db.commit()
    db.refresh(tag)
    return PhenomenonTagRead.model_validate(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = db.query(PhenomenonTag).filter(PhenomenonTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
