import asyncio
import json
import urllib.parse
from datetime import datetime, timedelta

import httpx

from ..config import settings

PINGONE_TOKEN_URL = (
    "https://auth.pingone.eu/3f85e2e1-0232-4f84-9da8-bba9279f1a23/as/token"
)
CLIENT_ID = "35072598-fc20-4142-a469-1b940db47e6f"
REFRESH_INTERVAL = 55 * 60  # refresh 5 minutes before expiry


class TokenManager:
    def __init__(self):
        self._access_token: str = ""
        self._refresh_token: str = ""
        self._fp_user: str = ""
        self._task: asyncio.Task | None = None

    def init(self):
        self._refresh_token = settings.fifa_refresh_token
        self._fp_user = settings.fifa_fp_user

        if self._fp_user:
            try:
                data = json.loads(urllib.parse.unquote(self._fp_user))
                self._access_token = data.get("accessToken", "")
            except Exception:
                pass

    def get_cookies(self) -> str:
        return f"X-SID={settings.fifa_sid}; fp.user={self._fp_user}"

    async def refresh(self) -> bool:
        if not self._refresh_token:
            print("[TokenManager] No refresh token available")
            return False
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    PINGONE_TOKEN_URL,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": self._refresh_token,
                        "client_id": CLIENT_ID,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=15,
                )
                resp.raise_for_status()
                data = resp.json()

            self._access_token = data["access_token"]
            if "refresh_token" in data:
                self._refresh_token = data["refresh_token"]

            # Rebuild the fp.user cookie with the new access token
            fp_data = json.loads(urllib.parse.unquote(self._fp_user))
            expires_in = data.get("expires_in", 3600)
            fp_data["accessToken"] = self._access_token
            fp_data["expires"] = (
                datetime.utcnow() + timedelta(seconds=expires_in)
            ).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            fp_data["expIn"] = expires_in
            self._fp_user = urllib.parse.quote(json.dumps(fp_data))

            print(
                f"[TokenManager] Token refreshed, next expiry in {expires_in}s"
            )
            return True

        except httpx.HTTPStatusError as e:
            print(f"[TokenManager] Refresh failed (HTTP {e.response.status_code}): {e.response.text[:200]}")
            return False
        except Exception as e:
            print(f"[TokenManager] Refresh error: {e}")
            return False

    async def _loop(self):
        while True:
            await asyncio.sleep(REFRESH_INTERVAL)
            await self.refresh()

    def start(self):
        self.init()
        self._task = asyncio.create_task(self._loop())
        print("[TokenManager] Started — token refresh every 55 minutes")

    def stop(self):
        if self._task:
            self._task.cancel()


token_manager = TokenManager()
