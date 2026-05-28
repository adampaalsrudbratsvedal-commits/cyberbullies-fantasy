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


async def fetch_fixtures(db=None) -> list[dict]:
    """Fetch all fixtures/matches from FIFA Fantasy API."""
    rounds = await fetch_rounds(db)
    fixtures = []
    # rounds.json may return a list of round objects with id fields
    if isinstance(rounds, list):
        round_ids = [r.get("id") or r.get("roundId") for r in rounds if r.get("id") or r.get("roundId")]
    elif isinstance(rounds, dict):
        round_ids = [r.get("id") or r.get("roundId") for r in rounds.get("rounds", []) or rounds.get("data", [])]
    else:
        round_ids = []

    for rid in round_ids[:8]:  # cap at 8 rounds (group stage)
        try:
            bar = await fetch_gamebar(rid, db)
            # gamebar may wrap data in different keys
            matches = (
                bar.get("matches")
                or bar.get("fixtures")
                or bar.get("success", {}).get("matches")
                or bar.get("success", {}).get("fixtures")
                or []
            )
            for m in matches:
                m["roundId"] = rid
            fixtures.extend(matches)
        except Exception:
            continue
    return fixtures
