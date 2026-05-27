from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..services.sync import sync_league
from .auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.post("/sync")
async def trigger_sync(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    result = await sync_league(db)
    return result
