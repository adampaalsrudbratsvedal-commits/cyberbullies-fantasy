import httpx
from ..config import settings


def _headers() -> dict:
    return {
        "accept": "application/json, text/plain, */*",
        "cookie": f"X-SID={settings.fifa_sid}; fp.user={settings.fifa_fp_user}",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }


async def fetch_standings() -> list[dict]:
    url = f"{settings.fifa_base_url}/ranking/league/{settings.fifa_league_id}?limit=50"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        data = resp.json()
        return data["success"]["ranks"]


async def fetch_rounds() -> list[dict]:
    url = f"{settings.fifa_base_url}/rounds.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def fetch_gamebar(round_id: int) -> dict:
    url = f"{settings.fifa_base_url}/gamebar?roundId={round_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()
