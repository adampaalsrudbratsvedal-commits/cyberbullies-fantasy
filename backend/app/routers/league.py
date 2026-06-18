import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..config import settings
from ..models.round_score import RoundScore
from ..models.probability_snapshot import ProbabilitySnapshot
from ..services.simulation import run_monte_carlo, run_monte_carlo_live
from ..models.fantasy_squad_pick import FantasySquadPick
from ..models.fantasy_player import FantasyPlayer
from ..services.fifa_api import fetch_standings, fetch_fixtures, fetch_rounds, fetch_gamebar, fetch_groups, fetch_scorers, normalise_team
from ..services.sync import sync_league

router = APIRouter(prefix="/api/league", tags=["league"])

TOTAL_ROUNDS = 8


@router.post("/sync")
async def sync_endpoint(db: Session = Depends(get_db)):
    """Sync round scores + probability snapshots from live standings."""
    import traceback
    try:
        return await sync_league(db)
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/sync-cron")
async def sync_cron_endpoint(db: Session = Depends(get_db)):
    """Cron-triggered sync (GET for Vercel cron compatibility)."""
    import traceback
    try:
        return await sync_league(db)
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/standings")
async def get_standings(db: Session = Depends(get_db)):
    try:
        ranks = await fetch_standings(db)
        # Auto-save round scores whenever standings are fetched
        try:
            for rank in ranks:
                if rank.get("roundId") is None:
                    continue
                existing = (
                    db.query(RoundScore)
                    .filter_by(fifa_user_id=rank["userId"], round_id=rank["roundId"])
                    .first()
                )
                if existing:
                    existing.round_points   = rank.get("roundPoints")
                    existing.overall_points = rank.get("overallPoints")
                    existing.overall_rank   = rank.get("overallRank")
                    existing.round_rank     = rank.get("roundRank")
                else:
                    db.add(RoundScore(
                        fifa_user_id    = rank["userId"],
                        fifa_username   = rank["userName"],
                        round_id        = rank["roundId"],
                        round_points    = rank.get("roundPoints"),
                        overall_points  = rank.get("overallPoints"),
                        overall_rank    = rank.get("overallRank"),
                        round_rank      = rank.get("roundRank"),
                    ))
            db.commit()
            # Regenerate probability snapshot so chart matches live simulation
            latest = (
                db.query(RoundScore.fifa_username, func.max(RoundScore.overall_points).label("points"))
                .group_by(RoundScore.fifa_username)
                .all()
            )
            if latest:
                rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0
                current_scores = {r.fifa_username: r.points or 0 for r in latest}
                rounds_remaining = max(0, TOTAL_ROUNDS - rounds_played)
                sim = run_monte_carlo(current_scores, rounds_remaining)
                db.query(ProbabilitySnapshot).filter_by(round_id=rounds_played).delete()
                for username, probs in sim.items():
                    db.add(ProbabilitySnapshot(
                        round_id=rounds_played,
                        fifa_username=username,
                        win_probability=probs["win_probability"],
                        last_probability=probs["last_probability"],
                        expected_final=probs["expected_final"],
                    ))
                db.commit()
        except Exception:
            pass  # Don't break standings if save fails
        return ranks
    except Exception:
        # FIFA API unavailable — fall back to last stored round scores from DB
        from sqlalchemy import func as sqlfunc
        latest_round = db.query(sqlfunc.max(RoundScore.round_id)).scalar()
        if latest_round is None:
            return []
        rows = (
            db.query(RoundScore)
            .filter_by(round_id=latest_round)
            .order_by(RoundScore.overall_rank)
            .all()
        )
        return [
            {
                "userId":        r.fifa_user_id,
                "userName":      r.fifa_username,
                "roundId":       r.round_id,
                "roundPoints":   r.round_points,
                "overallPoints": r.overall_points,
                "overallRank":   r.overall_rank,
                "roundRank":     r.round_rank,
                "leagueId":      None,
                "level":         0,
                "avatar":        "https://play.fifa.com/media/image/gamezone/avatars/WC_2026/0.svg",
            }
            for r in rows
        ]


