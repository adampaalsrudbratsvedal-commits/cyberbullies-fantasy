"""
Fantasy squad endpoints — store/retrieve player pools and user picks.
"""
import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from ..database import get_db
from ..models.fantasy_player import FantasyPlayer
from ..models.fantasy_squad_pick import FantasySquadPick
from ..models.round_score import RoundScore
from ..services.fifa_api import (
    fetch_standings,
    fetch_wc_teams_with_players,
    fetch_user_squad,
    probe_squad_endpoints,
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
    """Return all WC players stored in the DB."""
    players = (
        db.query(FantasyPlayer)
        .order_by(FantasyPlayer.national_team_name, FantasyPlayer.position_id, FantasyPlayer.name)
        .all()
    )
    return {
        "count": len(players),
        "players": [
            {
                "id":               p.id,
                "name":             p.name,
                "shortName":        p.short_name,
                "nationalTeamId":   p.national_team_id,
                "nationalTeamName": p.national_team_name,
                "positionId":       p.position_id,
                "positionName":     p.position_name,
                "price":            p.price,
                "totalPoints":      p.total_points,
            }
            for p in players
        ],
    }


@router.get("/squads")
def get_squads(db: Session = Depends(get_db)):
    """Return every league participant's squad with joined player data."""
    picks = (
        db.query(FantasySquadPick)
        .order_by(
            FantasySquadPick.fifa_username,
            FantasySquadPick.is_starting.desc(),
            FantasySquadPick.position_slot,
        )
        .all()
    )

    player_ids = {p.player_id for p in picks}
    player_map = {
        pl.id: pl
        for pl in db.query(FantasyPlayer).filter(FantasyPlayer.id.in_(player_ids)).all()
    }

    result: dict[str, list] = {}
    for pick in picks:
        pl = player_map.get(pick.player_id)
        result.setdefault(pick.fifa_username, []).append({
            "playerId":        pick.player_id,
            "positionSlot":    pick.position_slot,
            "isCaptain":       pick.is_captain,
            "isViceCaptain":   pick.is_vice_captain,
            "isStarting":      pick.is_starting,
            "name":            pl.name             if pl else f"Ukjent ({pick.player_id})",
            "shortName":       pl.short_name        if pl else "",
            "nationalTeamName":pl.national_team_name if pl else "",
            "positionId":      pl.position_id       if pl else None,
            "positionName":    pl.position_name     if pl else "",
            "price":           pl.price             if pl else None,
            "totalPoints":     pl.total_points      if pl else 0,
        })

    return {"squads": result}


# ─────────────────────────── SYNC ENDPOINTS ────────────────────────────────

@router.post("/sync-players")
async def sync_players(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Admin: fetch all WC 2026 squad members from football-data.org and upsert into DB.
    Uses /v4/competitions/WC/teams — free tier, no cookies needed.
    """
    try:
        raw = await fetch_wc_teams_with_players()
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"football-data.org feil: {e}\n{traceback.format_exc()}",
        )

    if not raw:
        return {"synced": 0, "message": "API returnerte 0 spillere"}

    synced = 0
    for p in raw:
        pid = p.get("id")
        if not pid:
            continue

        existing = db.get(FantasyPlayer, pid)
        if existing:
            existing.name              = p.get("name", existing.name)
            existing.short_name        = p.get("shortName", existing.short_name)
            existing.national_team_id  = p.get("nationalTeamId", existing.national_team_id)
            existing.national_team_name= p.get("nationalTeamName", existing.national_team_name)
            existing.position_id       = p.get("positionId", existing.position_id)
            existing.position_name     = p.get("positionName", existing.position_name)
        else:
            db.add(FantasyPlayer(
                id=pid,
                name=p["name"],
                short_name=p.get("shortName", p["name"]),
                national_team_id=p.get("nationalTeamId"),
                national_team_name=p.get("nationalTeamName", ""),
                position_id=p.get("positionId", 3),
                position_name=p.get("positionName", ""),
                price=0.0,
                total_points=0,
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
    Uses FIFA Fantasy API — requires valid X-SID cookie in backend env.
    """
    try:
        ranks = await fetch_standings(db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Standings feilet: {e}")

    current_round = db.query(sqlfunc.max(RoundScore.round_id)).scalar() or 0
    errors: list[str] = []
    total_picks = 0

    for rank in ranks:
        user_id  = rank.get("userId")
        username = rank.get("userName", f"user_{user_id}")
        team_id  = rank.get("teamId") or user_id

        if not user_id:
            continue

        try:
            squad_data = await fetch_user_squad(team_id, db)
        except Exception as e:
            errors.append(f"{username}: {e}")
            continue

        picks_raw = (
            squad_data.get("picks")
            or squad_data.get("players")
            or squad_data.get("squad")
            or []
        )

        if not picks_raw:
            errors.append(
                f"{username}: ingen picks (keys: {list(k for k in squad_data if k != '_url_used')})"
            )
            continue

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
                is_captain=bool(pick.get("isCaptain") or pick.get("captain")),
                is_vice_captain=bool(pick.get("isViceCaptain") or pick.get("viceCaptain")),
                is_starting=bool(pick.get("isStarting", pick.get("active", slot_idx <= 11))),
                synced_round=current_round,
            ))
            total_picks += 1

    db.commit()
    return {
        "users_processed": len(ranks),
        "total_picks": total_picks,
        "errors": errors,
    }


# ─────────────────────────── DEBUG ENDPOINTS ───────────────────────────────

@router.get("/debug-players")
async def debug_players(db: Session = Depends(get_db)):
    """Debug: return sample from football-data.org WC teams endpoint."""
    try:
        raw = await fetch_wc_teams_with_players()
        return {
            "source": "football-data.org /v4/competitions/WC/teams",
            "total_players": len(raw),
            "sample": raw[:5],
        }
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/debug-squad/{user_id}")
async def debug_squad(user_id: int, db: Session = Depends(get_db)):
    """
    Debug: probe all candidate FIFA Fantasy squad endpoints for a given user ID.
    Run this to find out which URL pattern returns squad data.
    """
    try:
        results = await probe_squad_endpoints(user_id, db)
        return {"user_id": user_id, "probe_results": results}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/db-stats")
def db_stats(db: Session = Depends(get_db)):
    """Quick summary of what's currently stored."""
    return {
        "players_in_db": db.query(sqlfunc.count(FantasyPlayer.id)).scalar(),
        "picks_in_db":   db.query(sqlfunc.count(FantasySquadPick.id)).scalar(),
        "users_with_picks": db.query(
            sqlfunc.count(sqlfunc.distinct(FantasySquadPick.fifa_username))
        ).scalar(),
    }
