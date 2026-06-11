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


async def fetch_wc_teams_with_players() -> list:
    """
    Fetch all WC 2026 national teams + their squad members from football-data.org.
    Returns a flat list of player dicts with nationalTeamName injected.
    """
    api_key = settings.football_data_api_key
    if not api_key:
        raise Exception("FOOTBALL_DATA_API_KEY ikke satt i miljøvariabler")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.football-data.org/v4/competitions/WC/teams",
            headers={"X-Auth-Token": api_key},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()

    POSITION_MAP = {
        "Goalkeeper": (1, "Keeper"),
        "Defence":    (2, "Forsvar"),
        "Midfield":   (3, "Midtbane"),
        "Offence":    (4, "Angrep"),
    }

    players = []
    for team in data.get("teams", []):
        team_id   = team.get("id")
        team_name = team.get("name") or team.get("shortName", "")
        for p in team.get("squad", []):
            pos_raw  = p.get("position", "Midfield")
            pos_id, pos_name = POSITION_MAP.get(pos_raw, (3, pos_raw))
            players.append({
                "id":               p.get("id"),
                "name":             p.get("name", ""),
                "shortName":        p.get("shortName") or p.get("name", ""),
                "nationalTeamId":   team_id,
                "nationalTeamName": team_name,
                "positionId":       pos_id,
                "positionName":     pos_name,
                "price":            0.0,
                "totalPoints":      0,
            })
    return players


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
