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

async def fetch_groups() -> dict:
    """Fetch WC 2026 group standings from football-data.org."""
    api_key = settings.football_data_api_key
    if not api_key:
        raise Exception("FOOTBALL_DATA_API_KEY ikke satt i miljøvariabler")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.football-data.org/v4/competitions/WC/standings",
            headers={"X-Auth-Token": api_key},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_fantasy_players(db=None) -> list:
    """Fetch all FIFA Fantasy 2026 eligible players."""
    data = await _get(f"{settings.fifa_base_url}/players.json", db)
    success = data.get("success", data)
    # API may wrap in "data", "players", or be a flat list
    if isinstance(success, list):
        return success
    return success.get("players", success.get("data", []))


async def fetch_user_squad(user_id: int, db=None) -> dict:
    """Fetch a specific user's fantasy squad picks."""
    data = await _get(f"{settings.fifa_base_url}/team/{user_id}", db)
    success = data.get("success", data)
    return success


async def fetch_scorers() -> dict:
    """Fetch WC 2026 top scorers from football-data.org."""
    api_key = settings.football_data_api_key
    if not api_key:
        raise Exception("FOOTBALL_DATA_API_KEY ikke satt i miljøvariabler")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.football-data.org/v4/competitions/WC/scorers?limit=20",
            headers={"X-Auth-Token": api_key},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
