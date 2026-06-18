from sqlalchemy import func
from sqlalchemy.orm import Session
from .fifa_api import fetch_standings, fetch_user_squad, normalise_team
from ..models.round_score import RoundScore
from ..models.fantasy_squad_pick import FantasySquadPick
from ..models.fantasy_player import FantasyPlayer
from ..models.probability_snapshot import ProbabilitySnapshot
from .simulation import run_monte_carlo

TOTAL_ROUNDS = 8


async def _sync_squads_inner(db: Session, ranks: list[dict], current_round: int) -> int:
    """Fetch and store squad picks for all league users. Returns number updated."""
    player_lookup = {p.id: p for p in db.query(FantasyPlayer).all()}
    updated = 0
    for rank in ranks:
        user_id = rank.get("userId")
        username = rank.get("userName")
        if not user_id or not username:
            continue
        try:
            squad_data = await fetch_user_squad(user_id, db)
        except Exception:
            continue

        picks_raw = squad_data.get("picks") or squad_data.get("squad") or []
        if not picks_raw:
            continue

        # Apply mid-round substitutions if present
        subs = squad_data.get("substitutions") or []
        sub_map: dict[int, int] = {}  # playerIn -> playerOut
        for sub in subs:
            player_in  = sub.get("playerIn")  or sub.get("playerId")
            player_out = sub.get("playerOut") or sub.get("replacedId")
            if player_in and player_out:
                sub_map[player_in] = player_out

        db.query(FantasySquadPick).filter(
            FantasySquadPick.fifa_user_id == user_id
        ).delete(synchronize_session=False)

        rows = []
        for slot_idx, pick in enumerate(picks_raw, start=1):
            player_id  = pick.get("playerId") or pick.get("id")
            is_starting = pick.get("isStarting") if pick.get("isStarting") is not None else pick.get("starting", True)
            is_captain  = pick.get("isCaptain", False)
            is_vice     = pick.get("isViceCaptain", False)

            # Override starting status based on substitutions
            if player_id in sub_map:
                is_starting = False  # subbed off → bench

            pl = player_lookup.get(player_id)
            rows.append(FantasySquadPick(
                fifa_user_id=user_id,
                fifa_username=username,
                player_id=player_id,
                player_name=pl.name if pl else pick.get("name"),
                national_team_name=pl.national_team_name if pl else pick.get("nationalTeam"),
                position_slot=slot_idx,
                is_captain=is_captain,
                is_vice_captain=is_vice,
                is_starting=bool(is_starting),
                synced_round=current_round,
            ))
        db.bulk_save_objects(rows)
        updated += 1

    db.commit()
    return updated


async def sync_league(db: Session, sync_squads: bool = True) -> dict:
    ranks = await fetch_standings(db)

    # Only save round scores when FIFA API returns real data
    updated = 0
    for rank in ranks:
        if rank.get("roundId") is None or rank.get("overallPoints") is None:
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

    rounds_played = db.query(func.max(RoundScore.round_id)).scalar() or 0
    current_scores = {r["userName"]: r.get("overallPoints") or 0 for r in ranks if r.get("userName")}

    squads_updated = 0
    if sync_squads and ranks:
        current_round = (rounds_played + 1) if ranks and all(r.get("overallPoints") is None for r in ranks) else rounds_played
        try:
            squads_updated = await _sync_squads_inner(db, ranks, current_round)
        except Exception:
            pass

    # Save probability snapshot whenever we have real scores
    snapshot_saved = False
    if updated > 0 and current_scores:
        try:
            latest_snapshot_round = db.query(func.max(ProbabilitySnapshot.round_id)).scalar() or 0
            if rounds_played >= latest_snapshot_round:
                rounds_remaining = max(0, TOTAL_ROUNDS - rounds_played)
                sim_result = run_monte_carlo(current_scores, rounds_remaining, n=50000)
                db.query(ProbabilitySnapshot).filter_by(round_id=rounds_played).delete()
                for username, probs in sim_result.items():
                    db.add(ProbabilitySnapshot(
                        round_id=rounds_played,
                        fifa_username=username,
                        win_probability=probs["win_probability"],
                        last_probability=probs["last_probability"],
                        expected_final=probs["expected_final"],
                    ))
                db.commit()
                snapshot_saved = True
        except Exception:
            pass

    return {
        "synced": updated,
        "rounds_played": rounds_played,
        "players_found": len(current_scores),
        "ranks_raw": len(ranks),
        "squads_updated": squads_updated,
        "snapshot_saved": snapshot_saved,
    }
