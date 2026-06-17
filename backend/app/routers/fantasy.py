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
    fetch_fifa_squads,
    fetch_fifa_players,
    probe_fifa_data_endpoints,
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


@router.get("/probe-picks-endpoints")
async def probe_picks_endpoints(db: Session = Depends(get_db)):
    """Find the correct FIFA Fantasy endpoint for user squad picks."""
    import httpx
    from ..services.fifa_api import _headers, settings
    try:
        ranks = await fetch_standings(db)
    except Exception as e:
        return {"error": str(e)}
    if not ranks:
        return {"error": "No standings returned"}

    rank = ranks[0]
    user_id = rank.get("userId")
    team_id = rank.get("teamId") or user_id
    username = rank.get("userName")

    base = settings.fifa_base_url
    candidates = [
        f"{base}/picks/{team_id}",
        f"{base}/picks/team/{team_id}",
        f"{base}/team/{team_id}",
        f"{base}/team/{team_id}/picks",
        f"{base}/entries/{team_id}",
        f"{base}/entries/{team_id}/picks",
        f"{base}/user/{user_id}/picks",
        f"{base}/user/{user_id}/team",
        f"{base}/picks?teamId={team_id}",
        f"{base}/squad/{team_id}",
        f"{base}/gamebar?roundId=1&teamId={team_id}",
        f"{base}/round/1/picks/{team_id}",
        f"{base}/picks/round/1?teamId={team_id}",
    ]
    results = {"user_id": user_id, "team_id": team_id, "username": username, "endpoints": {}}
    async with httpx.AsyncClient() as client:
        for url in candidates:
            try:
                resp = await client.get(url, headers=_headers(), timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    results["endpoints"][url] = {"status": 200, "sample": str(data)[:300]}
                else:
                    results["endpoints"][url] = {"status": resp.status_code}
            except Exception as e:
                results["endpoints"][url] = {"error": str(e)[:80]}
    return results


@router.get("/debug-team-names")
def debug_team_names(db: Session = Depends(get_db)):
    """Show all unique national_team_name values stored in squad picks."""
    from sqlalchemy import distinct
    names = db.query(distinct(FantasySquadPick.national_team_name)).filter(
        FantasySquadPick.national_team_name.isnot(None)
    ).all()
    return sorted([n[0] for n in names])


@router.get("/debug-raw-squad/{user_id}")
async def debug_raw_squad(user_id: int, db: Session = Depends(get_db)):
    """Show raw FIFA Fantasy API squad response + parsed starting_ids."""
    data = await fetch_user_squad(user_id, db)
    lineup = data.get("lineup") or {}
    bench  = data.get("bench")  or {}
    subs   = data.get("substitutions") or []
    starting_ids = [pid for pos in lineup.values() for pid in (pos or [])]
    bench_ids    = [pid for pos in bench.values()  for pid in (pos or [])]
    return {
        "raw_lineup": lineup,
        "raw_bench":  bench,
        "substitutions": subs,
        "starting_ids": starting_ids,
        "bench_ids":    bench_ids,
        "all_keys": list(data.keys()),
        "382_is_starting": 382 in starting_ids,
        "863_is_starting": 863 in starting_ids,
    }


@router.get("/debug-user-picks/{username}")
def debug_user_picks(username: str, db: Session = Depends(get_db)):
    """Show all picks for a user — diagnose is_starting and national_team_name issues."""
    picks = (
        db.query(FantasySquadPick)
        .filter(FantasySquadPick.fifa_username == username)
        .order_by(FantasySquadPick.is_starting.desc(), FantasySquadPick.position_slot)
        .all()
    )
    return [
        {
            "player_id": p.player_id,
            "player_name": p.player_name,
            "national_team_name": p.national_team_name,
            "is_starting": p.is_starting,
            "is_captain": p.is_captain,
        }
        for p in picks
    ]


# ─────────────────────────── SYNC ENDPOINTS ────────────────────────────────



@router.get("/sync-squads-cron")
async def sync_squads_cron(db: Session = Depends(get_db)):
    """Cron-triggered squad sync (GET for Vercel cron compatibility)."""
    return await sync_squads(db)





@router.post("/sync-squads")
async def sync_squads(db: Session = Depends(get_db)):
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

    # Build lookup: fifa_username (case-insensitive) → user's own SID
    from ..models.user import User as AppUser
    user_sids: dict[str, str] = {}
    for u in db.query(AppUser).filter(AppUser.fifa_sid.isnot(None)).all():
        if u.fifa_username:
            user_sids[u.fifa_username.lower()] = u.fifa_sid

    errors: list[str] = []
    rows: list[dict] = []
    processed_user_ids: list[int] = []

    for rank in ranks:
        user_id  = rank.get("userId")
        username = rank.get("userName", f"user_{user_id}")
        team_id  = rank.get("teamId") or user_id

        if not user_id:
            continue

        own_sid = user_sids.get((username or "").lower())

        try:
            squad_data = await fetch_user_squad(team_id, db, user_sid=own_sid)
        except Exception as e:
            errors.append(f"{username}: {e}")
            continue

        # Parse new format: lineup/bench dicts with player ID lists
        lineup = squad_data.get("lineup") or {}
        bench = squad_data.get("bench") or {}
        captain_id = squad_data.get("captain")
        vice_id = squad_data.get("vice")

        # Flatten starting XI
        starting_ids = []
        for pos_players in lineup.values():
            starting_ids.extend(pos_players or [])

        # Flatten bench
        bench_ids = []
        for pos_players in bench.values():
            bench_ids.extend(pos_players or [])

        # Apply manual substitutions — the API may return the pre-sub lineup
        # when called with a neutral session; substitutions[] records the changes.
        for sub in (squad_data.get("substitutions") or []):
            out_id = sub.get("out")
            in_id  = sub.get("in")
            if out_id and in_id and out_id in starting_ids and in_id not in starting_ids:
                starting_ids.remove(out_id)
                starting_ids.append(in_id)
                # Keep bench consistent: swap in_id out, put out_id in
                if in_id in bench_ids:
                    bench_ids.remove(in_id)
                if out_id not in bench_ids:
                    bench_ids.append(out_id)

        all_ids = starting_ids + bench_ids
        if not all_ids:
            errors.append(f"{username}: ingen picks (keys: {list(squad_data.keys())})")
            continue

        processed_user_ids.append(user_id)

        for slot_idx, player_id in enumerate(all_ids, start=1):
            if not player_id:
                continue

            pl = player_lookup.get(player_id)
            norm_team = None
            if pl and pl.national_team_name:
                norm_team = pl.national_team_name

            rows.append({
                "fifa_user_id":       user_id,
                "fifa_username":      username,
                "player_id":          player_id,
                "player_name":        pl.name if pl else None,
                "national_team_name": norm_team,
                "position_slot":      slot_idx,
                "is_captain":         player_id == captain_id,
                "is_vice_captain":    player_id == vice_id,
                "is_starting":        player_id in starting_ids,
                "synced_round":       current_round,
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

@router.get("/probe-fifa-data")
async def probe_fifa_data(db: Session = Depends(get_db)):
    """Find the correct FIFA Fantasy endpoints for squads and players."""
    try:
        results = await probe_fifa_data_endpoints(db)
        return results
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/probe-fifa-fixtures")
async def probe_fifa_fixtures(db: Session = Depends(get_db)):
    """Probe FIFA for fixture/results data."""
    import httpx
    from ..services.fifa_api import _headers, FIFA_JSON_BASE, settings
    candidates = [
        f"{FIFA_JSON_BASE}/fixtures.json",
        f"{FIFA_JSON_BASE}/matches.json",
        f"{FIFA_JSON_BASE}/results.json",
        f"{FIFA_JSON_BASE}/schedule.json",
        f"https://play.fifa.com/api/en/fantasy/fixtures",
        f"https://play.fifa.com/api/en/fantasy/matches",
        f"https://play.fifa.com/api/en/fantasy/rounds/1/matches",
        f"https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=278513&count=10",
    ]
    results = {}
    async with httpx.AsyncClient() as client:
        for url in candidates:
            try:
                resp = await client.get(url, headers=_headers(), timeout=6)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        results[url] = {"status": "ok", "count": len(data), "sample": str(data[:1])[:300]}
                    else:
                        results[url] = {"status": "ok", "keys": list(data.keys())[:10], "sample": str(data)[:300]}
                else:
                    results[url] = {"status": resp.status_code}
            except Exception as e:
                results[url] = {"status": "error", "error": str(e)[:100]}
    return results


@router.post("/sync-players-fifa")
async def sync_players_fifa(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Fetch squads (teams) and players directly from FIFA Fantasy API,
    then bulk-upsert into DB. No translation layer needed.
    Position: GK/DEF/MID/FWD string → id 1/2/3/4
    Player name: knownName || firstName + ' ' + lastName
    """
    POS_MAP = {"GK": 1, "DEF": 2, "MID": 3, "FWD": 4}
    POS_NAME = {"GK": "Keeper", "DEF": "Forsvar", "MID": "Midtbane", "FWD": "Angrep"}

    try:
        squads_raw = await fetch_fifa_squads(db)
        players_raw = await fetch_fifa_players(db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FIFA API feil: {e}\n{traceback.format_exc()}")

    if not players_raw:
        return {"synced": 0, "message": "FIFA API returnerte 0 spillere", "squads_count": len(squads_raw)}

    # Build team lookup: id → name
    team_map = {t["id"]: t["name"] for t in squads_raw if "id" in t and "name" in t}

    rows = []
    for p in players_raw:
        pid = p.get("id")
        if not pid:
            continue

        known = p.get("knownName")
        first = p.get("firstName", "")
        last = p.get("lastName", "")
        name = known or f"{first} {last}".strip()

        pos_str = p.get("position", "MID")
        pos_id = POS_MAP.get(pos_str, 3)
        pos_name = POS_NAME.get(pos_str, pos_str)

        squad_id = p.get("squadId")
        team_name = team_map.get(squad_id, "")

        rows.append({
            "id":                pid,
            "name":              name,
            "short_name":        name,
            "national_team_id":  squad_id,
            "national_team_name": team_name,
            "position_id":       pos_id,
            "position_name":     pos_name,
            "price":             p.get("price", 0.0),
            "total_points":      p.get("stats", {}).get("totalPoints", 0),
        })

    if not rows:
        return {"synced": 0, "message": "Ingen gyldige spillere"}

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
            "price":              stmt.excluded.price,
            "total_points":       stmt.excluded.total_points,
        },
    )
    db.execute(stmt)
    db.commit()

    return {
        "synced": len(rows),
        "squads": len(squads_raw),
        "source": "FIFA Fantasy API",
    }


@router.get("/debug-players")
async def debug_players(db: Session = Depends(get_db)):
    try:
        players = await fetch_fifa_players(db)
        squads = await fetch_fifa_squads(db)
        return {"source": "FIFA Fantasy API", "total_players": len(players), "total_squads": len(squads), "sample": players[:5]}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/debug-squad/{user_id}")
async def debug_squad(user_id: int, db: Session = Depends(get_db)):
    try:
        results = await probe_squad_endpoints(user_id, db)
        return {"user_id": user_id, "probe_results": results}
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.post("/update-fifa-session")
def update_fifa_session(db: Session = Depends(get_db)):
    """One-off: update FIFA session tokens from fresh browser cookies. Remove after use."""
    import urllib.parse, json
    from ..models.fifa_token import FifaToken
    from ..services.token_manager import token_manager

    new_x_sid = "a680856c8a191967ca1f806f_1781739007"
    new_fp_user = "%7B%22ssoId%22%3A%2221a15ff3-e2bb-4448-99fe-0ac145f0c252%22%2C%22envId%22%3A%223f85e2e1-0232-4f84-9da8-bba9279f1a23%22%2C%22firstName%22%3A%22Adam%22%2C%22userName%22%3A%22adam.paalsrud.bratsvedal%40gmail.com%22%2C%22email%22%3A%22adam.paalsrud.bratsvedal%40gmail.com%22%2C%22dateOfBirth%22%3A%222003-12-16%22%2C%22countryOfResidence%22%3A%22NOR%22%2C%22accessToken%22%3A%22eyJhbGciOiJSUzI1NiIsImtpZCI6ImRlZmF1bHQifQ.eyJjbGllbnRfaWQiOiIzNTA3MjU5OC1mYzIwLTQxNDItYTQ2OS0xYjk0MGRiNDdlNmYiLCJpc3MiOiJodHRwczovL2F1dGgucGluZ29uZS5ldS8zZjg1ZTJlMS0wMjMyLTRmODQtOWRhOC1iYmE5Mjc5ZjFhMjMvYXMiLCJqdGkiOiIwY2VmZDBlOC04Y2Q0LTRlYWQtYTZlYS05NDk0YzM2ZWJiYWUiLCJpYXQiOjE3ODE3Mzg5NzIsImV4cCI6MTc4MTc0MjU3MiwiYXVkIjpbImh0dHBzOi8vYXBpLnBpbmdvbmUuZXUiXSwic2NvcGUiOiJhZGRyZXNzIHBob25lIG9wZW5pZCBwcm9maWxlIHAxOnVwZGF0ZTp1c2VyOnNhZmUtb25seSBlbWFpbCIsInN1YiI6IjIxYTE1ZmYzLWUyYmItNDQ0OC05OWZlLTBhYzE0NWYwYzI1MiIsInNpZCI6ImY5ZDdmOWI3LTAzYmMtNDA5YS1hOGI2LTdmNDBhMjNhOTk0ZSIsImF1dGhfdGltZSI6MTc4MTczODk3MSwiYWNyIjoiNzQ2NWEwMzgzNWE4ODllM2M4ZWVlYzMwMzFlNTVjZDciLCJlbnYiOiIzZjg1ZTJlMS0wMjMyLTRmODQtOWRhOC1iYmE5Mjc5ZjFhMjMiLCJvcmciOiI1Nzk1ODFhYy1jZWZjLTQzMjUtYmU1Zi1iYzA4NWY0MDAwMGUiLCJwMS5yaWQiOiJmMzU1M2VjZS1mZGFlLTRlNWMtOTE3Ny1kZjdkODgxMWZkMDIifQ.TXGpGgQWDPHiKSwc8SYpenbaQFF5GZEXCTqq-G_4mCWH1fXcQHdAwFWl_r5JsHXR7Lk2yXhnPX5WgZtdki_Guz137b5pJTZM9dYRyDCd-vtIp1MoMEgD9QnxRjw4nyRMzG2voxdshYyucpfOMrp_r69wpKiwGLT04k6J_CLeZTd93AMJ9173G3W3bmPrzyI4uP8McDNdiPTXIeIvDUKNCoWTolJKcfX0HoJfm9A-Q1L6FxhmEvp5I-bsfrZqNlV7netafjON4Vc-W3xLnwSWLH_n1rmo39H89LGTdVA313LAEWtxSWO_qFhWvXxnBpwMdOBYNCioms8YvC5TZZtSOw%22%2C%22refreshToken%22%3A%22eyJhbGciOiJSUzI1NiIsImtpZCI6ImRlZmF1bHQifQ.eyJzdWIiOiIyMWExNWZmMy1lMmJiLTQ0NDgtOTlmZS0wYWMxNDVmMGMyNTIiLCJqdGkiOiIwNjE1MGYxYS0zZTIzLTQ5MDUtOGZlNC1jYmQ3ZGViNTY1MmEiLCJleHAiOjE3ODQzMzA5NzIsInNpZCI6ImY5ZDdmOWI3LTAzYmMtNDA5YS1hOGI2LTdmNDBhMjNhOTk0ZSIsInNjb3BlIjoiYWRkcmVzcyBwaG9uZSBvcGVuaWQgcHJvZmlsZSBwMTp1cGRhdGU6dXNlcjpzYWZlLW9ubHkgZW1haWwiLCJhdXRoX3RpbWUiOjE3ODE3Mzg5NzEsImFjciI6Ijc0NjVhMDM4MzVhODg5ZTNjOGVlZWMzMDMxZTU1Y2Q3IiwiYW1yIjpbInB3ZCJdLCJpc3MiOiJodHRwczovL2F1dGgucGluZ29uZS5ldS8zZjg1ZTJlMS0wMjMyLTRmODQtOWRhOC1iYmE5Mjc5ZjFhMjMvYXMiLCJkYXZpbmNpX2lkX3Rva2VuX2F0dHJpYnV0ZXMiOiJ7XCJzdWJcIjpcIjIxYTE1ZmYzLWUyYmItNDQ0OC05OWZlLTBhYzE0NWYwYzI1MlwifSJ9.MRxb22i3cXgkDkyqmdCzfDja50u9qhr3fKDv6O8-xLAztQIMT5sdU1KOVB2gbKmYgc6RjSoevVBv5-uBiaWT8Wa6DbXzAHRO1pV5cdkeD2oZKeWrEOsy7QlMaovByD-BvoOPa_mb7AZRHBfiqhqL05bFsYJ-iQ8ompobw_cx3zHy-f2WKnDuEFcT1OomMs04GXcaLORNDAPLaWhhdPDR0mu2A9jwnvbccL1bp5EL3czIPNJb0BJrGyKzGOd05Lm_stDAb-2lbP6tkkHw5h_VufBvCHUT2qpzJiyfnyQuBMmtNWfw7Z5SAQGs0zb9qxY0z7kdiq4dwS_8O0egDWwvCg%22%2C%22expires%22%3A%222026-06-18T00%3A29%3A32.000Z%22%2C%22expIn%22%3A3600%2C%22expSeconds%22%3A1781742572%2C%22partnerOptIn%22%3Afalse%2C%22fifaOptIn%22%3Afalse%2C%22fifaNewsLetters%22%3A%7B%22newReleases%22%3Afalse%2C%22thisMonthOnFifaPlus%22%3Afalse%2C%22theBeautifulGame%22%3Afalse%2C%22eventsAndTournaments%22%3Afalse%2C%22playZone%22%3Afalse%2C%22fifaStore%22%3Afalse%2C%22fifaPlusCollect%22%3Afalse%7D%2C%22preferredCommunicationLanguage%22%3A%22en-GB%22%2C%22rewardsOptIn%22%3Afalse%7D"

    fp_data = json.loads(urllib.parse.unquote(new_fp_user))
    access_token = fp_data.get("accessToken", "")
    refresh_token = fp_data.get("refreshToken", "")
    expires_str = fp_data.get("expires", "")

    from datetime import datetime
    expires_at = None
    if expires_str:
        try:
            expires_at = datetime.fromisoformat(expires_str.replace("Z", ""))
        except Exception:
            pass

    row = db.query(FifaToken).first()
    if not row:
        row = FifaToken()
        db.add(row)
    row.access_token = access_token
    row.refresh_token = refresh_token
    row.fp_user = new_fp_user
    row.x_sid = new_x_sid
    row.expires_at = expires_at
    db.commit()

    token_manager._access_token = access_token
    token_manager._refresh_token = refresh_token
    token_manager._fp_user = new_fp_user
    token_manager._x_sid_db = new_x_sid
    token_manager._expires_at = expires_at

    return {"ok": True, "x_sid": new_x_sid, "expires": expires_str}


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
