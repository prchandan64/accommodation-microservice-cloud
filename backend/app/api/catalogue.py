import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AcademicTerm, Block, Hostel, RoomType

router = APIRouter(tags=["Catalogue"])


class BlockOut(BaseModel):
    block_id: uuid.UUID
    block_code: str
    name: str
    floors: int
    status: str

    class Config:
        from_attributes = True


class HostelOut(BaseModel):
    hostel_id: uuid.UUID
    hostel_code: str
    name: str
    gender_policy: str
    address: Optional[str]
    description: Optional[str]
    status: str

    class Config:
        from_attributes = True


class HostelDetailOut(HostelOut):
    blocks: list[BlockOut] = []


class RoomTypeOut(BaseModel):
    room_type_id: uuid.UUID
    name: str
    bed_count: int
    has_attached_bathroom: bool
    is_ac: bool
    description: Optional[str]

    class Config:
        from_attributes = True


class TermOut(BaseModel):
    term_id: uuid.UUID
    name: str
    start_date: str
    end_date: str
    status: str

    class Config:
        from_attributes = True


@router.get("/hostels", response_model=list[HostelOut])
def list_hostels(gender: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(Hostel).where(Hostel.status == "ACTIVE")
    if gender:
        stmt = stmt.where(Hostel.gender_policy.in_([gender.upper(), "MIXED"]))
    return db.scalars(stmt).all()


@router.get("/hostels/{hostel_id}", response_model=HostelDetailOut)
def get_hostel(hostel_id: uuid.UUID, db: Session = Depends(get_db)):
    hostel = db.get(Hostel, hostel_id)
    if not hostel:
        from ..errors import DomainError
        raise DomainError(404, "HOSTEL_NOT_FOUND", "Hostel not found")
    blocks = db.scalars(select(Block).where(Block.hostel_id == hostel_id, Block.status == "ACTIVE")).all()
    out = HostelDetailOut.model_validate(hostel)
    out.blocks = [BlockOut.model_validate(b) for b in blocks]
    return out


@router.get("/room-types", response_model=list[RoomTypeOut])
def list_room_types(db: Session = Depends(get_db)):
    return db.scalars(select(RoomType)).all()


@router.get("/terms", response_model=list[TermOut])
def list_terms(status: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(AcademicTerm)
    if status:
        stmt = stmt.where(AcademicTerm.status == status.upper())
    terms = db.scalars(stmt).all()
    return [
        TermOut(
            term_id=t.term_id,
            name=t.name,
            start_date=t.start_date.isoformat(),
            end_date=t.end_date.isoformat(),
            status=t.status
        )
        for t in terms
    ]
