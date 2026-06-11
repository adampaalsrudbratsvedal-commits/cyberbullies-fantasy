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


async def fetch_fixtures(db=None) -> list[dict]:
    """Fetch all WC 2026 fixtures + scores from FIFA public API."""
    url = (
        "https://api.fifa.com/api/v3/calendar/matches"
        "?idCompetition=17&count=200&language=en"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            headers={"accept": "application/json", "user-agent": "Mozilla/5.0"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    raw_matches = data.get("Results", [])
    fixtures = []

    for m in raw_matches:
        match_status = str(m.get("MatchStatus", "1"))
        status = _FIFA_STATUS_MAP.get(match_status, "SCHEDULED")

        stage_id = str(m.get("IdStage", "1"))
        stage, stage_label = _FIFA_STAGE_MAP.get(stage_id, ("GROUP", "Gruppespill"))

        matchday_raw = m.get("MatchDay") or 1
        knockout_round_map = {"R32": 4, "R16": 5, "QF": 6, "SF": 7, "F": 8}
        round_id = knockout_round_map.get(stage, matchday_raw)

        home_team = m.get("Home") or {}
        away_team = m.get("Away") or {}
        home_name_list = home_team.get("TeamName") or [{}]
        away_name_list = away_team.get("TeamName") or [{}]
        home_name = home_name_list[0].get("Description") if home_name_list else home_team.get("IdTeam", "")
        away_name = away_name_list[0].get("Description") if away_name_list else away_team.get("IdTeam", "")

        home_score = m.get("HomeTeamScore")
        away_score = m.get("AwayTeamScore")

        stadium = m.get("Stadium") or {}
        stadium_name_list = stadium.get("Name") or [{}]
        venue = stadium_name_list[0].get("Description") if stadium_name_list else None

        fixtures.append({
            "id": m.get("IdMatch"),
            "roundId": round_id,
            "stage": stage,
            "stageLabel": stage_label,
            "homeSquadName": home_name,
            "awaySquadName": away_name,
            "homeScore": home_score,
            "awayScore": away_score,
            "date": m.get("Date"),
            "venueName": venue,
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


async def fetch_user_squad(user_id: int, db=None) -> dict:
    """
    Attempt to fetch a user's fantasy squad picks from the FIFA Fantasy API.
    Tries candidate URL patterns with a short per-attempt timeout so the caller
    gets a fast failure rather than hanging for minutes.
    """
    await token_manager.ensure_fresh(db)
    last_exc = None
    async with httpx.AsyncClient() as client:
        for path in _SQUAD_PATHS:
            url = f"{settings.fifa_base_url}{path.format(uid=user_id)}"
            try:
                resp = await client.get(url, headers=_headers(), timeout=5)
                if resp.status_code == 404:
                    last_exc = Exception(f"404 {url}")
                    continue
                resp.raise_for_status()
                data = resp.json()
                success = data.get("success", data)
                return {"_url_used": url, **success}
            except Exception as e:
                last_exc = e
    raise last_exc or Exception("Alle squad-endepunkter feilet")


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
