"""
Fantasy squad endpoints — store/retrieve player pools and user picks.
"""
import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.fantasy_player import FantasyPlayer
from ..models.fantasy_squad_pick import FantasySquadPick
from ..models.round_score import RoundScore
from ..services.fifa_api import (
    fetch_standings,
    fetch_fantasy_players,
    fetch_user_squad,
)
from .auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/fantasy", tags=["fantasy"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


# ─────────────────────────── READ ENDPOINTS ────────────────────────────────

@router.get("/players")
def get_players(db: Session = Depends(get_db)):
    """Return all fantasy players stored in the DB."""
    players = db.query(FantasyPlayer).order_by(FantasyPlayer.position_id, FantasyPlayer.name).all()
    return {
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "shortName": p.short_name,
                "nationalTeamId": p.national_team_id,
                "nationalTeamName": p.national_team_name,
                "positionId": p.position_id,
                "positionName": p.position_name,
                "price": p.price,
                "totalPoints": p.total_points,
            }
            for p in players
        ]
    }


@router.get("/squads")
def get_squads(db: Session = Depends(get_db)):
    """Return every league participant's squad with joined player data."""
    picks = db.query(FantasySquadPick).order_by(
        FantasySquadPick.fifa_username,
        FantasySquadPick.is_starting.desc(),
        FantasySquadPick.position_slot,
    ).all()

    # Build player lookup
    player_ids = {p.player_id for p in picks}
    players = {
        pl.id: pl
        for pl in db.query(FantasyPlayer).filter(FantasyPlayer.id.in_(player_ids)).all()
    }

    result: dict[str, list] = {}
    for pick in picks:
        pl = players.get(pick.player_id)
        result.setdefault(pick.fifa_username, []).append({
            "playerId": pick.player_id,
            "positionSlot": pick.position_slot,
            "isCaptain": pick.is_captain,
            "isViceCaptain": pick.is_vice_captain,
            "isStarting": pick.is_starting,
            "name": pl.name if pl else f"Ukjent ({pick.player_id})",
            "shortName": pl.short_name if pl else "",
            "nationalTeamName": pl.national_team_name if pl else "",
            "positionId": pl.position_id if pl else None,
            "positionName": pl.position_name if pl else "",
            "price": pl.price if pl else None,
            "totalPoints": pl.total_points if pl else 0,
        })

    return {"squads": result}


# ─────────────────────────── SYNC ENDPOINTS ────────────────────────────────

@router.post("/sync-players")
async def sync_players(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Admin: fetch all FIFA Fantasy players from the live API and upsert into DB.
    """
    try:
        raw = await fetch_fantasy_players(db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FIFA API feil: {e}\n{traceback.format_exc()}")

    if not raw:
        return {"synced": 0, "message": "API returnerte 0 spillere — sjekk cookies"}

    pos_map = {1: "Keeper", 2: "Forsvar", 3: "Midtbane", 4: "Angrep"}
    synced = 0

    for raw_p in raw:
        pid = raw_p.get("id") or raw_p.get("playerId")
        if not pid:
            continue

        existing = db.get(FantasyPlayer, pid)
        pos_id = raw_p.get("positionId") or raw_p.get("position", {}).get("id")

        if existing:
            existing.name = raw_p.get("name", existing.name)
            existing.short_name = raw_p.get("shortName", existing.short_name)
            existing.national_team_id = raw_p.get("teamId") or raw_p.get("nationalTeam", {}).get("id")
            existing.national_team_name = raw_p.get("teamName") or raw_p.get("nationalTeam", {}).get("name")
            existing.position_id = pos_id
            existing.position_name = pos_map.get(pos_id, raw_p.get("positionName", ""))
            existing.price = raw_p.get("price", existing.price)
            existing.total_points = raw_p.get("totalPoints", existing.total_points) or 0
        else:
            db.add(FantasyPlayer(
                id=pid,
                name=raw_p.get("name", ""),
                short_name=raw_p.get("shortName"),
                national_team_id=raw_p.get("teamId") or raw_p.get("nationalTeam", {}).get("id"),
                national_team_name=raw_p.get("teamName") or raw_p.get("nationalTeam", {}).get("name"),
                position_id=pos_id,
                position_name=pos_map.get(pos_id, raw_p.get("positionName", "")),
                price=raw_p.get("price", 0.0),
                total_points=raw_p.get("totalPoints", 0) or 0,
            ))
        synced += 1

    db.commit()
    return {"synced": synced, "total": len(raw)}


@router.post("/sync-squads")
async def sync_squads(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Admin: fetch squad picks for every league participant and store in DB.
    Requires players to be synced first (sync-players).
    """
    # Get all league participants with their user IDs
    try:
        ranks = await fetch_standings(db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Standings henting feilet: {e}")

    # Current round for tagging
    from sqlalchemy import func as sqlfunc
    current_round = db.query(sqlfunc.max(RoundScore.round_id)).scalar() or 0

    errors = []
    total_picks = 0

    for rank in ranks:
        user_id = rank.get("userId")
        username = rank.get("userName", f"user_{user_id}")
        team_id = rank.get("teamId") or user_id   # some APIs expose teamId separately

        if not user_id:
            continue

        try:
            squad_data = await fetch_user_squad(team_id, db)
        except Exception as e:
            errors.append(f"{username}: {e}")
            continue

        # Picks can be under different keys
        picks_raw = (
            squad_data.get("picks")
            or squad_data.get("players")
            or squad_data.get("squad")
            or []
        )

        if not picks_raw:
            errors.append(f"{username}: ingen picks i respons (keys: {list(squad_data.keys())})")
            continue

        # Remove old picks for this user
        db.query(FantasySquadPick).filter_by(fifa_user_id=user_id).delete()

        for slot_idx, pick in enumerate(picks_raw, start=1):
            player_id = pick.get("playerId") or pick.get("id")
            if not player_id:
                continue

            db.add(FantasySquadPick(
                fifa_user_id=user_id,
                fifa_username=username,
                player_id=player_id,
                position_slot=pick.get("position", slot_idx),
                is_captain=pick.get("isCaptain", pick.get("captain", False)) or False,
                is_vice_captain=pick.get("isViceCaptain", pick.get("viceCaptain", False)) or False,
                is_starting=pick.get("isStarting", pick.get("active", slot_idx <= 11)) or False,
                synced_round=current_round,
            ))
            total_picks += 1

    db.commit()
    return {
        "users_processed": len(ranks),
        "total_picks": total_picks,
        "errors": errors,
    }


@router.get("/debug-squad/{user_id}")
async def debug_squad(user_id: int, db: Session = Depends(get_db)):
    """Debug: return raw squad response from FIFA API for a given user ID."""
    try:
        data = await fetch_user_squad(user_id, db)
        return {"raw": data}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/debug-players")
async def debug_players(db: Session = Depends(get_db)):
    """Debug: return first 5 raw players from FIFA Fantasy API."""
    try:
        raw = await fetch_fantasy_players(db)
        return {"count": len(raw), "sample": raw[:5]}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}
