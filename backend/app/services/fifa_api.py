import httpx
from ..config import settings
from .token_manager import token_manager


def _headers() -> dict:
    return {
        "accept": "application/json, text/plain, */*",
        "cookie": token_manager.get_cookies(),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }


async def _get(url: str, db=None) -> dict:
    await token_manager.ensure_fresh(db)
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(), timeout=15)
        if resp.status_code == 401:
            refreshed = await token_manager.refresh(db)
            if refreshed:
                resp = await client.get(url, headers=_headers(), timeout=15)
        resp.raise_for_status()
        return resp.json()


async def fetch_standings(db=None) -> list[dict]:
    data = await _get(
        f"{settings.fifa_base_url}/ranking/league/{settings.fifa_league_id}?limit=50",
        db,
    )
    return data["success"]["ranks"]


async def fetch_rounds(db=None) -> list[dict]:
    return await _get(f"{settings.fifa_base_url}/rounds.json", db)


async def fetch_gamebar(round_id: int, db=None) -> dict:
    return await _get(f"{settings.fifa_base_url}/gamebar?roundId={round_id}", db)


STAGE_MAP = {
    "GROUP_STAGE": ("GROUP", "Gruppespill"),
    "LAST_32":     ("R32",   "Runde av 32"),
    "LAST_16":     ("R16",   "Åttendedelsfinale"),
    "QUARTER_FINALS": ("QF", "Kvartfinale"),
    "SEMI_FINALS": ("SF",    "Semifinale"),
    "FINAL":       ("F",     "Finale"),
}


async def fetch_fixtures(db=None) -> list[dict]:
    """Fetch all WC 2026 fixtures from football-data.org."""
    api_key = settings.football_data_api_key
    if not api_key:
        raise Exception("FOOTBALL_DATA_API_KEY ikke satt i miljøvariabler")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.football-data.org/v4/competitions/WC/matches",
            headers={"X-Auth-Token": api_key},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    raw_matches = data.get("matches", [])
    fixtures = []

    for m in raw_matches:
        fd_stage = m.get("stage", "GROUP_STAGE")
        stage, stage_label = STAGE_MAP.get(fd_stage, ("GROUP", fd_stage))
        matchday = m.get("matchday") or 1

        # Knockout rounds get their own "round" after group stage (rounds 1-3)
        knockout_round_map = {"R32": 4, "R16": 5, "QF": 6, "SF": 7, "F": 8}
        round_id = knockout_round_map.get(stage, matchday)

        score = m.get("score", {})
        full = score.get("fullTime", {})
        home_score = full.get("home")
        away_score = full.get("away")

        status = m.get("status", "SCHEDULED")

        fixtures.append({
            "id": m.get("id"),
            "roundId": round_id,
            "stage": stage,
            "stageLabel": stage_label,
            "homeSquadName": m.get("homeTeam", {}).get("name") or m.get("homeTeam", {}).get("shortName"),
            "awaySquadName": m.get("awayTeam", {}).get("name") or m.get("awayTeam", {}).get("shortName"),
            "homeScore": home_score,
            "awayScore": away_score,
            "date": m.get("utcDate"),
            "venueName": m.get("venue"),
            "status": status,
        })

    fixtures.sort(key=lambda x: x.get("date") or "")
    return fixtures

    stage_labels = {
        "GROUP": "Gruppespill",
        "R32": "Runde av 32",
        "R16": "Åttendedelsfinale",
        "QF": "Kvartfinale",
        "SF": "Semifinale",
        "F": "Finale",
    }

    for r in rounds:
        round_id = r.get("id")
        stage = r.get("stage", "")
        stage_label = stage_labels.get(stage, stage)
        matches = r.get("tournaments") or []
        for m in matches:
            m["roundId"] = round_id
            m["stage"] = stage
            m["stageLabel"] = stage_label
        fixtures.extend(matches)

    # Sort by date
    fixtures.sort(key=lambda m: m.get("date") or "")
    return fixtures
