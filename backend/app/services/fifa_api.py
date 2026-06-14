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
    # Load cached token without blocking on refresh — fail fast
    if not token_manager._fp_user:
        if db:
            found = token_manager._load_db(db)
            if not found:
                token_manager._load_env()
        else:
            token_manager._load_env()
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers(), timeout=5)
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


_FIFA_STATUS_MAP = {
    "1": "SCHEDULED",   # Upcoming
    "2": "LIVE",        # Live
    "3": "FINISHED",    # Full time
    "4": "FINISHED",    # After extra time
    "5": "FINISHED",    # After penalties
    "0": "POSTPONED",
}

_FIFA_STAGE_MAP = {
    "1": ("GROUP", "Gruppespill"),
    "2": ("R32",   "Runde av 32"),
    "3": ("R16",   "Åttendedelsfinale"),
    "4": ("QF",    "Kvartfinale"),
    "5": ("SF",    "Semifinale"),
    "6": ("F",     "Finale"),
}


_ROUND_STATUS_MAP = {
    "complete":  "FINISHED",
    "playing":   "LIVE",
    "scheduled": "SCHEDULED",
    "suspended": "POSTPONED",
}

_ROUND_STAGE_MAP = {
    1: ("GROUP", "Gruppespill"),
    2: ("R32",   "Runde av 32"),
    3: ("R16",   "Åttendedelsfinale"),
    4: ("QF",    "Kvartfinale"),
    5: ("SF",    "Semifinale"),
    6: ("F",     "Finale"),
}


async def fetch_fixtures(db=None) -> list[dict]:
    """Fetch all WC 2026 fixtures + scores from FIFA Fantasy rounds.json."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://play.fifa.com/json/fantasy/rounds.json",
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        rounds = resp.json()

    fixtures = []
    for rnd in rounds:
        round_id = rnd.get("id", 1)
        stage_num = rnd.get("stage", 1)
        stage, stage_label = _ROUND_STAGE_MAP.get(stage_num, ("GROUP", "Gruppespill"))

        for t in rnd.get("tournaments", []):
            raw_status = t.get("status", "scheduled")
            if t.get("isSuspended"):
                raw_status = "suspended"
            status = _ROUND_STATUS_MAP.get(raw_status, "SCHEDULED")

            fixtures.append({
                "id": t.get("id"),
                "roundId": round_id,
                "stage": stage,
                "stageLabel": stage_label,
                "homeSquadName": t.get("homeSquadName"),
                "awaySquadName": t.get("awaySquadName"),
                "homeSquadAbbr": t.get("homeSquadAbbr"),
                "awaySquadAbbr": t.get("awaySquadAbbr"),
                "homeScore": t.get("homeScore"),
                "awayScore": t.get("awayScore"),
                "homePenaltyScore": t.get("homePenaltyScore"),
                "awayPenaltyScore": t.get("awayPenaltyScore"),
                "date": t.get("date"),
                "venueName": t.get("venueName"),
                "venueCity": t.get("venueCity"),
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


FIFA_JSON_BASE = "https://play.fifa.com/json/fantasy"


async def fetch_fifa_squads(db=None) -> list[dict]:
    """Fetch all WC 2026 national teams from FIFA Fantasy JSON."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{FIFA_JSON_BASE}/squads.json", headers=_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
    if isinstance(data, list):
        return data
    return data.get("squads") or data.get("data") or []


async def fetch_fifa_players(db=None) -> list[dict]:
    """Fetch all WC 2026 players from FIFA Fantasy JSON."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{FIFA_JSON_BASE}/players.json", headers=_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
    if isinstance(data, list):
        return data
    return data.get("players") or data.get("data") or []


async def probe_fifa_data_endpoints(db=None) -> dict:
    """Probe FIFA Fantasy JSON endpoints."""
    results = {}
    for url in [f"{FIFA_JSON_BASE}/squads.json", f"{FIFA_JSON_BASE}/players.json"]:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=_headers(), timeout=15)
                resp.raise_for_status()
                data = resp.json()
            if isinstance(data, list):
                results[url] = {"status": "ok", "type": "list", "count": len(data), "sample": data[:2]}
            else:
                results[url] = {"status": "ok", "keys": list(data.keys()), "sample": str(data)[:300]}
        except Exception as e:
            results[url] = {"status": "error", "error": str(e)}
    return results




# ── National team name normalisation ─────────────────────────────────────────
# Aliases used by FIFA Fantasy that differ from football-data.org names.
_TEAM_ALIASES: dict[str, str] = {
    "USA":                        "United States",
    "United States of America":   "United States",
    "US":                         "United States",
    "Korea Republic":             "South Korea",
    "Republic of Korea":          "South Korea",
    "IR Iran":                    "Iran",
    "Ivory Coast":                "Côte d'Ivoire",
    "Cote d'Ivoire":              "Côte d'Ivoire",
    "Türkiye":                    "Turkey",
    "Czechia":                    "Czech Republic",
    "Bosnia-Herzegovina":         "Bosnia and Herzegovina",
    "Cabo Verde":                 "Cape Verde Islands",
    "Cape Verde":                 "Cape Verde Islands",
    "Trinidad & Tobago":          "Trinidad and Tobago",
    "DR Congo":                   "Congo DR",
    "DRC":                        "Congo DR",
    "China PR":                   "China",
}


def normalise_team(name: str) -> str:
    """Return canonical national team name for cross-source matching."""
    if not name:
        return name
    return _TEAM_ALIASES.get(name, name)


# ── FIFA Fantasy squad picks ──────────────────────────────────────────────────

# Candidate paths to try when fetching a user's squad.
_SQUAD_PATHS = [
    "/team/{uid}",
    "/picks/{uid}",
    "/squad/{uid}",
    "/team/{uid}/picks",
    "/user/{uid}/team",
    "/user/{uid}/squad",
]


async def fetch_user_squad(user_id: int, db=None, user_sid: str | None = None) -> dict:
    """Fetch a user's fantasy squad picks from FIFA Fantasy API.

    user_sid: if provided, use this as the full cookie string (or just X-SID value)
    for the user's own session. This gives access to mid-round substitutions[].
    """
    url = f"{settings.fifa_base_url}/team/{user_id}"
    if user_sid:
        headers = dict(_headers())
        # Accept either a full cookie string or just the X-SID value
        if "=" in user_sid and ("bm_" in user_sid or "ak_" in user_sid or "Optanon" in user_sid):
            # Full cookie string from browser — use as-is
            headers["cookie"] = user_sid
        else:
            # Just the X-SID value — build minimal cookie string
            sid_val = user_sid.lstrip("X-SID=")
            from ..services.token_manager import token_manager
            headers["cookie"] = f"X-SID={sid_val}; fp.user={token_manager._fp_user}"
    else:
        headers = _headers()
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return data.get("success", data)


async def probe_squad_endpoints(user_id: int, db=None) -> dict:
    """
    Debug helper: try all candidate squad endpoints and report status/response for each.
    """
    results = {}
    for path in _SQUAD_PATHS:
        url = f"{settings.fifa_base_url}{path.format(uid=user_id)}"
        try:
            data = await _get(url, db)
            results[url] = {"status": "ok", "keys": list(data.keys()), "sample": str(data)[:300]}
        except Exception as e:
            results[url] = {"status": "error", "error": str(e)}
    return results


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
