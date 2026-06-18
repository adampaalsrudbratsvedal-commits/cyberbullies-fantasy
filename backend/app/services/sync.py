from sqlalchemy import func
from sqlalchemy.orm import Session
from .fifa_api import fetch_standings, fetch_user_squad, normalise_team
from ..models.round_score import RoundScore
from ..models.fantasy_squad_pick import FantasySquadPick
from ..models.fantasy_player import FantasyPlayer
from ..models.probability_snapshot import ProbabilitySnapshot

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

        # API returns lineup/bench as {position: [player_ids]} dicts
        lineup = squad_data.get("lineup") or {}
        bench  = squad_data.get("bench")  or {}
        captain_id = squad_data.get("captain")
        vice_id    = squad_data.get("vice")

        starting_ids = [pid for ids in lineup.values() for pid in (ids or [])]
        bench_ids    = [pid for ids in bench.values()  for pid in (ids or [])]

        # Flat picks list fallback (older API shape)
        if not starting_ids and not bench_ids:
            picks_raw = squad_data.get("picks") or squad_data.get("squad") or []
            for pick in picks_raw:
                pid = pick.get("playerId") or pick.get("id")
                if not pid:
                    continue
                if pick.get("isStarting") if pick.get("isStarting") is not None else pick.get("starting", True):
                    starting_ids.append(pid)
                else:
                    bench_ids.append(pid)
            if not starting_ids and not bench_ids:
                continue

        # Apply mid-round substitutions (playerIn replaces playerOut)
        subs = squad_data.get("substitutions") or []
        subbed_out: set[int] = set()
        subbed_in:  set[int] = set()
        for sub in subs:
            player_in  = sub.get("playerIn")  or sub.get("playerId")
            player_out = sub.get("playerOut") or sub.get("replacedId")
            if player_in and player_out:
                subbed_out.add(player_out)
                subbed_in.add(player_in)

        db.query(FantasySquadPick).filter(
            FantasySquadPick.fifa_user_id == user_id
        ).delete(synchronize_session=False)

        rows = []
        all_ids = [(pid, True) for pid in starting_ids] + [(pid, False) for pid in bench_ids]
        for slot_idx, (player_id, is_starting) in enumerate(all_ids, start=1):
            # Substitutions override starting status
            if player_id in subbed_out:
                is_starting = False
            elif player_id in subbed_in:
                is_starting = True

            pl = player_lookup.get(player_id)
            rows.append(FantasySquadPick(
                fifa_user_id=user_id,
                fifa_username=username,
                player_id=player_id,
                player_name=pl.name if pl else None,
                national_team_name=pl.national_team_name if pl else None,
                position_slot=slot_idx,
                is_captain=(player_id == captain_id),
                is_vice_captain=(player_id == vice_id),
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

    # Snapshot is saved by the simulation endpoint (500K runs) — reuse that result, don't re-run MC here.
    # Flag whether a snapshot exists for the current round.
    snapshot_round = db.query(func.max(ProbabilitySnapshot.round_id)).scalar() or 0

    return {
        "synced": updated,
        "rounds_played": rounds_played,
        "players_found": len(current_scores),
        "ranks_raw": len(ranks),
        "squads_updated": squads_updated,
        "snapshot_round": snapshot_round,
    }
