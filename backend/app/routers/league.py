import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..config import settings
from ..models.round_score import RoundScore
from ..models.probability_snapshot import ProbabilitySnapshot
from ..services.simulation import run_monte_carlo
from ..services.fifa_api import fetch_standings, fetch_fixtures, fetch_rounds, fetch_gamebar

router = APIRouter(prefix="/api/league", tags=["league"])

TOTAL_ROUNDS = 8


@router.get("/standings")
async def get_standings(db: Session = Depends(get_db)):
    ranks = await fetch_standings(db)
    return ranks


@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    scores = db.query(RoundScore).order_by(RoundScore.round_id).all()
    result = {}
    for s in scores:
        result.setdefault(s.round_id, []).append({
            "username": s.fifa_username,
            "round_points": s.round_points,
            "overall_points": s.overall_points,
            "overall_rank": s.overall_rank,
        })
    return result


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


@router.get("/simulation")
async def get_simulation(db: Session = Depends(get_db)):
    latest = (
        db.query(RoundScore.fifa_username, func.max(RoundScore.overall_points).label("points"))
        .group_by(RoundScore.fifa_username)
        .all()
    )
    if not latest:
        ranks = await fetch_standings(db)
        current_scores = {r["userName"]: r.get("overallPoints") or 0 for r in ranks}
        rounds_played = 0
    else:
        current_scores = {r.fifa_username: r.points or 0 for r in latest}
        rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0

    rounds_remaining = max(0, TOTAL_ROUNDS - rounds_played)
    return run_monte_carlo(current_scores, rounds_remaining)


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
