from sqlalchemy import func
from sqlalchemy.orm import Session
from .fifa_api import fetch_standings, fetch_user_squad
from .simulation import run_monte_carlo
from ..models.round_score import RoundScore
from ..models.probability_snapshot import ProbabilitySnapshot
from ..models.fantasy_squad_pick import FantasySquadPick
from ..models.fantasy_player import FantasyPlayer

TOTAL_ROUNDS = 8


async def sync_league(db: Session) -> dict:
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
    else:
        # Pre-tournament: no round scores yet, use live standings (already fetched)
        current_scores = {r["userName"]: r.get("overallPoints") or 0 for r in ranks if r.get("userName")}

    snapshot_saved = False
    if current_scores:
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
        snapshot_saved = True

    # Also sync squad picks so mid-round substitutions are picked up automatically
    squad_result = await _sync_squads_inner(db, ranks)

    return {
        "synced": updated,
        "rounds_played": rounds_played,
        "players_found": len(current_scores),
        "snapshot_saved": snapshot_saved,
        "ranks_raw": len(ranks),
        "squad_sync": squad_result,
    }


async def _sync_squads_inner(db: Session, ranks: list) -> dict:
    """Sync squad picks for all users. Called automatically as part of sync_league."""
    import asyncio

    player_lookup: dict[int, FantasyPlayer] = {
        p.id: p for p in db.query(FantasyPlayer).all()
    }
    if not player_lookup:
        return {"skipped": "no players in db"}

    from ..models.user import User as AppUser
    user_sids: dict[str, str] = {}
    for u in db.query(AppUser).filter(AppUser.fifa_sid.isnot(None)).all():
        if u.fifa_username:
            user_sids[u.fifa_username.lower()] = u.fifa_sid

    current_round = db.query(func.max(RoundScore.round_id)).scalar() or 0

    # Fetch all squads in parallel to stay within Vercel's 10s timeout
    async def fetch_one(rank):
        user_id  = rank.get("userId")
        username = rank.get("userName", f"user_{user_id}")
        team_id  = rank.get("teamId") or user_id
        if not user_id:
            return None
        own_sid = user_sids.get((username or "").lower())
        try:
            data = await fetch_user_squad(team_id, db, user_sid=own_sid)
            return (user_id, username, team_id, data)
        except Exception as e:
            return (user_id, username, team_id, {"_error": str(e)})

    results = await asyncio.gather(*[fetch_one(r) for r in ranks])

    # Find users who already have picks in the DB (by user_id)
    existing_user_ids: set[int] = set(
        row[0] for row in db.query(FantasySquadPick.fifa_user_id).distinct().all()
    )

    errors: list[str] = []
    rows: list[dict] = []
    processed_user_ids: list[int] = []

    for item in results:
        if item is None:
            continue
        user_id, username, team_id, squad_data = item

        if "_error" in squad_data:
            errors.append(f"{username}: {squad_data['_error']}")
            continue

        has_own_sid = (username or "").lower() in user_sids
        has_subs = bool(squad_data.get("substitutions"))

        # If we have no authenticated session AND the user already has picks,
        # skip overwriting — a neutral session can't see mid-round substitutions
        # and would overwrite a manually corrected lineup with stale data.
        if not has_own_sid and not has_subs and user_id in existing_user_ids:
            errors.append(f"{username}: skipped (no SID, existing picks preserved)")
            continue

        lineup = squad_data.get("lineup") or {}
        bench  = squad_data.get("bench")  or {}
        captain_id = squad_data.get("captain")
        vice_id    = squad_data.get("vice")

        starting_ids = [pid for pos in lineup.values() for pid in (pos or [])]
        bench_ids    = [pid for pos in bench.values()  for pid in (pos or [])]

        for sub in (squad_data.get("substitutions") or []):
            out_id = sub.get("out")
            in_id  = sub.get("in")
            if out_id and in_id and out_id in starting_ids and in_id not in starting_ids:
                starting_ids.remove(out_id)
                starting_ids.append(in_id)
                if in_id in bench_ids:
                    bench_ids.remove(in_id)
                if out_id not in bench_ids:
                    bench_ids.append(out_id)

        all_ids = starting_ids + bench_ids
        if not all_ids:
            errors.append(f"{username}: ingen picks")
            continue

        processed_user_ids.append(user_id)
        for slot_idx, player_id in enumerate(all_ids, start=1):
            if not player_id:
                continue
            pl = player_lookup.get(player_id)
            rows.append({
                "fifa_user_id":       user_id,
                "fifa_username":      username,
                "player_id":          player_id,
                "player_name":        pl.name if pl else None,
                "national_team_name": pl.national_team_name if pl else None,
                "position_slot":      slot_idx,
                "is_captain":         player_id == captain_id,
                "is_vice_captain":    player_id == vice_id,
                "is_starting":        player_id in starting_ids,
                "synced_round":       current_round,
            })

    if processed_user_ids:
        db.query(FantasySquadPick).filter(
            FantasySquadPick.fifa_user_id.in_(processed_user_ids)
        ).delete(synchronize_session=False)
    if rows:
        db.bulk_insert_mappings(FantasySquadPick, rows)
    db.commit()

    return {"users": len(processed_user_ids), "picks": len(rows), "errors": errors}
