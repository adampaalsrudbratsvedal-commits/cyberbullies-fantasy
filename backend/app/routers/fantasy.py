"""
Fantasy squad endpoints — store/retrieve player pools and user picks.
"""
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
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
    normalise_team,
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
                "id":                p.id,
                "name":              p.name,
                "shortName":         p.short_name,
                "nationalTeamId":    p.national_team_id,
                "nationalTeamName":  p.national_team_name,
                "positionId":        p.position_id,
                "positionName":      p.position_name,
                "price":             p.price,
                "totalPoints":       p.total_points,
            }
            for p in players
        ],
    }


@router.get("/squads")
def get_squads(db: Session = Depends(get_db)):
    """Return every league participant's squad with player details."""
    picks = (
        db.query(FantasySquadPick)
        .order_by(
            FantasySquadPick.fifa_username,
            FantasySquadPick.is_starting.desc(),
            FantasySquadPick.position_slot,
        )
        .all()
    )

    # Build player lookup from DB (for extra metadata like price/totalPoints)
    player_ids = {p.player_id for p in picks}
    player_map = {
        pl.id: pl
        for pl in db.query(FantasyPlayer).filter(FantasyPlayer.id.in_(player_ids)).all()
    }

    result: dict[str, list] = {}
    for pick in picks:
        pl = player_map.get(pick.player_id)
        # Prefer names stored on the pick (from FIFA Fantasy), fall back to DB player
        name     = pick.player_name or (pl.name if pl else f"#{pick.player_id}")
        team     = pick.national_team_name or (pl.national_team_name if pl else "")
        pos_id   = (pl.position_id if pl else None)
        pos_name = (pl.position_name if pl else "")

        result.setdefault(pick.fifa_username, []).append({
            "playerId":         pick.player_id,
            "positionSlot":     pick.position_slot,
            "isCaptain":        pick.is_captain,
            "isViceCaptain":    pick.is_vice_captain,
            "isStarting":       pick.is_starting,
            "name":             name,
            "shortName":        (pl.short_name if pl else name),
            "nationalTeamName": team,
            "positionId":       pos_id,
            "positionName":     pos_name,
            "price":            (pl.price if pl else None),
            "totalPoints":      (pl.total_points if pl else 0),
        })

    return {"squads": result}


@router.get("/match-picks")
def get_match_picks(
    home: str = Query(..., description="Home team name (from fixture)"),
    away: str = Query(..., description="Away team name (from fixture)"),
    db: Session = Depends(get_db),
):
    """
    For a given match (homeTeam vs awayTeam), return which fantasy league
    participants have players from either team in their squad.

    Matching is done on normalised national_team_name — works even if FIFA
    Fantasy and football-data.org use slightly different name variants.
    """
    home_norm = normalise_team(home)
    away_norm = normalise_team(away)

    # All picks where national_team_name matches either side
    # We try both the raw stored value AND the normalised value.
    all_picks = db.query(FantasySquadPick).filter(
        FantasySquadPick.national_team_name.isnot(None)
    ).all()

    result: dict[str, list] = {}
    for pick in all_picks:
        pick_team = normalise_team(pick.national_team_name or "")
        if pick_team not in (home_norm, away_norm):
            continue

        # Enrich with FantasyPlayer data if available
        pl = db.get(FantasyPlayer, pick.player_id)
        name = pick.player_name or (pl.name if pl else f"#{pick.player_id}")

        result.setdefault(pick.fifa_username, []).append({
            "name":             name,
            "nationalTeamName": pick.national_team_name,
            "side":             "home" if normalise_team(pick.national_team_name or "") == home_norm else "away",
            "isCaptain":        pick.is_captain,
            "isViceCaptain":    pick.is_vice_captain,
            "isStarting":       pick.is_starting,
            "positionId":       pl.position_id if pl else None,
        })

    return {
        "home": home,
        "away": away,
        "picks": result,       # { "username": [ {name, side, isCaptain, ...} ] }
        "users_with_picks": len(result),
    }


@router.get("/all-match-picks")
def get_all_match_picks(db: Session = Depends(get_db)):
    """
    Return a lookup of normalised team name → { username: [picks] }
    so the frontend can do all filtering client-side without per-match API calls.
    """
    picks = db.query(FantasySquadPick).filter(
        FantasySquadPick.national_team_name.isnot(None)
    ).all()

    player_ids = {p.player_id for p in picks}
    player_map = {
        pl.id: pl
        for pl in db.query(FantasyPlayer).filter(FantasyPlayer.id.in_(player_ids)).all()
    }

    # team_norm → username → [pick_info]
    by_team: dict[str, dict[str, list]] = {}
    for pick in picks:
        team_norm = normalise_team(pick.national_team_name or "")
        if not team_norm:
            continue
        pl = player_map.get(pick.player_id)
        name = pick.player_name or (pl.name if pl else f"#{pick.player_id}")

        by_team.setdefault(team_norm, {}).setdefault(pick.fifa_username, []).append({
            "name":          name,
            "isCaptain":     pick.is_captain,
            "isViceCaptain": pick.is_vice_captain,
            "isStarting":    pick.is_starting,
            "positionId":    pl.position_id if pl else None,
        })

    return {"byTeam": by_team}


# ─────────────────────────── SYNC ENDPOINTS ────────────────────────────────

