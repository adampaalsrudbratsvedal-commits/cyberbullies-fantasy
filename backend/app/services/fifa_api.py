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


def _parse_rounds(raw) -> list:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for key in ("rounds", "data"):
            if isinstance(raw.get(key), list):
                return raw[key]
        success = raw.get("success")
        if isinstance(success, list):
            return success
        if isinstance(success, dict):
            for key in ("rounds", "data"):
                if isinstance(success.get(key), list):
                    return success[key]
    return []


async def fetch_fixtures(db=None) -> list[dict]:
    """Fetch all fixtures/matches from FIFA Fantasy rounds.json."""
    raw = None
    errors = []

    # 1) Try without DB (env-vars only) — avoids SQLite issues on Vercel
    try:
        raw = await fetch_rounds(db=None)
    except Exception as e:
        errors.append(f"no-db: {type(e).__name__}: {e}")

    # 2) Try with DB if env-only failed
    if not raw and db is not None:
        try:
            raw = await fetch_rounds(db)
        except Exception as e:
            errors.append(f"with-db: {type(e).__name__}: {e}")

    # 3) Last resort: unauthenticated request
    if not raw:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.fifa_base_url}/rounds.json",
                    headers={"accept": "application/json, */*", "user-agent": "Mozilla/5.0"},
                    timeout=15,
                )
                if resp.status_code == 200:
                    raw = resp.json()
                else:
                    errors.append(f"no-auth: HTTP {resp.status_code}")
        except Exception as e:
            errors.append(f"no-auth: {type(e).__name__}: {e}")

    if errors and not raw:
        raise Exception(" | ".join(errors))

    rounds = _parse_rounds(raw)
    fixtures = []

    if not rounds:
        return []

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
