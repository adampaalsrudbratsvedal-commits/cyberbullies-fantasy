import httpx
from ..config import settings
from .token_manager import token_manager


def _headers() -> dict:
    return {
        "accept": "application/json, text/plain, */*",
        "cookie": token_manager.get_cookies(),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }


async def _get(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(), timeout=15)
        if resp.status_code == 401:
            refreshed = await token_manager.refresh()
            if refreshed:
                resp = await client.get(url, headers=_headers(), timeout=15)
        resp.raise_for_status()
        return resp.json()


async def fetch_standings() -> list[dict]:
    data = await _get(
        f"{settings.fifa_base_url}/ranking/league/{settings.fifa_league_id}?limit=50"
    )
    return data["success"]["ranks"]


async def fetch_rounds() -> list[dict]:
    return await _get(f"{settings.fifa_base_url}/rounds.json")


async def fetch_gamebar(round_id: int) -> dict:
    return await _get(f"{settings.fifa_base_url}/gamebar?roundId={round_id}")