@router.get("/history")
async def get_history(db: Session = Depends(get_db)):
    scores = db.query(RoundScore).order_by(RoundScore.round_id).all()
    if scores:
        result = {}
        for s in scores:
            result.setdefault(s.round_id, []).append({
                "username": s.fifa_username,
                "round_points": s.round_points,
                "overall_points": s.overall_points,
                "overall_rank": s.overall_rank,
            })
        return result
    # DB empty — fetch live standings and save them on the fly
    try:
        ranks = await fetch_standings(db)
        result = {}
        for rank in ranks:
            round_id = rank.get("roundId")
            if not round_id:
                continue
            result.setdefault(round_id, []).append({
                "username": rank["userName"],
                "round_points": rank.get("roundPoints"),
                "overall_points": rank.get("overallPoints"),
                "overall_rank": rank.get("overallRank"),
            })
            db.add(RoundScore(
                fifa_user_id    = rank["userId"],
                fifa_username   = rank["userName"],
                round_id        = round_id,
                round_points    = rank.get("roundPoints"),
                overall_points  = rank.get("overallPoints"),
                overall_rank    = rank.get("overallRank"),
                round_rank      = rank.get("roundRank"),
            ))
        db.commit()
        return result
    except Exception as e:
        import traceback
        return {"_error": str(e), "_tb": traceback.format_exc()[-500:]}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    round_winners = (
        db.query(RoundScore.fifa_username, func.count().label("wins"))
        .filter(RoundScore.round_rank == 1)
        .group_by(RoundScore.fifa_username)
        .all()
    )
    round_losers = (
        db.query(RoundScore.fifa_username, func.count().label("losses"))
        .filter(
            RoundScore.round_rank == db.query(func.max(RoundScore.round_rank)).scalar()
        )
        .group_by(RoundScore.fifa_username)
        .all()
    )
    return {
        "most_round_wins": [{"username": r.fifa_username, "wins": r.wins} for r in round_winners],
        "most_round_losses": [{"username": r.fifa_username, "losses": r.losses} for r in round_losers],
    }


async def _get_played_teams_this_round() -> set[str]:
    """Return set of normalised national team names that have completed a match in the active round."""
    import httpx
    from ..services.fifa_api import _headers
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://play.fifa.com/json/fantasy/rounds.json",
                                    headers=_headers(), timeout=8)
        rounds_data = resp.json() if resp.status_code == 200 else []
    except Exception:
        return set()

    if not isinstance(rounds_data, list):
        return set()

    # Find the active round: status "playing" first, else the last round with any complete match
    current_round = None
    for r in rounds_data:
        if r.get("status") == "playing":
            current_round = r
            break
    if current_round is None:
        for r in reversed(rounds_data):
            for t in (r.get("tournaments") or []):
                if t.get("status") == "complete":
                    current_round = r
                    break
            if current_round:
                break

    if not current_round:
        return set()

    # rounds.json structure: round -> tournaments[] (each tournament IS a match)
    # Fields: homeSquadName, awaySquadName, status ("complete" / "scheduled")
    played = set()
    for t in (current_round.get("tournaments") or []):
        if t.get("status") == "complete":
            home = t.get("homeSquadName") or ""
            away = t.get("awaySquadName") or ""
            if home:
                played.add(normalise_team(home))
            if away:
                played.add(normalise_team(away))
    return played


@router.get("/simulation")
async def get_simulation(db: Session = Depends(get_db)):
    import traceback
    try:
        ranks = await fetch_standings(db)
        current_scores = {r["userName"]: r.get("overallPoints") or 0 for r in ranks}

        rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0

        played_teams = await _get_played_teams_this_round()

        if played_teams:
            # Mid-round: run live simulation with remaining slots
            picks = (
                db.query(FantasySquadPick)
                .filter(FantasySquadPick.is_starting == True)
                .all()
            )
            user_id_to_name = {r["userId"]: r["userName"] for r in ranks}

            remaining_slots: dict[str, float] = {}
            for pick in picks:
                username = user_id_to_name.get(pick.fifa_user_id)
                if not username:
                    continue
                team = pick.national_team_name or ""
                if normalise_team(team) in played_teams:
                    continue
                slot_weight = 2.0 if pick.is_captain else 1.0
                remaining_slots[username] = remaining_slots.get(username, 0.0) + slot_weight

            future_rounds = max(0, TOTAL_ROUNDS - rounds_played - 1)
            return run_monte_carlo_live(current_scores, remaining_slots, future_rounds)
        else:
            rounds_remaining = max(0, TOTAL_ROUNDS - rounds_played)
            return run_monte_carlo(current_scores, rounds_remaining)
    except Exception as e:
        return {"_error": str(e), "_traceback": traceback.format_exc()[-800:]}


@router.get("/simulation-debug")
async def get_simulation_debug(db: Session = Depends(get_db)):
    """Debug: show played_teams and pick team names to diagnose matching."""
    played_teams = await _get_played_teams_this_round()
    picks = db.query(FantasySquadPick).filter(FantasySquadPick.is_starting == True).all()
    pick_teams = sorted(set(p.national_team_name for p in picks if p.national_team_name))
    return {
        "played_teams": sorted(played_teams),
        "pick_team_names_in_db": pick_teams,
        "normalised_pick_teams": sorted(set(normalise_team(t) for t in pick_teams)),
    }


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0
    latest_snapshot = (
        db.query(ProbabilitySnapshot)
        .order_by(ProbabilitySnapshot.created_at.desc())
        .first()
    )
    last_synced = latest_snapshot.created_at.isoformat() if latest_snapshot and latest_snapshot.created_at else None
    return {"rounds_played": rounds_played, "last_synced": last_synced}


