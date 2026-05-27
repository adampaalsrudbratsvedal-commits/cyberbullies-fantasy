from sqlalchemy import func
from sqlalchemy.orm import Session
from .fifa_api import fetch_standings
from .simulation import run_monte_carlo
from ..models.round_score import RoundScore
from ..models.probability_snapshot import ProbabilitySnapshot

TOTAL_ROUNDS = 8


async def sync_league(db: Session) -> int:
    ranks = await fetch_standings(db)
    updated = 0
    for rank in ranks:
        if rank.get("roundId") is None:
            continue
        existing = (
            db.query(RoundScore)
            .filter_by(fifa_user_id=rank["userId"], round_id=rank["roundId"])
            .first()
        )
        if existing:
            existing.round_points = rank.get("roundPoints")
            existing.overall_points = rank.get("overallPoints")
            existing.overall_rank = rank.get("overallRank")
            existing.round_rank = rank.get("roundRank")
        else:
            db.add(RoundScore(
                fifa_user_id=rank["userId"],
                fifa_username=rank["userName"],
                round_id=rank["roundId"],
                round_points=rank.get("roundPoints"),
                overall_points=rank.get("overallPoints"),
                overall_rank=rank.get("overallRank"),
                round_rank=rank.get("roundRank"),
            ))
        updated += 1
    db.commit()

    # Save probability snapshot for this round
    rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0
    latest = (
        db.query(RoundScore.fifa_username, func.max(RoundScore.overall_points).label("points"))
        .group_by(RoundScore.fifa_username)
        .all()
    )
    if latest:
        current_scores = {r.fifa_username: r.points or 0 for r in latest}
        rounds_remaining = max(0, TOTAL_ROUNDS - rounds_played)
        sim = run_monte_carlo(current_scores, rounds_remaining)

        # Delete existing snapshot for this round and replace
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

    return updated
