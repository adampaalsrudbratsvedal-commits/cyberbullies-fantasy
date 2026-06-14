import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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
    try:
        result = await sync_league(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}\n{traceback.format_exc()}")


class SetUserSidBody(BaseModel):
    fifa_username: str
    fifa_sid: str


@router.post("/set-user-sid")
def set_user_sid(body: SetUserSidBody, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Admin: set FIFA SID for any league user (by their fifa_username)."""
    sid = body.fifa_sid.strip()
    # If it's a full cookie string (contains multiple cookies), store as-is
    # If it's just "X-SID=value", strip the prefix
    if sid.startswith("X-SID=") and ";" not in sid:
        sid = sid[len("X-SID="):]
    user = db.query(User).filter(User.fifa_username == body.fifa_username).first()
    if not user:
        # Try case-insensitive
        users = db.query(User).all()
        user = next((u for u in users if (u.fifa_username or "").lower() == body.fifa_username.lower()), None)
    if not user:
        raise HTTPException(status_code=404, detail=f"Ingen bruker med fifa_username={body.fifa_username!r}")
    user.fifa_sid = sid
    db.commit()
    return {"ok": True, "username": user.username, "fifa_username": user.fifa_username}