@router.get("/fixtures")
async def get_fixtures(db: Session = Depends(get_db)):
    """Return all match fixtures with scores and status."""
    try:
        data = await fetch_fixtures(db)
        return {"fixtures": data}
    except Exception as e:
        return {"fixtures": [], "error": str(e)}


@router.get("/groups")
async def get_groups(db: Session = Depends(get_db)):
    """Return WC 2026 group standings."""
    try:
        data = await fetch_groups()
        standings = [s for s in data.get("standings", []) if s.get("type") == "TOTAL"]
        standings.sort(key=lambda s: s.get("group", ""))
        return {"standings": standings}
    except Exception as e:
        return {"standings": [], "error": str(e)}


@router.get("/scorers")
async def get_scorers_endpoint(db: Session = Depends(get_db)):
    """Return WC 2026 top scorers and assist leaders."""
    try:
        data = await fetch_scorers()
        return {"scorers": data.get("scorers", [])}
    except Exception as e:
        return {"scorers": [], "error": str(e)}


@router.get("/fixtures-debug-rounds")
async def get_fixtures_debug_rounds(db: Session = Depends(get_db)):
    """Show full structure of first tournament in rounds.json."""
    import httpx
    from ..services.fifa_api import _headers
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://play.fifa.com/json/fantasy/rounds.json", headers=_headers(), timeout=8)
        data = resp.json()
    round1 = data[0] if isinstance(data, list) and data else data
    tournaments = round1.get("tournaments", []) if isinstance(round1, dict) else []
    return {
        "round_keys": list(round1.keys()) if isinstance(round1, dict) else "?",
        "tournaments_count": len(tournaments),
        "tournament_sample": tournaments[0] if tournaments else None,
    }


@router.get("/fixtures-debug-raw")
async def get_fixtures_debug_raw(db: Session = Depends(get_db)):
    """Probe various sources for WC 2026 fixture data."""
    import httpx
    from ..services.fifa_api import _headers
    headers_plain = {"accept": "application/json", "user-agent": "Mozilla/5.0"}
    candidates = [
        # FIFA seasons list for competition 17
        ("plain", "https://api.fifa.com/api/v3/competitions/17/seasons?language=en&count=5"),
        # FIFA public API date filter
        ("plain", "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&count=3&language=en&dateFrom=2026-06-01&dateTo=2026-06-15"),
        # FIFA Fantasy JSON
        ("auth",  "https://play.fifa.com/json/fantasy/fixtures.json"),
        ("auth",  "https://play.fifa.com/json/fantasy/rounds.json"),
        ("auth",  "https://play.fifa.com/json/fantasy/gameweeks.json"),
        ("auth",  "https://play.fifa.com/json/fantasy/schedule.json"),
        ("auth",  "https://play.fifa.com/json/fantasy/matches.json"),
        # Gamebar round 1 (authenticated)
        ("auth",  f"https://play.fifa.com/api/en/fantasy/gamebar?roundId=1"),
    ]
    results = {}
    async with httpx.AsyncClient() as client:
        for auth_type, url in candidates:
            h = _headers() if auth_type == "auth" else headers_plain
            try:
                resp = await client.get(url, headers=h, timeout=6)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        first = data[0] if data else {}
                        results[url] = {"ok": True, "count": len(data), "sample": str(data[:1])[:400]}
                    else:
                        results[url] = {"ok": True, "keys": list(data.keys())[:15], "sample": str(data)[:400]}
                else:
                    results[url] = {"status": resp.status_code, "body": resp.text[:100]}
            except Exception as e:
                results[url] = {"error": str(e)[:100]}
    return results


@router.get("/rounds-debug")
async def get_rounds_debug(db: Session = Depends(get_db)):
    """Debug: return raw rounds.json to inspect API shape."""
    result = {"rounds_with_auth": None, "rounds_no_auth": None, "error_with_auth": None, "error_no_auth": None}
    try:
        result["rounds_with_auth"] = await fetch_rounds(db)
    except Exception as e:
        result["error_with_auth"] = f"{type(e).__name__}: {e}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.fifa_base_url}/rounds.json",
                headers={"accept": "application/json", "user-agent": "Mozilla/5.0"},
                timeout=15,
            )
            result["rounds_no_auth"] = resp.json() if resp.status_code == 200 else f"HTTP {resp.status_code}"
    except Exception as e:
        result["error_no_auth"] = f"{type(e).__name__}: {e}"
    return result


@router.get("/probability-history")
def get_probability_history(db: Session = Depends(get_db)):
    rows = db.query(ProbabilitySnapshot).order_by(ProbabilitySnapshot.round_id).all()
    result = {}
    for r in rows:
        result.setdefault(r.round_id, {})[r.fifa_username] = {
            "win_probability": r.win_probability,
            "last_probability": r.last_probability,
            "expected_final": r.expected_final,
        }
    return result
