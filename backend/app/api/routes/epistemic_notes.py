from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.synthesis import EpistemicNote
from app.models.enums import AttachableEntityType, EpistemicNoteType
from app.models.user import User
from app.models.synthesis import EpistemicNoteCreate, EpistemicNoteRead
from app.core.security import get_current_user

router = APIRouter(prefix="/epistemic-notes", tags=["epistemic-notes"])


@router.get("/", response_model=list[EpistemicNoteRead])
def list_notes(
    attached_to_type: Optional[AttachableEntityType] = None,
    attached_to_id: Optional[int] = None,
    note_type: Optional[EpistemicNoteType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Primary use: fetch all notes for a given entity.
    Pass both attached_to_type and attached_to_id to get notes for a specific object.
    """
    q = db.query(EpistemicNote)
    if attached_to_type:
        q = q.filter(EpistemicNote.attached_to_type == attached_to_type)
    if attached_to_id is not None:
        q = q.filter(EpistemicNote.attached_to_id == attached_to_id)
    if note_type:
        q = q.filter(EpistemicNote.note_type == note_type)

    return [EpistemicNoteRead.model_validate(n) for n in q.order_by(EpistemicNote.created_at).all()]


@router.post("/", response_model=EpistemicNoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    note_in: EpistemicNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = EpistemicNote(
        attached_to_type=note_in.attached_to_type,
        attached_to_id=note_in.attached_to_id,
        note_type=note_in.note_type,
        text=note_in.text,
        author=current_user.username,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return EpistemicNoteRead.model_validate(note)


@router.patch("/{note_id}", response_model=EpistemicNoteRead)
def update_note(
    note_id: int,
    text: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(EpistemicNote).filter(EpistemicNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.text = text
    db.commit()
    db.refresh(note)
    return EpistemicNoteRead.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(EpistemicNote).filter(EpistemicNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
