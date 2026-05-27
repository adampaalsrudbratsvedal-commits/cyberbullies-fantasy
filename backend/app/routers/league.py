from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.round_score import RoundScore
from ..services.simulation import run_monte_carlo
from ..services.fifa_api import fetch_standings

router = APIRouter(prefix="/api/league", tags=["league"])

TOTAL_ROUNDS = 7


@router.get("/standings")
async def get_standings():
    ranks = await fetch_standings()
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
        ranks = await fetch_standings()
        current_scores = {r["userName"]: r.get("overallPoints") or 0 for r in ranks}
        rounds_played = 0
    else:
        current_scores = {r.fifa_username: r.points or 0 for r in latest}
        rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0

    rounds_remaining = max(0, TOTAL_ROUNDS - rounds_played)
    return run_monte_carlo(current_scores, rounds_remaining)
