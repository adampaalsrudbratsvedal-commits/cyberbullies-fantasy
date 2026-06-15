import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.fantasy import FantasySquadPick
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


class SetPicksBody(BaseModel):
    fifa_user_id: int
    fifa_username: str
    starting: list[int]
    bench: list[int]
    captain_id: int
    vice_id: int
    synced_round: int = 1


@router.post("/set-picks")
def set_picks(body: SetPicksBody, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Admin: manually set squad picks for a user (overwrites existing)."""
    from ..models.fantasy import FantasyPlayer
    player_lookup = {p.id: p for p in db.query(FantasyPlayer).all()}

    db.query(FantasySquadPick).filter(
        FantasySquadPick.fifa_username == body.fifa_username
    ).delete(synchronize_session=False)

    rows = []
    all_ids = [(pid, True) for pid in body.starting] + [(pid, False) for pid in body.bench]
    for slot_idx, (player_id, is_starting) in enumerate(all_ids, start=1):
        pl = player_lookup.get(player_id)
        rows.append(FantasySquadPick(
            fifa_user_id=body.fifa_user_id,
            fifa_username=body.fifa_username,
            player_id=player_id,
            player_name=pl.name if pl else None,
            national_team_name=pl.national_team_name if pl else None,
            position_slot=slot_idx,
            is_captain=(player_id == body.captain_id),
            is_vice_captain=(player_id == body.vice_id),
            is_starting=is_starting,
            synced_round=body.synced_round,
        ))
    db.bulk_save_objects(rows)
    db.commit()
    return {"ok": True, "inserted": len(rows)}