@router.post("/sync-players")
async def sync_players(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Fetch all WC 2026 squad members from football-data.org and bulk-upsert into DB.
    Uses a single INSERT … ON CONFLICT DO UPDATE to stay well within Vercel's 10s limit.
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

    # Build rows list — skip entries without an id
    rows = []
    for p in raw:
        pid = p.get("id")
        if not pid:
            continue
        rows.append({
            "id":                pid,
            "name":              p.get("name", ""),
            "short_name":        p.get("shortName") or p.get("name", ""),
            "national_team_id":  p.get("nationalTeamId"),
            "national_team_name": normalise_team(p.get("nationalTeamName", "")),
            "position_id":       p.get("positionId", 3),
            "position_name":     p.get("positionName", ""),
            "price":             0.0,
            "total_points":      0,
        })

    if not rows:
        return {"synced": 0, "message": "Ingen gyldige spillere i API-respons"}

    # Single bulk upsert — one DB round-trip instead of N×2
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    stmt = pg_insert(FantasyPlayer).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={
            "name":               stmt.excluded.name,
            "short_name":         stmt.excluded.short_name,
            "national_team_id":   stmt.excluded.national_team_id,
            "national_team_name": stmt.excluded.national_team_name,
            "position_id":        stmt.excluded.position_id,
            "position_name":      stmt.excluded.position_name,
        },
    )
    db.execute(stmt)
    db.commit()

    return {"synced": len(rows), "total": len(raw)}


@router.post("/sync-squads")
async def sync_squads(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Fetch squad picks for every league participant from FIFA Fantasy API.
    Uses bulk DB operations to stay within Vercel's 10s function timeout.
    """
    try:
        ranks = await fetch_standings(db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Standings feilet: {e}")

    current_round = db.query(sqlfunc.max(RoundScore.round_id)).scalar() or 0

    # Pre-load all known players in ONE query for fast team-name lookup
    player_lookup: dict[int, FantasyPlayer] = {
        p.id: p for p in db.query(FantasyPlayer).all()
    }

    errors: list[str] = []
    rows: list[dict] = []
    processed_user_ids: list[int] = []

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
                f"{username}: ingen picks "
                f"(keys: {[k for k in squad_data if k != '_url_used']})"
            )
            continue

        processed_user_ids.append(user_id)

        for slot_idx, pick in enumerate(picks_raw, start=1):
            player_id = pick.get("playerId") or pick.get("id")
            if not player_id:
                continue

            p_name = (
                pick.get("playerName") or pick.get("name")
                or pick.get("shortName") or pick.get("displayName")
            )
            raw_team = (
                pick.get("teamName") or pick.get("nationalTeam")
                or (pick.get("team", {}).get("name") if isinstance(pick.get("team"), dict) else None)
                or pick.get("countryName")
            )
            norm_team = normalise_team(raw_team) if raw_team else None

            # Fall back to pre-loaded dict — no extra DB call per pick
            if not norm_team:
                pl = player_lookup.get(player_id)
                if pl and pl.national_team_name:
                    norm_team = pl.national_team_name

            rows.append({
                "fifa_user_id":      user_id,
                "fifa_username":     username,
                "player_id":         player_id,
                "player_name":       p_name,
                "national_team_name":norm_team,
                "position_slot":     pick.get("position", slot_idx),
                "is_captain":        bool(pick.get("isCaptain") or pick.get("captain")),
                "is_vice_captain":   bool(pick.get("isViceCaptain") or pick.get("viceCaptain")),
                "is_starting":       bool(pick.get("isStarting", pick.get("active", slot_idx <= 11))),
                "synced_round":      current_round,
            })

    # One DELETE for all processed users, then one bulk INSERT
    if processed_user_ids:
        db.query(FantasySquadPick).filter(
            FantasySquadPick.fifa_user_id.in_(processed_user_ids)
        ).delete(synchronize_session=False)

    if rows:
        db.bulk_insert_mappings(FantasySquadPick, rows)

    db.commit()
    return {
        "users_processed": len(ranks),
        "total_picks": len(rows),
        "errors": errors,
    }


# ─────────────────────────── DEBUG ─────────────────────────────────────────

@router.get("/debug-players")
async def debug_players(db: Session = Depends(get_db)):
    try:
        raw = await fetch_wc_teams_with_players()
        return {"source": "football-data.org /v4/competitions/WC/teams",
                "total_players": len(raw), "sample": raw[:5]}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/debug-squad/{user_id}")
async def debug_squad(user_id: int, db: Session = Depends(get_db)):
    try:
        results = await probe_squad_endpoints(user_id, db)
        return {"user_id": user_id, "probe_results": results}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/db-stats")
def db_stats(db: Session = Depends(get_db)):
    picks_with_team = db.query(sqlfunc.count(FantasySquadPick.id)).filter(
        FantasySquadPick.national_team_name.isnot(None)
    ).scalar()
    return {
        "players_in_db":      db.query(sqlfunc.count(FantasyPlayer.id)).scalar(),
        "picks_in_db":        db.query(sqlfunc.count(FantasySquadPick.id)).scalar(),
        "picks_with_team":    picks_with_team,
        "users_with_picks":   db.query(
            sqlfunc.count(sqlfunc.distinct(FantasySquadPick.fifa_username))
        ).scalar(),
    }
