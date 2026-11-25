import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import CreateStaffRequest, CreateStaffResponse, SetStatusRequest, SetStatusResponse
from ..services import auth
from .deps import CurrentUser, require_roles

router = APIRouter(prefix="/admin", tags=["housing admin"])


@router.post("/accounts", response_model=CreateStaffResponse, status_code=201)
def create_account(body: CreateStaffRequest, admin: CurrentUser = Depends(require_roles("HOUSING_ADMIN")), db: Session = Depends(get_db)):
    actor = auth.load_user(db, admin.account_id)
    return auth.create_staff_account(db, actor, **body.model_dump())


@router.patch("/accounts/{account_id}/status", response_model=SetStatusResponse)
def set_status(account_id: uuid.UUID, body: SetStatusRequest, admin: CurrentUser = Depends(require_roles("HOUSING_ADMIN")),
               db: Session = Depends(get_db)):
    actor = auth.load_user(db, admin.account_id)
    return auth.set_account_status(db, actor, account_id, body.account_status)
