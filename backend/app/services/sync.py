from sqlalchemy.orm import Session
from .fifa_api import fetch_standings
from ..models.round_score import RoundScore


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
    return updated
